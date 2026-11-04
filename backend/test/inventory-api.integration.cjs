// Real HTTP/JWT/Prisma/PostgreSQL integration. Never run against a live database.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.INVENTORY_API_TEST_DATABASE_URL;
if (!connection)
  throw new Error(
    'Set INVENTORY_API_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.',
  );
const target = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !target.pathname.startsWith('/stock_schema_')
)
  throw new Error(
    'Inventory API verification requires a disposable stock_schema_* localhost database.',
  );
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
process.env.JWT_SECRET = 'inventory-local-fixture-only';
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { InventoryModule } = require('../dist/inventory/inventory.module');
const { CatalogModule } = require('../dist/catalog/catalog.module');
const { PrismaService } = require('../dist/database/prisma.service');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: connection });
const owner = `stock-api-${randomUUID()}`;
const other = `stock-api-other-${randomUUID()}`;
let app,
  prisma,
  base,
  token,
  otherToken,
  requests = 0;
const input = (quantity = '1.250', extra = {}) => ({
  requestId: randomUUID(),
  reason: 'Current stock count',
  effectiveDate: '2026-11-03',
  quantity,
  unit: 'kg',
  ...extra,
});
async function http(method, path, body, expected = method === 'POST' ? 201 : 200, bearer = token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json();
  requests++;
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  return expected < 300 ? json.data : json;
}
const post = (id, operation, body, status = 201, bearer = token) =>
  http('POST', `/inventory/products/${id}/${operation}`, body, status, bearer);
const balance = async (id) => (await http('GET', `/inventory/products/${id}/balance`)).quantity;
async function product(name, extra = {}, userId = owner) {
  return prisma.catalogItem.create({
    data: { userId, name, type: 'PRODUCT', unit: 'kg', rate: 1, currency: 'INR', ...extra },
  });
}

