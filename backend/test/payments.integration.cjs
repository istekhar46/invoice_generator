// Real JWT/HTTP/Prisma/PostgreSQL; fictional data in a disposable localhost DB only.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.PAYMENTS_TEST_DATABASE_URL;
if (!connection) throw Error('PAYMENTS_TEST_DATABASE_URL is required.');
const target = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.startsWith('/stock_schema_')
)
  throw Error('Use a disposable stock_schema_* localhost database.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'payment-fixture-only';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: connection });
const owner = `payment-api-${randomUUID()}`,
  other = `payment-other-${randomUUID()}`;
let app,
  prisma,
  base,
  token,
  otherToken,
  requests = 0;
async function raw(method, path, body, bearer = token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  requests++;
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
async function http(
  method,
  path,
  body,
  expected = method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200,
  bearer = token,
) {
  const result = await raw(method, path, body, bearer);
  assert.equal(result.status, expected, `${method} ${path}: ${JSON.stringify(result.body)}`);
  return expected < 300 ? result.body?.data : result.body;
}
const request = (amount = '25.50', extra = {}) => ({
  requestId: randomUUID(),
  paymentDate: '2026-11-03',
  amount,
  ...extra,
});
const record = (invoice, body, expected = 201, bearer = token) =>
  http('POST', `/payments/invoices/${invoice.id}/receipts`, body, expected, bearer);
const reverse = (entry, extra = {}, expected = 201, bearer = token) =>
  http(
    'POST',
    `/payments/${entry.id}/reversal`,
    {
      requestId: randomUUID(),
      paymentDate: '2026-11-03',
      reason: 'Correction of an incorrect record',
      ...extra,
    },
    expected,
    bearer,
  );
const summary = (invoice) => http('GET', `/payments/invoices/${invoice.id}`);
const status = (invoice, value, expected = 200) =>
  http('PATCH', `/invoices/${invoice.id}/status`, { status: value }, expected);
const create = (extra = {}, bearer = token) =>
  http(
    'POST',
    '/invoices/quick',
    {
      isQuickInvoice: true,
      quickCompanyName: 'Fictional studio',
      quickCustomerName: 'Fixture buyer',
      currency: 'INR',
      serviceDate: '2026-11-03',
      dueDate: '2026-12-03',
      taxRate: 0,
      lineItems: [
        { type: 'SERVICE', description: 'Design service', unit: 'hour', quantity: 1, rate: 100 },
      ],
      ...extra,
    },
    201,
    bearer,
  );
async function dbFails(sql, params, code) {
  await assert.rejects(
    () => pool.query(sql, params),
    (error) => error.code === code,
  );
}
(async () => {
  app = await NestFactory.create(
    {
      module: class PaymentFixture {},
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        ...[
          'payments/payment',
          'inventory/inventory',
          'invoice/invoice',
          'catalog/catalog',
          'customer/customer',
          'dashboard/dashboard',
        ].map((name) => {
          const [folder, file] = name.split('/');
          return require(`../dist/${folder}/${file}.module`)[
            `${file[0].toUpperCase()}${file.slice(1)}Module`
          ];
        }),
      ],
      providers: [AuthService, JwtStrategy],
    },
    { logger: false },
  );
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api/v1`;
  prisma = app.get(PrismaService);
  for (const id of [owner, other])
    await prisma.user.create({
      data: { id, email: `${id}@example.test`, displayName: 'Fixture owner' },
    });
  token = app.get(JwtService).sign({ sub: owner });
  otherToken = app.get(JwtService).sign({ sub: other });
  await pool.query(
    "SELECT setval(pg_get_serial_sequence('payment_entries','sequence'),9007199254740992)",
  );
  const invoice = await create({ invoiceNumber: 'PAYMENT-HTTP-001' });
  assert.equal(invoice.hasPaymentHistory, false);
  await http('GET', '/payments', undefined, 401, null);
  await record(invoice, request(), 401, null);
  await http('GET', `/payments/invoices/${invoice.id}`, undefined, 404, otherToken);
  await http('GET', `/payments?invoiceId=${invoice.id}`, undefined, 404, otherToken);
  await record(invoice, request(), 404, otherToken);
  await record(invoice, request(), 409);
  await status(invoice, 'PAID', 409);
  await status(invoice, 'SENT');
  for (const fields of [
    { amount: 1.25 },
    { amount: '1.001' },
    { amount: '0' },
    { amount: '-1' },
    { amount: null },
    { paymentDate: '2026-02-29' },
    { paymentDate: '2026-11-03T00:00:00Z' },
    { reference: false },
    { notes: null },
    { unknown: true },
  ])
    await record(invoice, { ...request(), ...fields }, 400);
  await http('GET', '/payments?dateFrom=2026-11-04&dateTo=2026-11-03', undefined, 400);
  await http('GET', '/payments?kind=GATEWAY', undefined, 400);
  await http('GET', '/payments?limit=101', undefined, 400);
  const receipt = request('25.50', { reference: ' UPI-123 ', notes: ' Received directly ' });
  const first = await record(invoice, receipt);
  assert.equal(first.entry.amountMinor, '2550');
  assert.equal(first.entry.reference, 'UPI-123');
  assert.equal(first.entry.notes, 'Received directly');
  assert.ok(BigInt(first.entry.sequence) > BigInt(Number.MAX_SAFE_INTEGER));
  assert.ok(!('requestHash' in first.entry));
  assert.deepEqual(await summary(invoice), {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: 'SENT',
    currency: 'INR',
    total: '100.00',
    amountPaid: '25.50',
    balance: '74.50',
    hasPaymentHistory: true,
  });
  const replay = await record(invoice, {
    ...receipt,
    amount: '025.500'.slice(0, -1),
    reference: 'UPI-123',
    notes: 'Received directly',
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.entry.id, first.entry.id);
  await record(invoice, { ...receipt, amount: '25.51' }, 409);
  await record(invoice, request('74.51'), 409);
  await http('PUT', `/invoices/${invoice.id}`, { amountPaid: 0 }, 400);
  await http('PUT', `/invoices/${invoice.id}`, { currency: 'USD' }, 409);
  await http(
    'PUT',
    `/invoices/${invoice.id}`,
    {
      lineItems: [{ type: 'SERVICE', description: 'Reduced', unit: 'hour', quantity: 1, rate: 20 }],
    },
    400,
  );
  const final = await record(invoice, request('74.50'));
  assert.equal((await summary(invoice)).status, 'PAID');
  await status(invoice, 'SENT', 409);
  await status(invoice, 'VOIDED', 409);
  const reversed = await reverse(final.entry);
  assert.equal(reversed.entry.amount, '-74.50');
  assert.equal((await summary(invoice)).amountPaid, '25.50');
  assert.equal((await summary(invoice)).status, 'SENT');
  await reverse(final.entry, {}, 409);
  await reverse(reversed.entry, {}, 400);
  await reverse(first.entry, {}, 404, otherToken);
  const repeatedReverse = {
    requestId: randomUUID(),
    paymentDate: '2026-11-02',
    reason: 'Remove incorrect first receipt',
  };
  const reverseResults = await Promise.all(
    Array.from({ length: 6 }, () => reverse(first.entry, repeatedReverse)),
  );
  assert.equal(new Set(reverseResults.map((r) => r.entry.id)).size, 1);
  assert.equal(reverseResults.filter((r) => !r.replayed).length, 1);
  assert.equal((await summary(invoice)).amountPaid, '0.00');
  await http('PUT', `/invoices/${invoice.id}`, { currency: 'USD' }, 409);
  assert.equal(
    (await http('GET', '/payments?status=active')).data.some((e) => e.invoice.id === invoice.id),
    false,
  );
  assert.equal((await http('GET', `/payments?invoiceId=${invoice.id}&status=reversed`)).total, 2);
  const history = await http('GET', `/payments?invoiceId=${invoice.id}&limit=1`);
  assert.equal(history.total, 4);
  assert.equal(history.hasNext, true);
  assert.equal(history.data.length, 1);
  assert.equal((await http('GET', '/payments?search=UPI-123')).total, 1);
  await status(invoice, 'VOIDED');
  assert.equal((await summary(invoice)).balance, '0.00');
  await record(invoice, request(), 409);

  await http(
    'POST',
    '/invoices/quick',
    {
      isQuickInvoice: true,
      quickCustomerName: 'X',
      serviceDate: '2026-11-03',
      dueDate: '2026-12-03',
      currency: 'INR',
      taxRate: 0,
      amountPaid: 1,
      lineItems: [{ type: 'SERVICE', description: 'X', unit: 'each', quantity: 1, rate: 10 }],
    },
    400,
  );
  const imported = await create({
    clientRequestId: 'guest-import-1',
    importedGuestDraft: true,
    amountPaid: 100,
  });
  assert.equal(imported.status, 'DRAFT');
  assert.equal(imported.hasPaymentHistory, true);
  const opening = (await http('GET', `/payments?invoiceId=${imported.id}`)).data[0];
  assert.equal(opening.kind, 'OPENING');
  assert.equal(opening.openingSource, 'GUEST_IMPORT');
  assert.equal(opening.paymentDate, null);
  assert.equal(
    (await create({ clientRequestId: 'guest-import-1', importedGuestDraft: true, amountPaid: 100 }))
      .id,
    imported.id,
  );
  assert.equal(
    (await http('GET', `/payments?invoiceId=${imported.id}&dateFrom=2026-01-01`)).total,
    0,
  );
  await status(imported, 'SENT');
  assert.equal((await summary(imported)).status, 'PAID');
  await reverse(opening);
  assert.equal((await summary(imported)).status, 'SENT');
  const draft = await create({
    clientRequestId: 'guest-draft-reversal',
    importedGuestDraft: true,
    amountPaid: 10,
  });
  const draftOpening = (await http('GET', `/payments?invoiceId=${draft.id}`)).data[0];
  await reverse(draftOpening);
  assert.equal((await summary(draft)).status, 'DRAFT');
  await http('DELETE', `/invoices/${draft.id}`, undefined, 409);
  const usd = await create({
    clientRequestId: 'guest-usd',
    importedGuestDraft: true,
    currency: 'USD',
    amountPaid: 25,
  });
  const usdOpening = (await http('GET', `/payments?invoiceId=${usd.id}`)).data[0];
  await reverse(usdOpening);
  await status(usd, 'SENT');
  await record(usd, request(), 409);
  assert.equal((await summary(usd)).amountPaid, '0.00');

  const racing = await create({
    lineItems: [
      { type: 'SERVICE', description: 'Concurrency', unit: 'each', quantity: 1, rate: 10 },
    ],
  });
  await status(racing, 'SENT');
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      raw('POST', `/payments/invoices/${racing.id}/receipts`, request('1.00')),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 10);
  assert.equal(results.filter((r) => r.status === 409).length, 10);
  assert.equal((await summary(racing)).amountPaid, '10.00');
  const once = await create();
  await status(once, 'SENT');
  const onceRequest = request('1.00');
  const onceResults = await Promise.all(Array.from({ length: 8 }, () => record(once, onceRequest)));
  assert.equal(new Set(onceResults.map((r) => r.entry.id)).size, 1);
  const collision = await create();
  await status(collision, 'SENT');
  await record(collision, onceRequest, 409);
  assert.equal((await summary(collision)).amountPaid, '0.00');
  const shrinking = await create();
  await status(shrinking, 'SENT');
  const editRace = await Promise.all([
    raw('POST', `/payments/invoices/${shrinking.id}/receipts`, request('30')),
    raw('PUT', `/invoices/${shrinking.id}`, {
      lineItems: [{ type: 'SERVICE', description: 'Reduced', unit: 'each', quantity: 1, rate: 20 }],
    }),
  ]);
  assert.ok(
    (editRace[0].status === 201 && editRace[1].status === 400) ||
      (editRace[0].status === 409 && editRace[1].status === 200),
  );
  const cancelling = await create();
  await status(cancelling, 'SENT');
  const voidRace = await Promise.all([
    raw('POST', `/payments/invoices/${cancelling.id}/receipts`, request('1')),
    raw('PATCH', `/invoices/${cancelling.id}/status`, { status: 'VOIDED' }),
  ]);
  assert.ok(
    (voidRace[0].status === 201 && voidRace[1].status === 409) ||
      (voidRace[0].status === 409 && voidRace[1].status === 200),
  );

  const product = await prisma.catalogItem.create({
    data: {
      userId: owner,
      type: 'PRODUCT',
      name: 'Tracked product',
      unit: 'kg',
      rate: 50,
      currency: 'INR',
    },
  });
  await http('POST', `/inventory/products/${product.id}/opening`, {
    requestId: randomUUID(),
    reason: 'Opening',
    quantity: '8',
    unit: 'kg',
    effectiveDate: '2026-11-03',
  });
  const stocked = await create({
    lineItems: [
      {
        type: 'PRODUCT',
        catalogItemId: product.id,
        description: 'Stock',
        unit: 'kg',
        quantity: 2,
        rate: 50,
      },
    ],
  });
  await status(stocked, 'SENT');
  const stockBefore = (await http('GET', `/inventory/products/${product.id}/balance`)).quantity;
  assert.equal(stockBefore, '6.000');
  const stockPaid = await record(stocked, request('100'));
  await reverse(stockPaid.entry);
  assert.equal(
    (await http('GET', `/inventory/products/${product.id}/balance`)).quantity,
    stockBefore,
  );
  await status(stocked, 'VOIDED');
  assert.equal((await http('GET', `/inventory/products/${product.id}/balance`)).quantity, '8.000');
  const payable = await http('GET', '/payments/invoices?search=PAYMENT-HTTP');
  assert.equal(payable.total, 0); // Voided is excluded before paging.
  const otherInvoice = await create({}, otherToken);
  await http('PATCH', `/invoices/${otherInvoice.id}/status`, { status: 'SENT' }, 200, otherToken);
  await record(otherInvoice, request('1'), 201, otherToken);
  assert.equal((await http('GET', '/payments', undefined, 200, otherToken)).total, 1);

  await dbFails(
    "UPDATE payment_entries SET notes='changed' WHERE id=$1",
    [first.entry.id],
    '23514',
  );
  await dbFails('DELETE FROM payment_entries WHERE id=$1', [first.entry.id], '23514');
  await dbFails('TRUNCATE payment_entries', [], '23514');
  await dbFails('UPDATE invoices SET "amountPaid"=5 WHERE id=$1', [once.id], '23514');
  await dbFails('UPDATE invoices SET "amountPaid"=1.001 WHERE id=$1', [once.id], '23514');
  await dbFails("UPDATE invoices SET currency='USD' WHERE id=$1", [once.id], '23514');
  await dbFails('DELETE FROM invoices WHERE id=$1', [once.id], '23503');
  assert.equal((await summary(once)).amountPaid, '1.00');
  await prisma.user.delete({ where: { id: owner } });
  assert.equal(await prisma.paymentEntry.count({ where: { userId: owner } }), 0);
  console.log(
    JSON.stringify({
      passed: true,
      httpRequests: requests,
      checks: [
        'JWT/account isolation',
        'strict exact inputs',
        'partial/full receipts',
        'idempotency/collision',
        'full linked reversals',
        'guest/migration baselines',
        'currency and pricing/delete guards',
        'history filters/paging',
        'concurrent overpayment/edit/void',
        'no receipt stock movements',
        'native append-only/cache/retention',
        'whole-account cascade',
      ],
    }),
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
    await app?.close();
    await pool.end();
  });
