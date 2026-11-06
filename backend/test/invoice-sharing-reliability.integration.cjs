// Real HTTP/Prisma/PostgreSQL. A one-slot test pool makes contention reproducible.
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const connection = process.env.SHARING_TEST_DATABASE_URL;
if (
  !connection ||
  !['localhost', '127.0.0.1'].includes(new URL(connection).hostname) ||
  !new URL(connection).pathname.startsWith('/stock_schema_')
)
  throw Error('Set SHARING_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.');
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.INVOICE_SHARE_SECRET = Buffer.alloc(32, 29).toString('base64');

const pg = require('pg');
const RealPool = pg.Pool;
const pools = [];
let relationGate;
class OneSlotPool extends RealPool {
  constructor(config) {
    super({ ...config, max: 1, application_name: 'public-read-reliability-fixture' });
    pools.push(this);
  }
  connect(callback) {
    if (callback) return super.connect(callback);
    return super.connect().then((client) => {
      if (!client.reliabilityObserved) {
        client.reliabilityObserved = true;
        const query = client.query.bind(client);
        client.query = (...args) => {
          const sql = typeof args[0] === 'string' ? args[0] : args[0]?.text;
          if (relationGate && sql?.startsWith('SELECT') && sql.includes('"line_items"')) {
            const gate = relationGate;
            relationGate = undefined;
            gate.seen();
            return gate.wait.then(() => query(...args));
          }
          return query(...args);
        };
      }
      return client;
    });
  }
}
// The production PrismaService still chooses its actual timeout/transaction policy.
// Only capacity and the single relation-read barrier are controlled by this fixture.
pg.Pool = OneSlotPool;
const { Test } = require('@nestjs/testing');
const { ConfigModule } = require('@nestjs/config');
const { PrismaService } = require('../dist/database/prisma.service');
const { DatabaseModule } = require('../dist/database/database.module');
const { DashboardModule } = require('../dist/dashboard/dashboard.module');
const { InvoiceSharingModule } = require('../dist/invoice-sharing/invoice-sharing.module');
const { ShareToken } = require('../dist/invoice-sharing/share-token');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const observer = new RealPool({ connectionString: connection, max: 1 });
const owner = `read-reliability-${randomUUID()}`;
const leases = new Set();
const timers = new Set();
const results = {};
let app, prisma, base, capability, releaseRelation;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function hold(pool, ms) {
  const client = await pool.connect();
  leases.add(client);
  if (ms) {
    const timer = setTimeout(() => {
      client.release();
      leases.delete(client);
      timers.delete(timer);
    }, ms);
    timers.add(timer);
  }
  return client;
}
function release(client) {
  client.release();
  leases.delete(client);
}
async function read(status = 200, token = capability) {
  const response = await fetch(`${base}/public/invoice`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await response.json();
  assert.equal(response.status, status, JSON.stringify(json));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  return status === 200 ? json.data : json;
}
(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      DatabaseModule,
      InvoiceSharingModule,
      DashboardModule,
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api/v1`;
  prisma = app.get(PrismaService);
  assert.equal(pools.length, 1, 'The production module graph must share one database client/pool');
  const pool = pools[0];
  await prisma.user.create({
    data: { id: owner, email: `${owner}@example.test`, displayName: 'Private owner' },
  });
  const invoice = await prisma.invoice.create({
    data: {
      userId: owner,
      invoiceNumber: 'CONSISTENT-100',
      serviceDate: new Date(),
      dueDate: new Date(),
      status: 'SENT',
      isQuickInvoice: true,
      quickCompanyName: 'Saved sender',
      quickCustomerName: 'Saved customer',
      subtotal: 100,
      taxRate: 0,
      taxAmount: 0,
      total: 100,
      currency: 'INR',
      lineItems: {
        create: [
          {
            type: 'SERVICE',
            description: 'Saved service',
            unit: 'hour',
            quantity: 1,
            rate: 100,
            amount: 100,
          },
        ],
      },
    },
  });
  const shareId = randomBytes(32).toString('base64url');
  await prisma.invoiceShare.create({ data: { id: shareId, userId: owner, invoiceId: invoice.id } });
  capability = app.get(ShareToken).sign(shareId);
  const snapshot = () =>
    prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { lineItems: true, paymentEntries: true, stockActions: true },
    });
  const before = await snapshot();

  await hold(pool, 2400);
  let start = performance.now();
  const delayed = await read();
  results.delayedReadMs = Math.round(performance.now() - start);
  assert.ok(
    results.delayedReadMs >= 2200,
    'The request did not exercise the former2s failure window',
  );
  assert.equal(delayed.total, 100);

  await hold(pool, 2200);
  start = performance.now();
  const burst = await Promise.all(Array.from({ length: 16 }, () => read()));
  results.concurrentReadMs = Math.round(performance.now() - start);
  assert.ok(
    burst.every((document) => document.total === 100 && document.lineItems[0].amount === 100),
  );
  results.concurrentReads = burst.length;

  const held = await hold(pool);
  start = performance.now();
  await read(404, 'invalid-share');
  results.invalidTokenMs = Math.round(performance.now() - start);
  assert.ok(
    results.invalidTokenMs < 1000,
    'Invalid capabilities must not wait for a database lease',
  );
  start = performance.now();
  const unavailable = await read(503);
  results.unavailableReadMs = Math.round(performance.now() - start);
  assert.ok(results.unavailableReadMs >= 2700 && results.unavailableReadMs < 5000);
  assert.equal(
    unavailable.message,
    'Invoice sharing is temporarily unavailable. Please try again.',
  );
  assert.ok(
    !JSON.stringify(unavailable).match(/P2028|postgres|password|SELECT|Prisma|timeout exceeded/i),
  );
  assert.equal(pool.waitingCount, 0, 'Expired checkouts must leave no queued work');
  release(held);
  await read();
  assert.deepEqual(await snapshot(), before, 'Reads or overload handling changed invoice/history');

  // Pause between reading the invoice and its related lines; commit a legitimate
  // new financial snapshot concurrently. The public response must stay coherent.
  let seen;
  const reached = new Promise((resolve) => {
    seen = resolve;
  });
  const wait = new Promise((resolve) => {
    releaseRelation = resolve;
  });
  relationGate = { seen, wait };
  const reading = read();
  await Promise.race([
    reached,
    delay(2000).then(() => {
      throw Error('Relation barrier was not reached');
    }),
  ]);
  const writer = await observer.connect();
  try {
    await writer.query('BEGIN');
    await writer.query(
      'UPDATE invoices SET subtotal=200,total=200,"updatedAt"=CURRENT_TIMESTAMP WHERE id=$1',
      [invoice.id],
    );
    await writer.query('UPDATE line_items SET quantity=2,amount=200 WHERE "invoiceId"=$1', [
      invoice.id,
    ]);
    await writer.query('COMMIT');
  } catch (error) {
    await writer.query('ROLLBACK');
    throw error;
  } finally {
    writer.release();
  }
  releaseRelation();
  const original = await reading;
  assert.equal(original.total, 100);
  assert.equal(original.lineItems[0].quantity, 1);
  assert.equal(original.lineItems[0].amount, 100);
  const current = await read();
  assert.equal(current.total, 200);
  assert.equal(current.lineItems[0].quantity, 2);
  assert.equal(current.lineItems[0].amount, 200);
  for (const document of [original, current]) {
    const json = JSON.stringify(document);
    assert.ok(!json.includes(owner) && !json.includes(invoice.id));
  }
  await prisma.invoiceShare.delete({ where: { id: shareId } });
  await read(404);
  assert.equal(pool.waitingCount, 0);
  const states = (
    await observer.query(
      "SELECT state FROM pg_stat_activity WHERE application_name='public-read-reliability-fixture' AND datname=current_database()",
    )
  ).rows;
  assert.ok(
    states.length > 0 && states.every((row) => row.state === 'idle'),
    'Connection was returned in an open transaction',
  );
  console.log(
    JSON.stringify({
      passed: true,
      ...results,
      sharedPool: true,
      repeatableReadSnapshot: true,
      historyUnchangedByReads: true,
      unavailableIsBoundedAndSanitized: true,
      queueEmptyAfterFailure: true,
      connectionReturnedIdle: true,
      revokedCapabilityRejected: true,
    }),
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    relationGate = undefined;
    releaseRelation?.();
    for (const timer of timers) clearTimeout(timer);
    for (const lease of leases) lease.release();
    if (prisma) await prisma.user.deleteMany({ where: { id: owner } });
    if (app) await app.close();
    await observer.end();
    pg.Pool = RealPool;
  });
