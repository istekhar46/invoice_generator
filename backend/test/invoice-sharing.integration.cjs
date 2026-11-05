// Real HTTP/JWT/Prisma/PostgreSQL; the existing controlled gateway fixture never contacts Razorpay.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.SHARING_TEST_DATABASE_URL;
if (
  !connection ||
  !['localhost', '127.0.0.1'].includes(new URL(connection).hostname) ||
  !new URL(connection).pathname.startsWith('/stock_schema_')
)
  throw Error('Set SHARING_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'sharing-account-fixture';
process.env.INVOICE_SHARE_SECRET = Buffer.alloc(32, 19).toString('base64');
process.env.RAZORPAY_CREDENTIALS_KEY = Buffer.alloc(32, 20).toString('base64');
const { Test } = require('@nestjs/testing');
const { APP_GUARD } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/guards/jwt-auth.guard');
const { InvoiceModule } = require('../dist/invoice/invoice.module');
const { InvoiceSharingModule } = require('../dist/invoice-sharing/invoice-sharing.module');
const { InvoiceSharingService } = require('../dist/invoice-sharing/invoice-sharing.service');
const { ShareToken } = require('../dist/invoice-sharing/share-token');
const { PaymentModule } = require('../dist/payments/payment.module');
const { RazorpayModule } = require('../dist/razorpay/razorpay.module');
const { RazorpayProvider } = require('../dist/razorpay/razorpay-provider');
const { GatewayProviderFixture } = require('./gateway-provider.fixture.cjs');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const provider = new GatewayProviderFixture();
const owner = `share-${randomUUID()}`,
  other = `share-other-${randomUUID()}`;
let app,
  prisma,
  base,
  token,
  foreign,
  requests = 0;
async function http(method, path, body, status = method === 'POST' ? 201 : 200, bearer = token) {
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
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(json)}`);
  if (path.includes('/share') || (path === '/public/invoice' && method === 'GET')) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  }
  return status < 300 ? json?.data : json;
}
const share = (invoice, bearer = token) =>
  http('POST', `/invoices/${invoice.id}/share`, { createIfMissing: true }, 200, bearer);
const read = (capability, status = 200) =>
  http('GET', '/public/invoice', undefined, status, capability);
const summary = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: true, paymentEntries: true, stockActions: true, gatewayLinks: true },
  });
const today = new Date().toISOString().slice(0, 10);
async function invoice(extra = {}) {
  return http('POST', '/invoices/quick', {
    isQuickInvoice: true,
    clientRequestId: randomUUID(),
    quickCompanyName: 'Saved public sender',
    quickCustomerName: 'Saved public customer',
    currency: 'INR',
    serviceDate: today,
    dueDate: today,
    taxRate: 0,
    lineItems: [
      { type: 'SERVICE', description: 'Public service', unit: 'hour', quantity: 2, rate: 50 },
    ],
    ...extra,
  });
}
(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({ secret: process.env.JWT_SECRET }),
      InvoiceModule,
      InvoiceSharingModule,
      PaymentModule,
      RazorpayModule,
    ],
    providers: [AuthService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  })
    .overrideProvider(RazorpayProvider)
    .useValue(provider)
    .compile();
  app = module.createNestApplication({ logger: false });
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
      data: {
        id,
        email: `${id}@private-account.example.test`,
        displayName: 'Private account name',
      },
    });
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  token = jwt.sign({ sub: owner });
  foreign = jwt.sign({ sub: other });
  const draft = await invoice();
  await http('GET', `/invoices/${draft.id}/share`, undefined, 401, null);
  await http('GET', `/invoices/${draft.id}/share`, undefined, 404, foreign);
  await http('POST', `/invoices/${draft.id}/share`, { createIfMissing: true }, 404, foreign);
  await http('DELETE', `/invoices/${draft.id}/share`, undefined, 404, foreign);
  assert.equal((await http('GET', `/invoices/${draft.id}/share`)).canCreate, false);
  for (const body of [undefined, {}, { createIfMissing: 'false' }, { createIfMissing: 1 }])
    await http('POST', `/invoices/${draft.id}/share`, body, 400);
  await http('POST', `/invoices/${draft.id}/share`, { createIfMissing: true }, 409);
  assert.equal(await prisma.invoiceShare.count({ where: { invoiceId: draft.id } }), 0);
  await http('PATCH', `/invoices/${draft.id}/status`, { status: 'SENT' }, 200);
  const before = await summary(draft.id);
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => share(draft)));
  assert.equal(new Set(concurrent.map((x) => x.token)).size, 1);
  let capability = concurrent[0].token;
  assert.equal((await share(draft)).token, capability);
  const stored = await prisma.invoiceShare.findFirstOrThrow({ where: { invoiceId: draft.id } });
  assert.ok(!JSON.stringify(stored).includes(capability));
  let document = await read(capability);
  assert.equal(document.documentId, stored.id);
  assert.equal(document.invoiceNumber, draft.invoiceNumber);
  assert.equal(document.company.businessName, 'Saved public sender');
  assert.equal(document.customer.name, 'Saved public customer');
  const serialized = JSON.stringify(document);
  for (const value of [
    owner,
    other,
    draft.id,
    draft.clientRequestId,
    'private-account.example.test',
    'Private account name',
  ])
    if (value) assert.ok(!serialized.includes(value), `Private value leaked: ${value}`);
  for (const field of [
    'id',
    'userId',
    'customerId',
    'sourceQuote',
    'sourceQuoteId',
    'hasPaymentHistory',
    'clientRequestId',
    'gatewayLinks',
    'paymentEntries',
    'stockActions',
  ])
    assert.ok(!(field in document), `Private field leaked: ${field}`);
  assert.deepEqual(Object.keys(document.lineItems[0]).sort(), [
    'amount',
    'description',
    'quantity',
    'rate',
    'type',
    'unit',
  ]);
  const contact = {
    address: '1 Public Road',
    city: 'Kolkata',
    state: 'West Bengal',
    zipCode: '700001',
    email: 'public-contact@example.test',
    phone: '9000000000',
  };
  const company = await prisma.companyProfile.create({
    data: {
      ...contact,
      userId: owner,
      businessName: 'Standard public business',
      taxNumber: 'PUBLIC-TAX',
      defaultTaxRate: 0,
      defaultLaborRate: 0,
    },
  });
  const customer = await prisma.customer.create({
    data: { ...contact, userId: owner, name: 'Standard public buyer' },
  });
  const catalog = await prisma.catalogItem.create({
    data: {
      userId: owner,
      type: 'SERVICE',
      name: 'Private catalog name',
      unit: 'hour',
      rate: 25,
      currency: 'USD',
    },
  });
  const standard = await http('POST', '/invoices', {
    customerId: customer.id,
    currency: 'USD',
    serviceDate: today,
    dueDate: today,
    taxRate: 0,
    lineItems: [
      {
        catalogItemId: catalog.id,
        type: 'SERVICE',
        description: 'Saved customer-facing service',
        quantity: 1,
        rate: 25,
        unit: 'hour',
      },
    ],
  });
  await http('PATCH', `/invoices/${standard.id}/status`, { status: 'SENT' }, 200);
  const standardShare = await share(standard);
  const standardDocument = await read(standardShare.token);
  assert.equal(standardDocument.company.businessName, 'Standard public business');
  assert.equal(standardDocument.company.logoUrl, '');
  assert.equal(standardDocument.customer.name, 'Standard public buyer');
  assert.equal(standardDocument.paymentUrl, null);
  for (const value of [
    standard.id,
    owner,
    customer.id,
    company.id,
    catalog.id,
    'Private catalog name',
  ])
    assert.ok(
      !JSON.stringify(standardDocument).includes(value),
      'Private standard-document field leaked',
    );
  await prisma.companyProfile.update({
    where: { id: company.id },
    data: { businessName: 'Updated standard business' },
  });
  assert.equal((await read(standardShare.token)).company.businessName, 'Updated standard business');
  assert.equal(
    (await read(capability)).company.businessName,
    'Saved public sender',
    'Quick snapshot must not follow profile edits',
  );
  for (let i = 0; i < 5; i++) await read(capability);
  assert.deepEqual(
    await summary(draft.id),
    before,
    'Sharing and repeated public reads must not mutate invoice/payment/stock',
  );
  for (const bad of [null, 'wrong', token, capability.slice(0, -5) + 'XXXXX']) await read(bad, 404);
  await http('GET', `/invoices/${draft.id}`, undefined, 401, capability);
  await http('POST', '/public/invoice', {}, 404, capability);
  await http('PUT', `/invoices/${draft.id}`, { notes: 'Updated visible notes' }, 200);
  assert.equal((await read(capability)).notes, 'Updated visible notes');
  await http('POST', `/payments/invoices/${draft.id}/receipts`, {
    requestId: randomUUID(),
    paymentDate: today,
    amount: '40.00',
  });
  assert.equal((await read(capability)).amountPaid, 40);
  // Direct UPI preferences and invoice receiving snapshots are independent of the ledger.
  const upi = { upiId: 'demo.shop@bank', payeeName: 'Demo & Store' };
  const upiPath = `/payments/upi/invoices/${draft.id}`;
  await http('GET', '/payments/upi/preferences', undefined, 401, null);
  assert.equal(await http('GET', '/payments/upi/preferences'), null);
  for (const invalid of [
    { upiId: 'upi://pay?pa=demo@bank' },
    { upiId: 'demo@bank&am=1' },
    { upiId: 'demo@bank@other' },
    { upiId: 1 },
    { payeeName: 12 },
    { payeeName: '' },
    { payeeName: 'Hidden\u202ename' },
    { userId: other },
    { reference: 'injected' },
  ])
    await http('PUT', '/payments/upi/preferences', { ...upi, ...invalid }, 400);
  assert.deepEqual(
    await http('PUT', '/payments/upi/preferences', {
      upiId: ` ${upi.upiId} `,
      payeeName: ` ${upi.payeeName} `,
    }),
    upi,
  );
  assert.equal(await http('GET', '/payments/upi/preferences', undefined, 200, foreign), null);
  await http('PUT', upiPath, upi, 404, foreign);
  await http('DELETE', upiPath, undefined, 404, foreign);
  const ineligibleUpi = await invoice();
  await http('PUT', `/payments/upi/invoices/${ineligibleUpi.id}`, upi, 409);
  const nonInrUpi = await invoice({ currency: 'USD' });
  await http('PATCH', `/invoices/${nonInrUpi.id}/status`, { status: 'SENT' }, 200);
  await http('PUT', `/payments/upi/invoices/${nonInrUpi.id}`, upi, 409);
  const unchangedBeforeUpi = await summary(draft.id);
  const direct = await http('PUT', upiPath, upi);
  assert.deepEqual({ upiId: direct.upiId, payeeName: direct.payeeName }, upi);
  assert.match(direct.reference, /^[a-f0-9]{32}$/);
  assert.deepEqual(
    await http('PUT', upiPath, upi),
    direct,
    'Retries preserve the invoice reference',
  );
  const unchangedAfterUpi = await summary(draft.id);
  for (const key of [
    'subtotal',
    'taxRate',
    'taxAmount',
    'total',
    'amountPaid',
    'status',
    'currency',
    'lineItems',
    'paymentEntries',
    'stockActions',
  ])
    assert.deepEqual(
      unchangedAfterUpi[key],
      unchangedBeforeUpi[key],
      `UPI configuration changed ${key}`,
    );
  assert.deepEqual((await http('GET', `/invoices/${draft.id}`)).directUpi, direct);
  assert.deepEqual(
    (await http('GET', '/invoices')).data.find((row) => row.id === draft.id).directUpi,
    direct,
  );
  const changedUpi = { upiId: 'new.receiving@bank', payeeName: 'New receiving details' };
  await http('PUT', '/payments/upi/preferences', changedUpi);
  assert.deepEqual(
    (await read(capability)).directUpi,
    direct,
    'Public view must retain the invoice payee',
  );
  assert.equal((await read(capability)).paymentUrl, null);
  await http('PUT', upiPath, changedUpi, 409);
  await http('DELETE', '/payments/upi/preferences');
  assert.deepEqual((await http('GET', `/invoices/${draft.id}`)).directUpi, direct);
  await http('DELETE', upiPath);
  await http('PATCH', `/invoices/${ineligibleUpi.id}/status`, { status: 'SENT' }, 200);
  await http('PUT', `/payments/upi/invoices/${ineligibleUpi.id}`, upi, 409);
  await http('PUT', '/payments/upi/preferences', changedUpi);
  await http('PUT', `/payments/upi/invoices/${ineligibleUpi.id}`, upi, 409, token);
  await http('PUT', '/payments/upi/preferences', upi);
  await http('PUT', upiPath, upi);
  for (const mode of ['TEST', 'LIVE'])
    await http('PUT', `/razorpay/connections/${mode}`, {
      keyId: `rzp_${mode.toLowerCase()}_ShareFixture`,
      keySecret: 'fictional-only',
    });
  const beforeBlockedLink = provider.created;
  await http(
    'POST',
    '/razorpay/links',
    { invoiceId: draft.id, mode: 'LIVE', requestId: randomUUID() },
    409,
  );
  assert.equal(
    provider.created,
    beforeBlockedLink,
    'Blocked route must not call/create a provider link',
  );
  // Simulated links stay isolated from the invoice collection route and paid balance.
  await http('POST', '/razorpay/links', {
    invoiceId: draft.id,
    mode: 'TEST',
    requestId: randomUUID(),
  });
  assert.deepEqual((await read(capability)).directUpi.upiId, upi.upiId);
  await http('DELETE', upiPath);
  assert.equal((await read(capability)).directUpi, null);

  // Invoice locking makes concurrent route selection exclusive.
  const routeRace = await invoice();
  await http('PATCH', `/invoices/${routeRace.id}/status`, { status: 'SENT' }, 200);
  const beforeRouteRace = await summary(routeRace.id);
  const raceResponses = await Promise.all([
    fetch(`${base}/payments/upi/invoices/${routeRace.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(upi),
    }),
    fetch(`${base}/razorpay/links`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: routeRace.id, mode: 'LIVE', requestId: randomUUID() }),
    }),
  ]);
  requests += 2;
  assert.equal(raceResponses.filter((response) => response.ok).length, 1);
  assert.equal(raceResponses.filter((response) => response.status === 409).length, 1);
  const racedInvoice = await summary(routeRace.id);
  const activeRaceLinks = racedInvoice.gatewayLinks.filter(
    (link) => link.mode === 'LIVE' && link.activeKey,
  );
  assert.equal(Number(!!racedInvoice.directUpiReference) + activeRaceLinks.length, 1);
  assert.equal(racedInvoice.amountPaid, 0);
  assert.deepEqual(racedInvoice.stockActions, beforeRouteRace.stockActions);
  const live = await http('POST', '/razorpay/links', {
    invoiceId: draft.id,
    mode: 'LIVE',
    requestId: randomUUID(),
  });
  await http('PUT', upiPath, upi, 409);
  const providerBefore = provider.created;
  document = await read(capability);
  assert.equal(document.paymentUrl, live.url);
  assert.equal(document.total - document.amountPaid, 60);
  await read(capability);
  assert.equal(
    provider.created,
    providerBefore,
    'Public read must not contact/create a payment provider source',
  );
  await http('POST', `/razorpay/links/${live.id}/cancel`, undefined, 200);
  assert.equal((await read(capability)).paymentUrl, null);
  const uncertainInvoice = await invoice();
  await http('PATCH', `/invoices/${uncertainInvoice.id}/status`, { status: 'SENT' }, 200);
  provider.nextCreateFailure = 'uncertain';
  await http(
    'POST',
    '/razorpay/links',
    { invoiceId: uncertainInvoice.id, mode: 'LIVE', requestId: randomUUID() },
    503,
  );
  const uncertainLink = await prisma.gatewayLink.findFirstOrThrow({
    where: { userId: owner, invoiceId: uncertainInvoice.id, mode: 'LIVE' },
  });
  assert.equal(uncertainLink.state, 'UNKNOWN');
  await http('PUT', `/payments/upi/invoices/${uncertainInvoice.id}`, upi, 409);
  await http('POST', `/razorpay/links/${uncertainLink.id}/cancel`, undefined, 200);
  await http('POST', '/razorpay/links', {
    invoiceId: draft.id,
    mode: 'TEST',
    requestId: randomUUID(),
  });
  assert.equal((await read(capability)).paymentUrl, null, 'Test checkout must never be public');
  const retainedPaidUpi = await http('PUT', upiPath, upi);
  await http('POST', `/payments/invoices/${draft.id}/receipts`, {
    requestId: randomUUID(),
    paymentDate: today,
    amount: '60.00',
  });
  document = await read(capability);
  assert.equal(document.status, 'PAID');
  assert.equal(document.amountPaid, 100);
  assert.equal(document.paymentUrl, null);
  assert.equal(document.directUpi, null, 'Paid public documents have no direct UPI instructions');
  assert.deepEqual((await http('GET', `/invoices/${draft.id}`)).directUpi, retainedPaidUpi);
  await http('PUT', upiPath, upi, 409);
  await http('DELETE', upiPath);
  assert.equal(document.directUpi, null);
  await http('DELETE', `/invoices/${draft.id}/share`, undefined, 204);
  await read(capability, 404);
  await http('POST', `/invoices/${draft.id}/share`, { createIfMissing: false }, 409);
  assert.equal(
    await prisma.invoiceShare.count({ where: { invoiceId: draft.id } }),
    0,
    'Stale copy must not reactivate a revoked link',
  );
  const renewed = await share(draft);
  assert.notEqual(renewed.token, capability);
  capability = renewed.token;
  assert.equal((await read(capability)).status, 'PAID');
  const unpaid = await invoice();
  await http('PATCH', `/invoices/${unpaid.id}/status`, { status: 'SENT' }, 200);
  const unpaidShare = await share(unpaid);
  await http('PUT', `/payments/upi/invoices/${unpaid.id}`, upi);
  await http('PATCH', `/invoices/${unpaid.id}/status`, { status: 'VOIDED' }, 200);
  document = await read(unpaidShare.token);
  assert.equal(document.status, 'VOIDED');
  assert.equal(document.paymentUrl, null);
  assert.equal(document.directUpi, null, 'Voided public documents have no direct UPI instructions');
  assert.equal(
    (await share(unpaid)).token,
    unpaidShare.token,
    'Existing voided share remains copyable',
  );
  await http('DELETE', `/invoices/${unpaid.id}/share`, undefined, 204);
  await http('POST', `/invoices/${unpaid.id}/share`, { createIfMissing: true }, 409);
  const missing = new InvoiceSharingService(
    prisma,
    new ShareToken(new ConfigService({ INVOICE_SHARE_SECRET: '' }), new JwtService()),
  );
  assert.equal((await missing.status(owner, draft.id)).available, false);
  await assert.rejects(missing.create(owner, draft.id, true), (e) => e.getStatus() === 503);
  await missing.revoke(owner, draft.id);
  await read(capability, 404);
  const legacy = { id: 'sharing-legacy-invoice' };
  const legacyOwner = jwt.sign({ sub: 'sharing-legacy' });
  let legacyChecked = false;
  if (await prisma.invoice.findUnique({ where: { id: legacy.id } })) {
    const old = await share(legacy, legacyOwner);
    const oldDoc = await read(old.token);
    assert.equal(oldDoc.total, 0.67);
    assert.deepEqual(
      oldDoc.lineItems.map((row) => row.amount),
      [0.335, 0.335],
    );
    legacyChecked = true;
    await http('DELETE', `/invoices/${legacy.id}/share`, undefined, 204, legacyOwner);
  }
  const raceResults = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      index % 3 === 0
        ? http('DELETE', `/invoices/${draft.id}/share`, undefined, 204)
        : share(draft),
    ),
  );
  const current = await prisma.invoiceShare.findFirst({ where: { invoiceId: draft.id } });
  const signer = app.get(ShareToken);
  for (const value of raceResults.filter(Boolean))
    await read(value.token, signer.read(value.token) === current?.id ? 200 : 404);
  const final = await share(draft);
  await prisma.user.delete({ where: { id: owner } });
  await read(final.token, 404);
  assert.equal(await prisma.invoiceShare.count({ where: { userId: owner } }), 0);
  console.log(
    JSON.stringify({
      passed: true,
      requests,
      concurrentCopies: 8,
      revocationRaceOperations: 8,
      accountIsolation: true,
      restrictedProjection: true,
      paidVoidAndTestIsolation: true,
      readSideEffects: false,
      legacySnapshotPreserved: legacyChecked,
      directUpiSnapshotsAndPreferenceIsolation: true,
      exclusiveConcurrentCollectionRoute: true,
      unknownLinkBlocksDirectUpi: true,
      provider: 'controlled fixture only',
    }),
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
    if (app) await app.close();
  });