(async () => {
  app = await NestFactory.create(
    {
      module: class InventoryTestApp {},
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: process.env.JWT_SECRET }),
        InventoryModule,
        CatalogModule,
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
  await pool.query(
    "SELECT setval(pg_get_serial_sequence('stock_actions','sequence'),9007199254740992)",
  );
  const item = await product('Cable');
  const foreign = await product('Other owner', {}, other);
  const service = await product('Consultation', { type: 'SERVICE' });
  const archived = await product('Retired', { isArchived: true });
  await http('GET', '/inventory/products', undefined, 401, null);
  await post(item.id, 'opening', input(), 401, null);
  await post(item.id, 'opening', input(), 404, otherToken);
  await http('GET', `/inventory/products/${item.id}/balance`, undefined, 404, otherToken);
  await http('GET', `/inventory/history?catalogItemId=${item.id}`, undefined, 404, otherToken);
  await post(service.id, 'opening', input(), 400);
  await post(archived.id, 'opening', input(), 409);
  await post(item.id, 'adjustments', input('1', { direction: 'IN' }), 409);
  await post(item.id, 'opening', input('1', { unit: 'box' }), 409);
  for (const fields of [
    { quantity: 1.25 },
    { quantity: '1.0000' },
    { quantity: '-1' },
    { quantity: '1e3' },
    { quantity: '1000000000000000' },
    { effectiveDate: '2026-02-29' },
    { reason: false },
    { unknown: true },
  ])
    await post(item.id, 'opening', { ...input(), ...fields }, 400);
  await http('GET', '/inventory/products?limit=101', undefined, 400);
  await http('GET', '/inventory/history?kind=BOGUS', undefined, 400);
  const zero = input('0');
  const opened = await post(item.id, 'opening', zero);
  assert.equal(opened.replayed, false);
  assert.equal(opened.action.movements[0].quantityDelta, '0.000');
  assert.ok(BigInt(opened.action.sequence) > BigInt(Number.MAX_SAFE_INTEGER));
  assert.equal(typeof opened.action.sequence, 'string');
  assert.ok(!('requestHash' in opened.action));
  assert.equal(await balance(item.id), '0.000');
  const replay = await post(item.id, 'opening', {
    ...zero,
    quantity: '000.000',
    reason: ` ${zero.reason} `,
  });
  assert.equal(replay.action.id, opened.action.id);
  assert.equal(replay.replayed, true);
  await post(item.id, 'opening', { ...zero, quantity: '1' }, 409);
  await post(item.id, 'opening', input(), 409);
  await http('PUT', `/catalog/${item.id}`, { unit: 'box' }, 400);
  await http('PUT', `/catalog/${item.id}`, { type: 'SERVICE' }, 400);
  const stockIn = input('0.300', { direction: 'IN' });
  const added = await post(item.id, 'adjustments', stockIn);
  await post(item.id, 'adjustments', { ...stockIn, direction: 'OUT' }, 409);
  await post(item.id, 'adjustments', input('0', { direction: 'OUT' }), 400);
  const removed = await post(item.id, 'adjustments', input('0.100', { direction: 'OUT' }));
  await post(item.id, 'adjustments', input('0.200', { direction: 'OUT' }));
  assert.equal(await balance(item.id), '0.000');
  await http('POST', `/inventory/adjustments/${removed.action.id}/reversal`, {
    requestId: randomUUID(),
    reason: 'Return the removed quantity',
    effectiveDate: '2026-11-03',
  });
  assert.equal(await balance(item.id), '0.100');
  await post(item.id, 'adjustments', input('0.100', { direction: 'OUT' }));
  const beforeFailure = await prisma.stockAction.count({ where: { userId: owner } });
  const shortage = await post(item.id, 'adjustments', input('0.001', { direction: 'OUT' }), 409);
  assert.equal(shortage.details.available, '0.000');
  assert.equal(await prisma.stockAction.count({ where: { userId: owner } }), beforeFailure);
  assert.equal((await post(item.id, 'adjustments', stockIn)).action.id, added.action.id);
  assert.equal(await balance(item.id), '0.000'); // Retry never restores the already-consumed stock.
  const addBack = await post(item.id, 'adjustments', input('2.500', { direction: 'IN' }));
  const reversalRequest = {
    requestId: randomUUID(),
    reason: 'Correction',
    effectiveDate: '2026-11-02',
  };
  const reversalPath = `/inventory/adjustments/${addBack.action.id}/reversal`;
  const reversed = await http('POST', reversalPath, reversalRequest);
  assert.equal(reversed.action.movements[0].quantityDelta, '-2.500');
  assert.equal(reversed.action.reversalOfId, addBack.action.id);
  assert.equal(await balance(item.id), '0.000');
  assert.equal((await http('POST', reversalPath, reversalRequest)).replayed, true);
  await http('POST', reversalPath, { ...reversalRequest, requestId: randomUUID() }, 409);
  await http('POST', reversalPath, reversalRequest, 404, otherToken);
  await http('POST', `/inventory/adjustments/${reversed.action.id}/reversal`, reversalRequest, 400);
  await http('POST', `/inventory/adjustments/${opened.action.id}/reversal`, reversalRequest, 400);
  await http(
    'POST',
    `/inventory/adjustments/${added.action.id}/reversal`,
    { ...reversalRequest, requestId: randomUUID() },
    409,
  ); // Its stock was consumed.
  await http('PUT', `/catalog/${item.id}`, { isArchived: true });
  await post(item.id, 'adjustments', input('1', { direction: 'IN' }));
  assert.equal((await http('GET', '/inventory/products')).total, 0);
  assert.equal(
    (await http('GET', '/inventory/products?status=archived')).data[0].quantity,
    '1.000',
  );
  await post(foreign.id, 'opening', input('3', { requestId: zero.requestId }), 201, otherToken);
  assert.equal((await http('GET', '/inventory/products', undefined, 200, otherToken)).total, 1);
  assert.equal((await http('GET', '/inventory/history', undefined, 200, otherToken)).total, 1);
  // Catalog pickers filter tracking state before pagination, including zero openings.
  const trackedCatalog = await http(
    'GET',
    '/catalog?type=PRODUCT&status=all&tracking=tracked&limit=1',
  );
  assert.equal(trackedCatalog.total, 1);
  assert.equal(trackedCatalog.data[0].id, item.id);
  assert.ok(trackedCatalog.data[0].stockTrackingStartedAt);
  const untrackedCatalog = await http('GET', '/catalog?type=PRODUCT&tracking=untracked&limit=1');
  assert.equal(untrackedCatalog.total, 0); // Other owner's untracked/archived items and services are excluded.
  for (const name of ['Picker A', 'Picker B', 'Picker C']) await product(name);
  const pickerPage = await http(
    'GET',
    '/catalog?type=PRODUCT&tracking=untracked&search=Picker&limit=1&page=2',
  );
  assert.equal(pickerPage.total, 3);
  assert.equal(pickerPage.data[0].name, 'Picker B');
  assert.equal(pickerPage.hasNext, true);
  assert.equal(pickerPage.hasPrev, true);
  const otherCatalog = await http(
    'GET',
    '/catalog?type=PRODUCT&tracking=tracked&status=all',
    undefined,
    200,
    otherToken,
  );
  assert.equal(otherCatalog.total, 1);
  assert.equal(otherCatalog.data[0].id, foreign.id);
  await http('GET', '/catalog?tracking=unknown', undefined, 400);
  const history = await http('GET', `/inventory/history?catalogItemId=${item.id}&limit=2`);
  assert.equal(history.data.length, 2);
  assert.equal(history.hasNext, true);
  assert.ok(BigInt(history.data[0].sequence) > BigInt(history.data[1].sequence));
  assert.equal(
    (await http('GET', `/inventory/history?catalogItemId=${item.id}&kind=OPENING`)).total,
    1,
  );
  const maximum = await product('Maximum');
  await post(maximum.id, 'opening', input('999999999999999.999'));
  await post(maximum.id, 'adjustments', input('0.001', { direction: 'IN' }), 409);
  assert.equal(await balance(maximum.id), '999999999999999.999');

  // Real concurrent requests share product locks: ten withdrawals succeed, ten fail with shortage.
  const racing = await product('Concurrent');
  await post(racing.id, 'opening', input('10'));
  const withdrawals = await Promise.all(
    Array.from({ length: 20 }, async () => {
      const response = await fetch(`${base}/inventory/products/${racing.id}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input('1', { direction: 'OUT' })),
      });
      requests++;
      return response.status;
    }),
  );
  assert.equal(withdrawals.filter((s) => s === 201).length, 10);
  assert.equal(withdrawals.filter((s) => s === 409).length, 10);
  assert.equal(await balance(racing.id), '0.000');
  assert.equal(await prisma.stockAction.count({ where: { catalogItemId: racing.id } }), 11);
  const same = input('1.250', { direction: 'IN' });
  const repeats = await Promise.all(
    Array.from({ length: 8 }, () => post(racing.id, 'adjustments', same)),
  );
  assert.equal(new Set(repeats.map((r) => r.action.id)).size, 1);
  assert.equal(repeats.filter((r) => !r.replayed).length, 1);
  assert.equal(await balance(racing.id), '1.250');
  const duplicateOpening = await product('Opening race');
  const openings = await Promise.all(
    [input('1'), input('2')].map(async (body) => {
      const response = await fetch(`${base}/inventory/products/${duplicateOpening.id}/opening`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      requests++;
      return response.status;
    }),
  );
  assert.deepEqual(openings.sort(), [201, 409]);
  assert.equal(
    await prisma.stockAction.count({ where: { catalogItemId: duplicateOpening.id } }),
    1,
  );
  const distinct = await Promise.all(
    Array.from({ length: 8 }, (_, n) => product(`Global key race ${n}`)),
  );
  const shared = input('1');
  const globalRace = await Promise.all(
    distinct.map(async (p) => {
      const response = await fetch(`${base}/inventory/products/${p.id}/opening`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(shared),
      });
      requests++;
      return response.status;
    }),
  );
  assert.equal(globalRace.filter((s) => s === 201).length, 1);
  assert.equal(globalRace.filter((s) => s === 409).length, 7);
  assert.equal(
    await prisma.catalogItem.count({
      where: { id: { in: distinct.map((p) => p.id) }, stockTrackingStartedAt: { not: null } },
    }),
    1,
  );
  console.log(
    JSON.stringify({
      passed: true,
      httpRequests: requests,
      checks: [
        'real JWT isolation',
        'strict DTOs',
        'exact decimal arithmetic and bounds',
        'immutable zero opening and unit identity',
        'retries and conflict rollback',
        'manual reversal and shortage',
        'archive and history filters',
        'BigInt serialization',
        'concurrent shortage/retry/opening/global-key races',
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
