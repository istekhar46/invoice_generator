// Fictional fixtures only. Real JWT/HTTP/Prisma/PostgreSQL quotation lifecycle and conversion.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.QUOTES_TEST_DATABASE_URL;
if (!connection)
  throw Error('Set QUOTES_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.');
const target = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.startsWith('/stock_schema_')
)
  throw Error('Disposable localhost database required.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'quotes-local-fixture-only';
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
const owner = `quote-${randomUUID()}`,
  other = `quote-other-${randomUUID()}`;
let app,
  prisma,
  base,
  token,
  otherToken,
  requests = 0;
const today = new Date().toISOString().slice(0, 10),
  future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
async function http(
  method,
  path,
  body,
  expected = method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200,
  bearer = token,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  requests++;
  const json = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return expected < 300 ? json?.data : json;
}
const quick = (extra = {}) => ({
  isQuickInvoice: true,
  quickCompanyName: 'Fixture company',
  quickCustomerName: 'Fixture customer',
  serviceDate: today,
  dueDate: future,
  currency: 'USD',
  taxRate: 0,
  lineItems: [
    { type: 'SERVICE', description: 'One-off service', unit: 'hour', quantity: 1, rate: 1 },
  ],
  ...extra,
});
const change = (quote, status) =>
  http('PATCH', `/quotes/${quote.id}/status`, { version: quote.version, status });
const balance = async (id) => (await http('GET', `/inventory/products/${id}/balance`)).quantity;
const convertedInput = (quote) => ({ version: quote.version, serviceDate: today, dueDate: future });
async function rejectedSql(sql, values = []) {
  await assert.rejects(pool.query(sql, values), (err) => ['23503', '23514'].includes(err.code));
}
(async () => {
  app = await NestFactory.create(
    {
      module: class QuoteTestApp {},
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        ...[
          'quotes/quote',
          'invoice/invoice',
          'catalog/catalog',
          'inventory/inventory',
          'customer/customer',
        ].map((name) => {
          const leaf = name.split('/')[1];
          return require(`../dist/${name}.module`)[
            `${leaf[0].toUpperCase()}${leaf.slice(1)}Module`
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
      data: { id, email: `${id}@invoiceo.test`, displayName: 'Quote fixture' },
    });
  token = app.get(JwtService).sign({ sub: owner });
  otherToken = app.get(JwtService).sign({ sub: other });
  const customerData = {
    name: 'Original customer',
    email: 'quote-customer@example.test',
    phone: '9000000000',
    address: '1 Fictional Road',
    city: 'Kolkata',
    state: 'West Bengal',
    zipCode: '700001',
  };
  const customer = await prisma.customer.create({ data: { ...customerData, userId: owner } }),
    foreign = await prisma.customer.create({ data: { ...customerData, userId: other } });
  const companyData = {
    businessName: 'Original business',
    address: '2 Example Road',
    city: 'Kolkata',
    state: 'West Bengal',
    zipCode: '700001',
    phone: '9000000000',
    email: 'business@example.test',
    taxNumber: '',
    defaultLaborRate: 0,
    defaultTaxRate: 0,
  };
  await prisma.companyProfile.create({ data: { ...companyData, userId: owner } });
  const product = await prisma.catalogItem.create({
    data: {
      userId: owner,
      name: 'Logo',
      type: 'PRODUCT',
      unit: 'PCS',
      rate: 0.335,
      currency: 'USD',
    },
  });
  await http('POST', `/inventory/products/${product.id}/opening`, {
    requestId: randomUUID(),
    quantity: '10',
    unit: 'PCS',
    reason: 'Current stock',
    effectiveDate: today,
  });
  const content = {
    customerId: customer.id,
    quoteDate: today,
    validUntil: future,
    currency: 'USD',
    taxRate: 0.1,
    discountType: 'percentage',
    discountValue: 10,
    shippingAmount: 1.25,
    notes: 'Saved note',
    terms: 'Saved terms',
    lineItems: [
      {
        type: 'PRODUCT',
        catalogItemId: product.id,
        description: 'Quoted logo',
        unit: 'PCS',
        quantity: 2,
        rate: 0.335,
      },
      { type: 'SERVICE', description: 'Design', unit: 'hour', quantity: 3, rate: 25 },
    ],
  };
  const input = (extra) => ({ ...content, clientRequestId: randomUUID(), ...extra });
  await http('GET', '/quotes', undefined, 401, null);
  await http('POST', '/quotes', input({ customerId: foreign.id }), 404);
  await http('POST', '/quotes', input({ customerId: foreign.id }), 400, otherToken); // No company profile.
  await prisma.companyProfile.create({ data: { ...companyData, userId: other } });
  const foreignProduct = await prisma.catalogItem.create({
    data: {
      userId: other,
      name: 'Foreign product',
      type: 'PRODUCT',
      unit: 'PCS',
      rate: 1,
      currency: 'USD',
    },
  });
  await http(
    'POST',
    '/quotes',
    input({ lineItems: [{ ...content.lineItems[0], catalogItemId: foreignProduct.id }] }),
    404,
  );
  for (const extra of [
    { amountPaid: 1 },
    { status: 'ACCEPTED' },
    { validUntil: past },
    { lineItems: [] },
    { lineItems: [{ ...content.lineItems[0], unit: 'kg' }] },
    { lineItems: [{ ...content.lineItems[0], quantity: 0.1234 }] },
    { lineItems: [{ ...content.lineItems[0], description: ' ' }] },
  ])
    await http('POST', '/quotes', input(extra), 400);
  const same = input();
  const copies = await Promise.all(Array.from({ length: 6 }, () => http('POST', '/quotes', same)));
  let quote = copies[0];
  assert.equal(new Set(copies.map((q) => q.id)).size, 1);
  assert.equal(quote.quoteNumber, 'QT-000001');
  assert.equal(quote.subtotal, 75.67);
  assert.equal(quote.total, 76.16);
  assert.equal(quote.lineItems[0].amount, 0.67);
  assert.ok(!('requestHash' in quote));
  assert.equal(await balance(product.id), '10.000');
  await http('POST', '/quotes', { ...same, notes: 'Different request content' }, 409);
  await http('PUT', `/catalog/${product.id}`, { unit: 'box' }, 400);
  await http('DELETE', `/customers/${customer.id}`, undefined, 400);
  for (const [method, path, body] of [
    ['GET', `/quotes/${quote.id}`],
    ['PUT', `/quotes/${quote.id}`, { ...content, version: quote.version }],
    ['PATCH', `/quotes/${quote.id}/status`, { status: 'ISSUED', version: quote.version }],
    ['POST', `/quotes/${quote.id}/convert`, convertedInput(quote)],
  ])
    await http(method, path, body, 404, otherToken);
  await http('POST', `/quotes/${quote.id}/convert`, convertedInput(quote), 409);
  await http(
    'PATCH',
    `/quotes/${quote.id}/status`,
    { status: 'ACCEPTED', version: quote.version },
    409,
  );
  const updated = await http('PUT', `/quotes/${quote.id}`, {
    ...content,
    notes: 'Revised draft',
    version: quote.version,
  });
  await http('PUT', `/quotes/${quote.id}`, { ...content, version: quote.version }, 409);
  quote = await change(updated, 'ISSUED');
  await http('PUT', `/quotes/${quote.id}`, { ...content, version: quote.version }, 409);
  await rejectedSql('UPDATE quotes SET total=1 WHERE id=$1', [quote.id]);
  await rejectedSql('UPDATE quote_line_items SET rate=2 WHERE "quoteId"=$1', [quote.id]);
  quote = await change(quote, 'ACCEPTED');
  const oldQuote = structuredClone(quote);
  await prisma.customer.update({ where: { id: customer.id }, data: { name: 'Changed customer' } });
  await prisma.companyProfile.update({
    where: { userId: owner },
    data: { businessName: 'Changed business' },
  });
  await http('PUT', `/catalog/${product.id}`, { rate: 999, isArchived: true });
  const manual = await http('POST', '/invoices/quick', quick({ invoiceNumber: 'INV-000001' }));
  await http(
    'POST',
    `/quotes/${quote.id}/convert`,
    { ...convertedInput(quote), amountPaid: 1 },
    400,
  );
  await http('POST', `/quotes/${quote.id}/convert`, { ...convertedInput(quote), version: 1 }, 409);
  await http(
    'POST',
    `/quotes/${quote.id}/convert`,
    { ...convertedInput(quote), invoiceNumber: 'INV-000001' },
    409,
  );
  await http(
    'POST',
    `/quotes/${quote.id}/convert`,
    { ...convertedInput(quote), dueDate: past },
    400,
  );
  assert.equal((await http('GET', `/quotes/${quote.id}`)).convertedInvoice, null);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      http('POST', `/quotes/${quote.id}/convert`, convertedInput(quote)),
    ),
  );
  assert.equal(new Set(results.map((x) => x.invoice.id)).size, 1);
  assert.equal(results.filter((x) => !x.replayed).length, 1);
  const invoiceId = results[0].invoice.id;
  let invoice = await http('GET', `/invoices/${invoiceId}`);
  assert.equal(invoice.invoiceNumber, 'INV-000002');
  assert.equal(invoice.status, 'DRAFT');
  assert.equal(invoice.amountPaid, 0);
  assert.equal(invoice.issuedAt, null);
  assert.equal(invoice.sourceQuote.id, quote.id);
  assert.equal(invoice.sourceQuoteId, quote.id);
  assert.equal(invoice.quickCompanyName, 'Original business');
  assert.equal(invoice.quickCustomerName, 'Original customer');
  for (const field of [
    'currency',
    'subtotal',
    'taxRate',
    'taxAmount',
    'total',
    'discountType',
    'discountValue',
    'shippingAmount',
    'notes',
    'terms',
  ])
    assert.equal(invoice[field], oldQuote[field]);
  for (const source of oldQuote.lineItems) {
    const row = invoice.lineItems.find((x) => x.description === source.description);
    for (const key of ['catalogItemId', 'type', 'unit', 'quantity', 'rate', 'amount'])
      assert.equal(row[key], source[key]);
  }
  assert.equal(await balance(product.id), '10.000');
  assert.equal(await prisma.stockAction.count({ where: { invoiceId } }), 0);
  assert.equal(await prisma.paymentEntry.count({ where: { invoiceId } }), 0);
  assert.equal(
    (await http('GET', '/invoices')).data.find((x) => x.id === invoiceId).sourceQuote.id,
    quote.id,
  );
  assert.equal((await http('GET', `/quotes/${quote.id}`)).convertedInvoice.id, invoiceId);
  await http('DELETE', `/invoices/${invoiceId}`, undefined, 409);
  await rejectedSql('DELETE FROM invoices WHERE id=$1', [invoiceId]);
  await rejectedSql('UPDATE invoices SET "sourceQuoteId"=NULL WHERE id=$1', [invoiceId]);
  await rejectedSql('DELETE FROM quotes WHERE id=$1', [quote.id]);
  await http(
    'PATCH',
    `/quotes/${quote.id}/status`,
    { version: quote.version, status: 'CANCELLED' },
    409,
  );
  await http('PUT', `/invoices/${invoiceId}`, {
    notes: 'Invoice-only edit',
    lineItems: invoice.lineItems.map((row) => ({
      type: row.type,
      catalogItemId: row.catalogItemId,
      description: row.description,
      unit: row.unit,
      quantity: row.quantity,
      rate: row.rate + 1,
    })),
  });
  const retainedQuote = await http('GET', `/quotes/${quote.id}`);
  assert.equal(retainedQuote.total, oldQuote.total);
  assert.equal(retainedQuote.notes, oldQuote.notes);
  assert.equal(retainedQuote.lineItems[0].rate, oldQuote.lineItems[0].rate);
  assert.equal(await balance(product.id), '10.000');
  invoice = await http('PATCH', `/invoices/${invoiceId}/status`, { status: 'VOIDED' });
  assert.equal(invoice.status, 'VOIDED');
  assert.equal(invoice.issuedAt, null);
  assert.equal(await balance(product.id), '10.000');
  assert.equal(await prisma.stockAction.count({ where: { invoiceId } }), 0);
  assert.equal(
    (
      await http('POST', `/quotes/${quote.id}/convert`, {
        ...convertedInput(quote),
        version: 1,
        invoiceNumber: 'SHOULD-NOT-CREATE',
      })
    ).invoice.id,
    invoiceId,
  );
  // Expiry is date-derived; expired active/accepted quotes do not convert.
  const expired = await http(
    'POST',
    '/quotes',
    input({ quoteDate: past, validUntil: past, lineItems: [content.lineItems[1]] }),
  );
  assert.equal(expired.isExpired, true);
  await http(
    'PATCH',
    `/quotes/${expired.id}/status`,
    { status: 'ISSUED', version: expired.version },
    409,
  );
  await prisma.quote.update({
    where: { id: expired.id },
    data: { status: 'ISSUED', issuedAt: new Date(`${past}T00:00:00Z`) },
  });
  await prisma.quote.update({
    where: { id: expired.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date(`${past}T01:00:00Z`) },
  });
  await http(
    'POST',
    `/quotes/${expired.id}/convert`,
    { version: 1, serviceDate: today, dueDate: future },
    409,
  );
  assert.equal((await http('GET', '/quotes?expiry=expired')).total, 1);
  const cancelled = await http('POST', '/quotes', input({ lineItems: [content.lineItems[1]] }));
  await change(cancelled, 'CANCELLED');
  await http('POST', `/quotes/${cancelled.id}/convert`, convertedInput(cancelled), 409);
  let declined = await http('POST', '/quotes', input({ lineItems: [content.lineItems[1]] }));
  declined = await change(declined, 'ISSUED');
  declined = await change(declined, 'DECLINED');
  await http('POST', `/quotes/${declined.id}/convert`, convertedInput(declined), 409);
  // Accepted conversion does not issue; a later explicit issue posts stock exactly once.
  await http('PUT', `/catalog/${product.id}`, { isArchived: false });
  let stockQuote = await http('POST', '/quotes', input({ lineItems: [content.lineItems[0]] }));
  stockQuote = await change(stockQuote, 'ISSUED');
  stockQuote = await change(stockQuote, 'ACCEPTED');
  const targetInvoice = (
    await http('POST', `/quotes/${stockQuote.id}/convert`, convertedInput(stockQuote))
  ).invoice;
  await http('PATCH', `/invoices/${targetInvoice.id}/status`, { status: 'SENT' });
  assert.equal(await balance(product.id), '8.000');
  await http('PATCH', `/invoices/${targetInvoice.id}/status`, { status: 'VOIDED' });
  assert.equal(await balance(product.id), '10.000');
  let oversold = await http(
    'POST',
    '/quotes',
    input({ lineItems: [{ ...content.lineItems[0], quantity: 11 }] }),
  );
  oversold = await change(oversold, 'ISSUED');
  oversold = await change(oversold, 'ACCEPTED');
  const overInvoice = (
    await http('POST', `/quotes/${oversold.id}/convert`, convertedInput(oversold))
  ).invoice;
  await http('PATCH', `/invoices/${overInvoice.id}/status`, { status: 'SENT' }, 409);
  assert.equal(await balance(product.id), '10.000');
  await http('PATCH', `/invoices/${overInvoice.id}/status`, { status: 'VOIDED' });
  assert.equal(await balance(product.id), '10.000');
  let racing = await http('POST', '/quotes', input({ lineItems: [content.lineItems[1]] }));
  racing = await change(racing, 'ISSUED');
  racing = await change(racing, 'ACCEPTED');
  const outcomes = await Promise.all(
    [
      ['POST', `/quotes/${racing.id}/convert`, convertedInput(racing)],
      ['PATCH', `/quotes/${racing.id}/status`, { version: racing.version, status: 'CANCELLED' }],
    ].map(async ([method, path, body]) => {
      requests++;
      const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      return response.status;
    }),
  );
  assert.ok(
    (outcomes[0] === 201 && outcomes[1] === 409) || (outcomes[0] === 409 && outcomes[1] === 200),
  );
  // Independent account numbering, stable pagination/search and counter retention.
  const otherQuote = await http(
    'POST',
    '/quotes',
    input({ customerId: foreign.id, lineItems: [content.lineItems[1]] }),
    201,
    otherToken,
  );
  assert.equal(otherQuote.quoteNumber, 'QT-000001');
  assert.equal((await http('GET', '/quotes', undefined, 200, otherToken)).total, 1);
  const list = await http('GET', '/quotes?search=Original&limit=1&page=2');
  assert.equal(list.total, 1);
  assert.equal(list.data.length, 0);
  assert.equal(list.hasPrev, true);
  const auto = await Promise.all(
    Array.from({ length: 8 }, () => http('POST', '/invoices/quick', quick())),
  );
  assert.equal(new Set(auto.map((x) => x.invoiceNumber)).size, 8);
  await http('PUT', `/invoices/${manual.id}`, { invoiceNumber: 'INV-000100' });
  await http('DELETE', `/invoices/${manual.id}`);
  assert.equal((await http('POST', '/invoices/quick', quick())).invoiceNumber, 'INV-000101');
  const numbered = await http('POST', '/invoices/quick', quick({ invoiceNumber: 'INV-000200' }));
  await http('DELETE', `/invoices/${numbered.id}`);
  await http('POST', '/invoices/quick', quick({ invoiceNumber: 'INV-000200' }), 409);
  await http('POST', '/invoices/quick', quick({ invoiceNumber: 'INV-000001' }), 409);
  assert.equal((await http('POST', '/invoices/quick', quick())).invoiceNumber, 'INV-000201');
  const custom = await http(
    'POST',
    '/invoices/quick',
    quick({ invoiceNumber: 'CUSTOM-QUOTE-TEST' }),
  );
  await http('PUT', `/invoices/${custom.id}`, { invoiceNumber: 'RENAMED-QUOTE-TEST' });
  await http('PUT', `/invoices/${custom.id}`, { invoiceNumber: 'CUSTOM-QUOTE-TEST' });
  await http('PUT', `/invoices/${custom.id}`, { invoiceNumber: 'RENAMED-QUOTE-TEST' });
  await http('PUT', `/invoices/${auto[0].id}`, { invoiceNumber: 'CUSTOM-QUOTE-TEST' }, 409);
  await http('DELETE', `/invoices/${custom.id}`);
  await http('POST', '/invoices/quick', quick({ invoiceNumber: 'CUSTOM-QUOTE-TEST' }), 409);
  await http(
    'POST',
    '/invoices/quick',
    quick({ invoiceNumber: 'CUSTOM-QUOTE-TEST' }),
    201,
    otherToken,
  );
  await rejectedSql('DELETE FROM document_numbers WHERE "userId"=$1', [owner]);
  await rejectedSql('UPDATE document_numbers SET "documentId"=$2 WHERE "userId"=$1', [
    owner,
    'different-document',
  ]);
  console.log(
    JSON.stringify({
      passed: true,
      httpRequests: requests,
      checks: [
        'JWT ownership and strict input',
        'account sequences/collision/deletion retention',
        'draft optimistic concurrency and frozen issued snapshots',
        'UTC expiry and lifecycle',
        'concurrent once-only conversion and replay',
        'preserved archived catalog and party snapshots',
        'zero conversion stock/payments',
        'converted draft cancellation and retained source/target',
        'later issue/void stock posting',
        'search/pagination/account isolation',
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
