// Fictional fixtures only: real JWT/HTTP/Nest/Prisma/PostgreSQL stock lifecycle.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const connection = process.env.INVOICE_STOCK_TEST_DATABASE_URL;
if (!connection)
  throw new Error(
    'Set INVOICE_STOCK_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.',
  );
const url = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !url.pathname.startsWith('/stock_schema_')
)
  throw new Error('Stock lifecycle tests require a disposable stock_schema_* localhost database.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'invoice-stock-fixture-only';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { Pool } = require('pg');
const { InventoryModule } = require('../dist/inventory/inventory.module');
const { PaymentModule } = require('../dist/payments/payment.module');
const { InvoiceModule } = require('../dist/invoice/invoice.module');
const { CustomerModule } = require('../dist/customer/customer.module');
const { DashboardModule } = require('../dist/dashboard/dashboard.module');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const pool = new Pool({ connectionString: connection });
const owner = `invoice-stock-${randomUUID()}`;
const other = `invoice-stock-other-${randomUUID()}`;
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
const row = (product, quantity, extra = {}) => ({
  type: product?.type ?? 'PRODUCT',
  ...(product && { catalogItemId: product.id }),
  description: 'Invoice stock fixture',
  unit: product?.unit ?? 'each',
  quantity,
  rate: 1,
  ...extra,
});
const create = (lineItems, extra = {}, bearer = token) =>
  http(
    'POST',
    '/invoices/quick',
    {
      isQuickInvoice: true,
      quickCompanyName: 'Fictional business',
      quickCustomerName: 'Fixture client',
      serviceDate: '2026-11-03',
      dueDate: '2026-12-03',
      currency: 'USD',
      taxRate: 0,
      lineItems,
      ...extra,
    },
    201,
    bearer,
  );
const status = (invoice, value, code = 200) =>
  http('PATCH', `/invoices/${invoice.id}/status`, { status: value }, code);
const edit = (invoice, body, code = 200) => http('PUT', `/invoices/${invoice.id}`, body, code);
const balance = async (product) =>
  (await http('GET', `/inventory/products/${product.id}/balance`)).quantity;
const historyCount = (invoice) => prisma.stockAction.count({ where: { invoiceId: invoice.id } });
async function product(name, quantity, extra = {}) {
  const item = await prisma.catalogItem.create({
    data: { userId: owner, type: 'PRODUCT', name, unit: 'kg', rate: 1, currency: 'USD', ...extra },
  });
  if (quantity !== undefined) await opening(item, quantity);
  return item;
}
const opening = (item, quantity) =>
  http('POST', `/inventory/products/${item.id}/opening`, {
    requestId: randomUUID(),
    quantity,
    unit: item.unit,
    reason: 'Current stock',
    effectiveDate: '2026-11-03',
  });

(async () => {
  if (process.argv.includes('--upgrade')) {
    const before = (
      await pool.query(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid='"InvoiceStatus"'::regtype ORDER BY enumsortorder`,
      )
    ).rows;
    assert.deepEqual(
      before.map((r) => r.enumlabel),
      ['DRAFT', 'SENT', 'PAID'],
    );
    await pool.query(
      readFileSync(join(__dirname, '../prisma/updates/20261103_invoice_inventory.sql'), 'utf8'),
    );
    const after = (
      await pool.query(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid='"InvoiceStatus"'::regtype ORDER BY enumsortorder`,
      )
    ).rows;
    assert.deepEqual(
      after.map((r) => r.enumlabel),
      ['DRAFT', 'SENT', 'PAID', 'VOIDED'],
    );
  }
  app = await NestFactory.create(
    {
      module: class InvoiceStockFixture {},
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        InventoryModule,
        PaymentModule,
        InvoiceModule,
        CustomerModule,
        DashboardModule,
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
      data: { id, email: `${id}@invoiceo.test`, displayName: 'Fictional stock owner' },
    });
  token = app.get(JwtService).sign({ sub: owner });
  otherToken = app.get(JwtService).sign({ sub: other });

  const cable = await product('Cable', '10.125');
  const low = await product('Low stock', '1');
  const service = await product('Consultation', undefined, { type: 'SERVICE' });
  const invoice = await create([row(cable, 1.25), row(cable, 0.875), row(service, 0.1234)], {
    currency: 'INR',
  });
  assert.equal(await balance(cable), '10.125');
  assert.equal(invoice.issuedAt, null);
  await http('PATCH', `/invoices/${invoice.id}/status`, { status: 'SENT' }, 401, null);
  await http('PATCH', `/invoices/${invoice.id}/status`, { status: 'SENT' }, 403, otherToken);
  await status(invoice, 'PAID', 409);
  const issued = await Promise.all(Array.from({ length: 4 }, () => status(invoice, 'SENT')));
  assert.ok(issued.every((value) => value.issuedAt && value.status === 'SENT'));
  assert.equal(await historyCount(invoice), 1);
  assert.equal(await balance(cable), '8.000');
  await status(invoice, 'DRAFT', 409);
  await http('DELETE', `/invoices/${invoice.id}`, undefined, 409);
  await edit(invoice, {
    lineItems: [row(cable, 0.125), row(cable, 2), row(service, 0.1234)],
    notes: 'Split rows',
  });
  assert.equal(await historyCount(invoice), 1);
  const increased = { lineItems: [row(cable, 0.125), row(cable, 2.875)] };
  await edit(invoice, increased);
  assert.equal(await balance(cable), '7.125');
  assert.equal(await historyCount(invoice), 2);
  await edit(invoice, increased);
  assert.equal(await historyCount(invoice), 2);
  await edit(invoice, {
    lineItems: [row(cable, 0.125, { rate: 20 }), row(cable, 2.875, { rate: 20 })],
  });
  assert.equal(await historyCount(invoice), 2);
  assert.equal(await balance(cable), '7.125');
  const saved = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: { lineItems: true },
  });
  await edit(invoice, { lineItems: [row(cable, 1), row(low, 2)] }, 409);
  assert.deepEqual(
    await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { lineItems: true } }),
    saved,
  );
  assert.equal(await balance(cable), '7.125');
  assert.equal(await balance(low), '1.000');
  await edit(invoice, { lineItems: [row(cable, 0.1234)] }, 400);
  const paymentBody = (amount) => ({ requestId: randomUUID(), paymentDate: '2026-11-03', amount });
  const partialReceipt = await http(
    'POST',
    `/payments/invoices/${invoice.id}/receipts`,
    paymentBody('0.50'),
  );
  await status(invoice, 'VOIDED', 409);
  const remainingReceipt = await http(
    'POST',
    `/payments/invoices/${invoice.id}/receipts`,
    paymentBody('59.50'),
  );
  assert.equal(await balance(cable), '7.125');
  await status(invoice, 'VOIDED', 409);
  for (const receipt of [remainingReceipt, partialReceipt])
    await http('POST', `/payments/${receipt.entry.id}/reversal`, {
      requestId: randomUUID(),
      paymentDate: '2026-11-03',
      reason: 'Correct receipt without changing stock',
    });
  const reopenedBalance = await http('GET', `/invoices/${invoice.id}`);
  assert.equal(reopenedBalance.status, 'SENT');
  const voids = await Promise.all(Array.from({ length: 4 }, () => status(invoice, 'VOIDED')));
  assert.ok(voids.every((value) => value.status === 'VOIDED'));
  assert.equal(await balance(cable), '10.125');
  assert.equal(await historyCount(invoice), 3);
  assert.equal(voids[0].issuedAt, issued[0].issuedAt);
  await edit(invoice, { notes: 'Cannot edit' }, 409);
  await status(invoice, 'SENT', 409);
  await http('DELETE', `/invoices/${invoice.id}`, undefined, 409);
  assert.equal((await http('GET', '/invoices?status=VOIDED')).data[0].id, invoice.id);

  // Current opening stock does not replay old issued invoices; saved drafts issue afterward.
  const later = await product('Cutover');
  const historical = await create([row(later, 1.2345, { rate: 0.335 })]);
  await prisma.invoice.update({
    where: { id: historical.id },
    data: { status: 'SENT', subtotal: 0.67, taxAmount: 0, total: 0.67 },
  });
  await prisma.lineItem.updateMany({
    where: { invoiceId: historical.id },
    data: { amount: 0.335 },
  });
  const savedDraft = await create([row(later, 2)]);
  await opening(later, '10');
  const oldEdit = await edit(historical, { notes: 'Preserve historical snapshot' });
  assert.equal(oldEdit.total, 0.67);
  assert.equal(oldEdit.lineItems[0].amount, 0.335);
  assert.equal(oldEdit.lineItems[0].quantity, 1.2345);
  assert.equal(oldEdit.issuedAt, null);
  assert.equal(await historyCount(historical), 0);
  await status(savedDraft, 'SENT');
  assert.equal(await balance(later), '8.000');
  await status(historical, 'VOIDED');
  assert.equal(await balance(later), '8.000');
  assert.equal((await prisma.invoice.findUnique({ where: { id: historical.id } })).issuedAt, null);
  const afterIssue = await product('Tracking enabled after issue');
  const early = await create([row(afterIssue, 1.2345)]);
  await status(early, 'SENT');
  await opening(afterIssue, '5');
  await edit(early, { lineItems: [row(afterIssue, 2.3456)] });
  assert.equal(await balance(afterIssue), '5.000');
  await status(early, 'VOIDED');
  assert.equal(await balance(afterIssue), '5.000');
  const eligible = await product('Added to an issued invoice', '5');
  const initiallyUnlinked = await create([row(null, 1)]);
  await status(initiallyUnlinked, 'SENT');
  await edit(initiallyUnlinked, { lineItems: [row(eligible, 2)] });
  assert.equal(await balance(eligible), '3.000');
  await edit(initiallyUnlinked, { lineItems: [row(null, 1)] });
  assert.equal(await balance(eligible), '5.000');
  await status(initiallyUnlinked, 'VOIDED');
  assert.equal(await balance(eligible), '5.000');

  // Concurrent invoices contend on the product lock; the losing issue remains a draft.
  const scarce = await product('Scarce', '1');
  const contenders = await Promise.all([create([row(scarce, 1)]), create([row(scarce, 1)])]);
  const race = await Promise.all(
    contenders.map((value) => raw('PATCH', `/invoices/${value.id}/status`, { status: 'SENT' })),
  );
  assert.deepEqual(race.map((value) => value.status).sort(), [200, 409]);
  const winner = contenders[race.findIndex((value) => value.status === 200)];
  const loser = contenders[race.findIndex((value) => value.status === 409)];
  assert.equal(await balance(scarce), '0.000');
  assert.equal(await historyCount(loser), 0);
  const failedIssue = await prisma.invoice.findUnique({ where: { id: loser.id } });
  assert.equal(failedIssue.status, 'DRAFT');
  assert.equal(failedIssue.issuedAt, null);
  await status(winner, 'VOIDED');
  await status(loser, 'SENT');
  assert.equal(await balance(scarce), '0.000');
  const editing = await product('Concurrent edits', '10');
  const editable = await create([row(editing, 2)]);
  await status(editable, 'SENT');
  await Promise.all([
    edit(editable, { lineItems: [row(editing, 5)] }),
    edit(editable, { lineItems: [row(editing, 3)] }),
  ]);
  const finalEdit = await prisma.invoice.findUnique({
    where: { id: editable.id },
    include: { lineItems: true },
  });
  assert.equal(await balance(editing), `${10 - finalEdit.lineItems[0].quantity}.000`);
  const editVoid = await Promise.all([
    raw('PUT', `/invoices/${editable.id}`, { lineItems: [row(editing, 4)] }),
    raw('PATCH', `/invoices/${editable.id}/status`, { status: 'VOIDED' }),
  ]);
  assert.ok([200, 409].includes(editVoid[0].status));
  assert.equal(editVoid[1].status, 200);
  assert.equal(await balance(editing), '10.000');
  const deletable = await create([row(null, 1)]);
  await http('DELETE', `/invoices/${deletable.id}`);
  const deletionRace = await create([row(editing, 1)]);
  const deleteIssue = await Promise.all([
    raw('DELETE', `/invoices/${deletionRace.id}`),
    raw('PATCH', `/invoices/${deletionRace.id}/status`, { status: 'SENT' }),
  ]);
  assert.ok(
    (deleteIssue[0].status === 204 && deleteIssue[1].status === 404) ||
      (deleteIssue[0].status === 409 && deleteIssue[1].status === 200),
  );
  assert.equal(await balance(editing), deleteIssue[0].status === 204 ? '10.000' : '9.000');

  const customer = await prisma.customer.create({
    data: {
      userId: owner,
      name: 'Customer fixture',
      email: 'client@invoiceo.test',
      phone: '1234567890',
      address: 'Street',
      city: 'City',
      state: 'State',
      zipCode: '12345',
    },
  });
  const standardBody = {
    customerId: customer.id,
    serviceDate: '2026-11-03',
    dueDate: '2026-12-03',
    taxRate: 0,
    currency: 'USD',
    lineItems: [row(null, 1)],
  };
  const customerRace = await Promise.all([
    raw('DELETE', `/customers/${customer.id}`),
    raw('POST', '/invoices', standardBody),
  ]);
  assert.ok(!(customerRace[0].status === 204 && customerRace[1].status === 201));
  assert.ok([204, 400].includes(customerRace[0].status));
  assert.ok([201, 400, 404].includes(customerRace[1].status));
  if (customerRace[1].status === 201)
    await http('DELETE', `/customers/${customer.id}`, undefined, 400);
  const inactive = await create([row(null, 100)], {}, otherToken);
  await http('PATCH', `/invoices/${inactive.id}/status`, { status: 'SENT' }, 200, otherToken);
  await http('PATCH', `/invoices/${inactive.id}/status`, { status: 'VOIDED' }, 200, otherToken);
  await create([row(null, 10)], {}, otherToken);
  const stats = await http('GET', '/dashboard/statistics', undefined, 200, otherToken);
  assert.equal(stats.totalInvoices, 2);
  assert.equal(stats.averageInvoiceValue, 10);
  assert.equal(stats.currencyTotals[0].averageInvoiceValue, 10);
  console.log(
    JSON.stringify({
      passed: true,
      httpRequests: requests,
      checks: [
        ...(process.argv.includes('--upgrade') ? ['enum upgrade'] : []),
        'JWT ownership',
        'atomic issue/edit/void and retries',
        'duplicate quantities and precision',
        'shortage rollback',
        'payment and immutable lifecycle guards',
        'historical and per-product cutover',
        'actual posted returns',
        'invoice issue/edit/void/delete concurrency',
        'customer cascade race',
        'voided dashboard exclusion',
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
    if (app) await app.close();
    await pool.end();
  });
