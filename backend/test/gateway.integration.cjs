// Real HTTP/JWT/Prisma/PostgreSQL with controlled provider facts. Fictional DB only.
const assert = require('node:assert/strict');
const { randomUUID, createHmac } = require('node:crypto');
const connection = process.env.GATEWAY_TEST_DATABASE_URL;
if (
  !connection ||
  !['localhost', '127.0.0.1'].includes(new URL(connection).hostname) ||
  !new URL(connection).pathname.startsWith('/stock_schema_')
)
  throw Error('Explicit disposable stock_schema_* localhost database required.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'gateway-fixture-only';
process.env.RAZORPAY_CREDENTIALS_KEY = Buffer.alloc(32, 17).toString('base64');
const { Test } = require('@nestjs/testing');
const { APP_GUARD } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { JwtAuthGuard } = require('../dist/auth/guards/jwt-auth.guard');
const { RazorpayModule } = require('../dist/razorpay/razorpay.module');
const { RazorpayProvider } = require('../dist/razorpay/razorpay-provider');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { GatewayProviderFixture } = require('./gateway-provider.fixture.cjs');
const provider = new GatewayProviderFixture();
const owner = `gateway-${randomUUID()}`,
  other = `gateway-other-${randomUUID()}`;
let app,
  prisma,
  base,
  token,
  otherToken,
  requests = 0,
  invoiceCount = 0;
async function http(
  method,
  path,
  body,
  status = method === 'POST' ? 201 : 200,
  bearer = token,
  extraHeaders = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  const json = await response.json();
  requests++;
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(json)}`);
  return status < 300 ? json.data : json;
}
const fresh = () => randomUUID();
const newLink = (invoice, mode = 'LIVE', requestId = fresh(), status = 201, bearer = token) =>
  http('POST', '/razorpay/links', { invoiceId: invoice.id, mode, requestId }, status, bearer);
const refresh = async (link) => {
  const before = await prisma.stockAction.count({ where: { userId: owner } });
  const result = await http('POST', `/razorpay/links/${link.id}/refresh`, {}, 200);
  assert.equal(
    await prisma.stockAction.count({ where: { userId: owner } }),
    before,
    'Gateway refresh must not post stock',
  );
  return result;
};
const cancel = (link) => http('POST', `/razorpay/links/${link.id}/cancel`, {}, 200);
const record = (invoice, amount, status = 201) =>
  http(
    'POST',
    `/payments/invoices/${invoice.id}/receipts`,
    { requestId: fresh(), paymentDate: '2026-11-04', amount },
    status,
  );
async function invoice(extra = {}) {
  const row = await http('POST', '/invoices/quick', {
    isQuickInvoice: true,
    invoiceNumber: `GW-${++invoiceCount}`,
    quickCustomerName: 'Fictional buyer',
    currency: 'INR',
    serviceDate: '2026-11-04',
    dueDate: '2026-12-04',
    taxRate: 0,
    lineItems: [
      { type: 'SERVICE', description: 'Design service', unit: 'hour', quantity: 1, rate: 100 },
    ],
    ...extra,
  });
  await http('PATCH', `/invoices/${row.id}/status`, { status: 'SENT' }, 200);
  return row;
}
const summary = (invoice) => http('GET', `/payments/invoices/${invoice.id}`);
async function nativeFails(sql, params = []) {
  await assert.rejects(() => prisma.$executeRawUnsafe(sql, ...params));
}
async function webhook(
  connectionId,
  eventId,
  body,
  secret = 'fixture-webhook-secret-123456',
  status = 200,
) {
  const raw = JSON.stringify(body);
  return http('POST', `/razorpay/webhooks/${connectionId}`, raw, status, null, {
    'x-razorpay-event-id': eventId,
    'x-razorpay-signature': createHmac('sha256', secret).update(raw).digest('hex'),
  });
}
(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({ secret: process.env.JWT_SECRET }),
      RazorpayModule,
      ...['invoice', 'payments', 'inventory', 'catalog', 'customer'].map(
        (name) =>
          require(`../dist/${name}/${name === 'payments' ? 'payment' : name}.module`)[
            `${name === 'payments' ? 'Payment' : name[0].toUpperCase() + name.slice(1)}Module`
          ],
      ),
    ],
    providers: [AuthService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  })
    .overrideProvider(RazorpayProvider)
    .useValue(provider)
    .compile();
  app = module.createNestApplication({ logger: false, rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.useBodyParser('json', { limit: '1mb' });
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
      data: { id, email: `${id}@example.test`, displayName: 'Gateway fixture' },
    });
  token = app.get(JwtService).sign({ sub: owner });
  otherToken = app.get(JwtService).sign({ sub: other });
  const connections = {};
  for (const mode of ['TEST', 'LIVE'])
    connections[mode] = await http('PUT', `/razorpay/connections/${mode}`, {
      keyId: `rzp_${mode.toLowerCase()}_Owner1234`,
      keySecret: 'fictional-secret',
    });
  await http('GET', '/razorpay/links?mode=LIVE', undefined, 401, null);
  await http('GET', '/razorpay/links?mode=WRONG', undefined, 400);
  const testInvoice = await invoice();
  const testLink = await newLink(testInvoice, 'TEST');
  assert.equal(testLink.mode, 'TEST');
  assert.equal(testLink.state, 'ACTIVE');
  assert.ok(testLink.url);
  await record(testInvoice, '25');
  const testBefore = await prisma.invoice.findUnique({ where: { id: testInvoice.id } });
  const testPayment = provider.capture(testLink.providerId, 10000n);
  let view = await refresh(testLink);
  assert.equal(view.payments[0].applied, '0.00');
  assert.equal(view.payments[0].exception, 'TEST_MODE');
  assert.equal((await summary(testInvoice)).amountPaid, '25.00');
  provider.refund(testPayment.id, 3500n);
  view = await refresh(testLink);
  assert.equal(view.payments[0].unapplied, '65.00');
  assert.deepEqual(await prisma.invoice.findUnique({ where: { id: testInvoice.id } }), testBefore);
  const noCash = await invoice();
  const noCashLink = await newLink(noCash, 'TEST');
  provider.capture(noCashLink.providerId, 10000n);
  await refresh(noCashLink);
  await http('PUT', `/invoices/${noCash.id}`, { currency: 'USD' }, 200);
  const billed = await invoice();
  const requestId = fresh();
  const live = await newLink(billed, 'LIVE', requestId);
  const reuseId = fresh();
  assert.equal((await newLink(billed, 'LIVE', requestId)).id, live.id);
  assert.equal((await newLink(billed, 'LIVE', reuseId)).id, live.id);
  await newLink(noCash, 'LIVE', requestId, 409);
  assert.equal((await http('GET', `/invoices/${billed.id}`)).paymentUrl, live.url);
  await http('GET', `/razorpay/links/${live.id}`, undefined, 404, otherToken);
  await http('POST', `/razorpay/links/${live.id}/refresh`, {}, 404, otherToken);
  await http('POST', `/razorpay/links/${live.id}/cancel`, {}, 404, otherToken);
  await http('PUT', `/invoices/${billed.id}`, { notes: 'Detail-only edit' }, 200);
  await http('PUT', `/invoices/${billed.id}`, { shippingAmount: 1 }, 409);
  await record(billed, '1', 409);
  await http('PATCH', `/invoices/${billed.id}/status`, { status: 'VOIDED' }, 409);
  await http('DELETE', '/razorpay/connections/LIVE', undefined, 409);
  await nativeFails('UPDATE invoices SET total=101 WHERE id=$1', [billed.id]);
  const paid = provider.capture(live.providerId, 10000n);
  await Promise.all(Array.from({ length: 6 }, () => refresh(live)));
  assert.equal((await summary(billed)).amountPaid, '100.00');
  assert.equal((await summary(billed)).status, 'PAID');
  assert.equal((await http('GET', `/invoices/${billed.id}`)).paymentUrl, null);
  const source = await prisma.gatewayPayment.findUniqueOrThrow({
    where: { connectionId_providerId: { connectionId: connections.LIVE.id, providerId: paid.id } },
  });
  const applied = await prisma.paymentEntry.findFirstOrThrow({
    where: { gatewayPaymentId: source.id },
  });
  await http(
    'POST',
    `/payments/${applied.id}/reversal`,
    { requestId: fresh(), paymentDate: '2026-11-04', reason: 'Cannot manually reverse gateway' },
    400,
  );
  const pending = provider.refund(paid.id, 2000n, 'pending');
  await refresh(live);
  assert.equal((await summary(billed)).amountPaid, '100.00');
  pending.status = 'failed';
  await refresh(live);
  assert.equal((await summary(billed)).amountPaid, '100.00');
  pending.status = 'processed';
  await refresh(live);
  assert.equal((await summary(billed)).amountPaid, '80.00');
  await refresh(live);
  assert.equal((await summary(billed)).amountPaid, '80.00');
  assert.equal(
    (await newLink(billed, 'LIVE', reuseId)).id,
    live.id,
    'A reused request must replay its original link after refunds',
  );
  await nativeFails('UPDATE gateway_payments SET "receivedMinor"=20000 WHERE id=$1', [source.id]);
  await nativeFails('UPDATE gateway_refunds SET status=\'pending\' WHERE "paymentId"=$1', [
    source.id,
  ]);
  await nativeFails('DELETE FROM gateway_links WHERE id=$1', [live.id]);
  await nativeFails('TRUNCATE gateway_refunds');
  const excessInvoice = await invoice();
  const excessLink = await newLink(excessInvoice);
  await cancel(excessLink);
  await record(excessInvoice, '60');
  const excess = provider.capture(excessLink.providerId, 10000n);
  view = await refresh(excessLink);
  assert.equal(view.payments[0].applied, '40.00');
  assert.equal(view.payments[0].unapplied, '60.00');
  provider.refund(excess.id, 5000n);
  view = await refresh(excessLink);
  assert.equal(view.payments[0].unapplied, '10.00');
  assert.equal((await summary(excessInvoice)).amountPaid, '100.00');
  provider.refund(excess.id, 2000n);
  await refresh(excessLink);
  assert.equal((await summary(excessInvoice)).amountPaid, '90.00');
  assert.equal((await summary(excessInvoice)).status, 'SENT');
  provider.refund(excess.id, 3000n);
  await refresh(excessLink);
  assert.equal((await summary(excessInvoice)).amountPaid, '60.00');
  const refundedFirst = await invoice();
  const refundedLink = await newLink(refundedFirst);
  const prepaidRefund = provider.capture(refundedLink.providerId, 10000n);
  provider.refund(prepaidRefund.id, 5000n);
  await refresh(refundedLink);
  assert.equal((await summary(refundedFirst)).amountPaid, '50.00');
  const cancelledInvoice = await invoice();
  const cancelledLink = await newLink(cancelledInvoice);
  await cancel(cancelledLink);
  await http('PATCH', `/invoices/${cancelledInvoice.id}/status`, { status: 'VOIDED' }, 200);
  const voidBefore = await prisma.invoice.findUnique({ where: { id: cancelledInvoice.id } });
  provider.capture(cancelledLink.providerId, 10000n);
  view = await refresh(cancelledLink);
  assert.equal(view.payments[0].exception, 'INVOICE_VOIDED');
  assert.equal(view.payments[0].applied, '0.00');
  assert.deepEqual(
    await prisma.invoice.findUnique({ where: { id: cancelledInvoice.id } }),
    voidBefore,
  );
  for (const extra of [{ method: 'card' }, { currency: 'USD' }]) {
    const row = await invoice();
    const link = await newLink(row);
    provider.capture(link.providerId, 10000n, extra);
    view = await refresh(link);
    assert.equal(view.payments[0].applied, '0.00');
    assert.equal((await summary(row)).amountPaid, '0.00');
    await http('PUT', `/invoices/${row.id}`, { currency: 'USD' }, 409);
  }
  const captureWait = await invoice();
  const waitLink = await newLink(captureWait);
  const waiting = provider.capture(waitLink.providerId, 10000n, { captured: false });
  view = await refresh(waitLink);
  assert.equal(view.state, 'UNKNOWN');
  assert.equal((await summary(captureWait)).amountPaid, '0.00');
  waiting.captured = true;
  await refresh(waitLink);
  assert.equal((await summary(captureWait)).amountPaid, '100.00');
  const uncertain = await invoice();
  provider.nextCreateFailure = 'uncertain';
  const beforeCreate = provider.created;
  await newLink(uncertain, 'LIVE', fresh(), 503);
  const uncertainRow = await prisma.gatewayLink.findFirstOrThrow({
    where: { invoiceId: uncertain.id },
  });
  assert.equal(uncertainRow.state, 'UNKNOWN');
  const savedFind = provider.findLink.bind(provider);
  provider.findLink = async () => null;
  await http('POST', `/razorpay/links/${uncertainRow.id}/retry`, {}, 400);
  assert.equal(
    (await prisma.gatewayLink.findUniqueOrThrow({ where: { id: uncertainRow.id } })).state,
    'UNKNOWN',
    'Duplicate rejection during reference index lag must keep reservation',
  );
  provider.findLink = savedFind;
  await http('POST', `/razorpay/links/${uncertainRow.id}/retry`, {}, 200);
  assert.equal(provider.created, beforeCreate + 1);
  const concurrent = await invoice();
  let resume, entered;
  provider.pause = new Promise((resolve) => {
    resume = resolve;
  });
  const inProvider = new Promise((resolve) => {
    entered = resolve;
  });
  provider.entered = entered;
  const initial = newLink(concurrent);
  await inProvider;
  const others = await Promise.all(Array.from({ length: 5 }, () => newLink(concurrent)));
  resume();
  const first = await initial;
  provider.pause = null;
  provider.entered = null;
  assert.ok(others.every((row) => row.id === first.id));
  // Native source reconciliation rejects partial writes and ownership changes at commit.
  const rejectedSource = 'native-source-' + fresh();
  await assert.rejects(() =>
    prisma.gatewayPayment.create({
      data: {
        id: rejectedSource,
        userId: owner,
        invoiceId: concurrent.id,
        linkId: first.id,
        connectionId: connections.LIVE.id,
        providerId: 'pay_NativeMissingLedger',
        receivedMinor: 100n,
        appliedMinor: 100n,
        currency: 'INR',
        method: 'upi',
        providerCreatedAt: new Date(),
      },
    }),
  );
  assert.equal(await prisma.gatewayPayment.count({ where: { id: rejectedSource } }), 0);
  await assert.rejects(() =>
    prisma.gatewayPayment.create({
      data: {
        userId: other,
        invoiceId: concurrent.id,
        linkId: first.id,
        connectionId: connections.LIVE.id,
        providerId: 'pay_NativeWrongOwner',
        receivedMinor: 100n,
        appliedMinor: 0n,
        currency: 'INR',
        method: 'upi',
        providerCreatedAt: new Date(),
      },
    }),
  );
  await assert.rejects(() =>
    prisma.gatewayRefund.create({
      data: {
        userId: owner,
        invoiceId: billed.id,
        paymentId: source.id,
        connectionId: connections.LIVE.id,
        providerId: 'rfnd_NativeMissingLedger',
        amountMinor: 100n,
        appliedMinor: 0n,
        status: 'processed',
        providerCreatedAt: new Date(),
      },
    }),
  );
  await http('POST', '/razorpay/connections/LIVE/webhook', {
    secret: 'fixture-webhook-secret-123456',
  });
  const hookInvoice = await invoice();
  const hookLink = await newLink(hookInvoice);
  const stockBeforeHook = await prisma.stockAction.count({ where: { userId: owner } });
  const hookPay = provider.capture(hookLink.providerId, 10000n);
  const body = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: hookPay.id, order_id: `order_Fixture` } } },
  };
  const eventId = fresh();
  await Promise.all(Array.from({ length: 6 }, () => webhook(connections.LIVE.id, eventId, body)));
  assert.equal((await summary(hookInvoice)).amountPaid, '100.00');
  assert.equal(
    await prisma.gatewayWebhookEvent.count({
      where: { connectionId: connections.LIVE.id, providerEventId: eventId },
    }),
    1,
  );
  await webhook(connections.LIVE.id, eventId, { ...body, event: 'refund.created' }, undefined, 409);
  await webhook(connections.LIVE.id, fresh(), body, 'wrong-signature-secret', 401);
  await http('POST', '/razorpay/connections/LIVE/webhook', { secret: 'new-fixture-secret-222222' });
  await http('POST', '/razorpay/connections/LIVE/webhook', {
    secret: 'newest-fixture-secret-333333',
  });
  await webhook(connections.LIVE.id, fresh(), body); // original still accepted within documented retries
  assert.equal(await prisma.stockAction.count({ where: { userId: owner } }), stockBeforeHook);
  await prisma.gatewayWebhookSecret.updateMany({
    where: { connectionId: connections.LIVE.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await webhook(connections.LIVE.id, fresh(), body, undefined, 401);
  await webhook(connections.LIVE.id, fresh(), body, 'newest-fixture-secret-333333');
  const tamperedRaw = JSON.stringify({ ...body, event: 'refund.created' });
  await http('POST', `/razorpay/webhooks/${connections.LIVE.id}`, tamperedRaw, 401, null, {
    'x-razorpay-event-id': fresh(),
    'x-razorpay-signature': createHmac('sha256', 'newest-fixture-secret-333333')
      .update(JSON.stringify(body))
      .digest('hex'),
  });
  await http('POST', '/razorpay/connections/TEST/webhook', {
    secret: 'test-fixture-webhook-secret',
  });
  const crossEvent = fresh();
  await webhook(connections.TEST.id, crossEvent, body, 'test-fixture-webhook-secret');
  assert.equal(
    (
      await prisma.gatewayWebhookEvent.findUniqueOrThrow({
        where: {
          connectionId_providerEventId: {
            connectionId: connections.TEST.id,
            providerEventId: crossEvent,
          },
        },
      })
    ).outcome,
    'IGNORED',
  );
  const hookRefundInvoice = await invoice();
  const hookRefundLink = await newLink(hookRefundInvoice);
  const hookRefundPay = provider.capture(hookRefundLink.providerId, 10000n);
  provider.refund(hookRefundPay.id, 5000n);
  await webhook(
    connections.LIVE.id,
    fresh(),
    {
      event: 'refund.processed',
      payload: { refund: { entity: { payment_id: hookRefundPay.id } } },
    },
    'newest-fixture-secret-333333',
  );
  assert.equal((await summary(hookRefundInvoice)).amountPaid, '50.00');
  // Key rotation must recover an uncertain first link using authenticated reference proof.
  const originalToken = token;
  token = otherToken;
  await http('PUT', '/razorpay/connections/TEST', {
    keyId: 'rzp_test_RecoveryOwner',
    keySecret: 'original-fictional',
  });
  const recoveryInvoice = await invoice({ invoiceNumber: 'RECOVERY-FIRST' });
  provider.nextCreateFailure = 'uncertain';
  await newLink(recoveryInvoice, 'TEST', fresh(), 503);
  const recoveryIntent = await prisma.gatewayLink.findFirstOrThrow({
    where: { invoiceId: recoveryInvoice.id },
  });
  await http(
    'PUT',
    '/razorpay/connections/TEST',
    { keyId: 'rzp_test_UnrelatedMerchant', keySecret: 'unrelated-fictional' },
    409,
  );
  await http('PUT', '/razorpay/connections/TEST', {
    keyId: 'rzp_test_RecoveryOwner',
    keySecret: 'rotated-fictional',
  });
  const recoveredIntent = await http(
    'POST',
    `/razorpay/links/${recoveryIntent.id}/refresh`,
    {},
    200,
  );
  assert.equal(recoveredIntent.state, 'ACTIVE');
  await cancel(recoveredIntent);
  token = originalToken;
  await prisma.user.delete({ where: { id: owner } });
  assert.equal(await prisma.gatewayPayment.count({ where: { userId: owner } }), 0);
  assert.equal(await prisma.gatewayLink.count({ where: { userId: owner } }), 0);
  console.log(
    JSON.stringify({
      passed: true,
      httpRequests: requests,
      checks: [
        'JWT/account/mode isolation',
        'Test never changes real money or stock',
        'Live applied receipts and exact refunds',
        'excess-first refunds',
        'first-seen refunded captures',
        'late void funds',
        'unexpected method/currency retained',
        'manual/price/void guards',
        'uncertain creation and concurrent reuse',
        'capture confirmation',
        'signed raw-body webhook/event replay',
        'secret rotation retry window',
        'native immutability/reconciliation',
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
    if (app) await app.close();
  });
