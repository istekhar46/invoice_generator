// Explicit disposable localhost database only; no live migration is run by this test.
// --seed-before: catalog schema, empty fixture DB, writes the preservation snapshot.
// --verify-upgrade: apply the psql upgrade first, then verify snapshot + constraints.
// --verify: freshly pushed schema + shared inventory invariants.
// --verify-rollback: catalog schema after a deliberately failed local upgrade.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { Pool } = require('pg');
const connection = process.env.INVENTORY_SCHEMA_TEST_DATABASE_URL;
if (!connection)
  throw new Error(
    'Set INVENTORY_SCHEMA_TEST_DATABASE_URL to a disposable stock_schema_* localhost database.',
  );
const url = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !url.pathname.startsWith('/stock_schema_')
) {
  throw new Error('Inventory schema tests require a disposable stock_schema_* localhost database.');
}
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
const pool = new Pool({ connectionString: connection });
const snapshotFile = process.env.INVENTORY_SCHEMA_SNAPSHOT_FILE;
const tables = [
  'users',
  'company_profiles',
  'customers',
  'invoices',
  'line_items',
  'refresh_tokens',
  'invoice_defaults',
  'catalog_items',
];
let prisma;
async function snapshot() {
  const result = {};
  for (const table of tables) {
    const key = table === 'invoice_defaults' ? 'userId' : 'id';
    result[table] = JSON.parse(
      JSON.stringify((await pool.query(`SELECT * FROM "${table}" ORDER BY "${key}"`)).rows),
    );
  }
  return result;
}
async function verifyPreservation() {
  assert.ok(snapshotFile, 'Set INVENTORY_SCHEMA_SNAPSHOT_FILE for upgrade preservation.');
  const before = JSON.parse(readFileSync(snapshotFile, 'utf8'));
  const after = await snapshot();
  for (const row of after.invoices) {
    assert.equal(row.issuedAt, null);
    delete row.issuedAt;
  }
  for (const row of after.catalog_items) {
    assert.equal(row.stockTrackingStartedAt, null);
    delete row.stockTrackingStartedAt;
  }
  assert.deepEqual(
    after,
    before,
    'Original catalog/invoice/customer/profile/default/auth fields changed.',
  );
}
async function seedBefore() {
  assert.ok(snapshotFile, 'Set INVENTORY_SCHEMA_SNAPSHOT_FILE for the fictional before snapshot.');
  assert.ok(
    Object.values(await snapshot()).every((rows) => rows.length === 0),
    'Seed-before requires an empty disposable database.',
  );
  const owner = `stock-before-${randomUUID()}`;
  await pool.query(
    'INSERT INTO users (id,email,"displayName","updatedAt") VALUES ($1,$2,$3,NOW())',
    [owner, `${owner}@invoiceo.test`, 'Inventory legacy fixture'],
  );
  await pool.query(
    `INSERT INTO company_profiles (id,"userId","businessName",address,city,state,"zipCode",phone,email,"taxNumber","defaultLaborRate","defaultTaxRate","updatedAt")
    VALUES ($1,$2,'Legacy business','Street','City','State','12345','1234567890','business@invoiceo.test','LEGACY-TAX',49.95,7.5,NOW())`,
    [`company-${owner}`, owner],
  );
  await pool.query(
    `INSERT INTO customers (id,"userId",name,email,phone,address,city,state,"zipCode","updatedAt")
    VALUES ($1,$2,'Legacy customer','customer@invoiceo.test','1234567890','Street','City','State','12345',NOW())`,
    [`customer-${owner}`, owner],
  );
  await pool.query(
    `INSERT INTO invoice_defaults ("userId",currency,"taxRate","paymentTerms",notes,terms)
    VALUES ($1,'INR',7.5,'Net 30','Keep defaults','Existing terms')`,
    [owner],
  );
  await pool.query(
    `INSERT INTO refresh_tokens (id,"userId",token,"expiresAt","updatedAt") VALUES ($1,$2,$3,'2030-01-01',NOW())`,
    [`token-${owner}`, owner, `fictional-token-${owner}`],
  );
  for (const type of ['PRODUCT', 'SERVICE']) {
    await pool.query(
      `INSERT INTO catalog_items (id,"userId",type,name,description,sku,unit,rate,currency,"isArchived","usedAt","updatedAt")
      VALUES ($1,$2,$3::"LineItemType",$3,'Preserve catalog',$4,'each',0.335,'USD',false,'2026-11-02',NOW())`,
      [`${type}-${owner}`, owner, type, `${type}-LEGACY`],
    );
  }
  for (const [i, status] of ['DRAFT', 'SENT', 'PAID'].entries()) {
    const id = `invoice-${status}-${owner}`;
    await pool.query(
      `INSERT INTO invoices (id,"userId","customerId","invoiceNumber","serviceDate","dueDate",subtotal,"taxRate","taxAmount",total,currency,"amountPaid",status,notes,"updatedAt")
      VALUES ($1,$2,$3,$4,'2026-01-01','2026-01-31',0.67,0,0,0.67,'USD',$5,$6::"InvoiceStatus",'Preserve original totals',NOW())`,
      [id, owner, `customer-${owner}`, `OLD-${i}`, status === 'PAID' ? 0.67 : 0.3, status],
    );
    for (const type of ['PRODUCT', 'SERVICE']) {
      await pool.query(
        `INSERT INTO line_items (id,"invoiceId",type,description,unit,quantity,rate,amount,"catalogItemId")
        VALUES ($1,$2,$3::"LineItemType",$3,'each',1.23456,0.335,0.335,$4)`,
        [`line-${type}-${id}`, id, type, `${type}-${owner}`],
      );
    }
  }
  writeFileSync(snapshotFile, JSON.stringify(await snapshot(), null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify({
      passed: true,
      mode: 'seed-before',
      tables: tables.length,
      data: 'fictional only',
    }),
  );
}
async function reject(sql, params, code) {
  await assert.rejects(
    pool.query(sql, params),
    (error) => error.code === code,
    `Expected SQLSTATE ${code}`,
  );
}
async function invariantMetadata() {
  const checks = [
    'catalog_stock_product_check',
    'invoice_issued_status_check',
    'stock_action_input_check',
    'stock_action_source_check',
    'stock_action_reversal_check',
    'stock_movement_finite_check',
  ];
  const foreignKeys = [
    'stock_actions_userId_catalogItemId_fkey',
    'stock_actions_userId_invoiceId_fkey',
    'stock_actions_userId_reversalOfId_fkey',
    'stock_movements_userId_catalogItemId_fkey',
  ];
  const constraints = (
    await pool.query(
      `SELECT conname, convalidated, condeferrable, condeferred, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname=ANY($1::text[]) ORDER BY conname`,
      [[...checks, ...foreignKeys]],
    )
  ).rows;
  assert.equal(constraints.length, 10);
  assert.ok(constraints.every((row) => row.convalidated));
  assert.ok(
    constraints
      .filter((row) => foreignKeys.includes(row.conname))
      .every((row) => row.condeferrable && row.condeferred),
  );
  const names = [
    'stock_action_source',
    'stock_movement_source',
    'stock_action_append_only',
    'stock_action_no_truncate',
    'stock_movement_append_only',
    'stock_movement_no_truncate',
    'catalog_tracking_identity',
    'invoice_issue_identity',
  ];
  const triggers = (
    await pool.query(
      `SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal AND tgname=ANY($1::text[]) ORDER BY tgname`,
      [names],
    )
  ).rows;
  assert.equal(triggers.length, 8);
  assert.ok(triggers.every((row) => row.tgenabled === 'O'));
  const functions = (
    await pool.query(
      `SELECT proname,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname`,
      [
        [
          'inventory_validate_action_source',
          'inventory_validate_movement',
          'inventory_history_immutable',
          'inventory_tracking_identity',
          'inventory_issue_identity',
        ],
      ],
    )
  ).rows;
  assert.equal(functions.length, 5);
  return createHash('sha256')
    .update(JSON.stringify({ constraints, triggers, functions }))
    .digest('hex');
}
async function verifySchema() {
  const checks = [];
  for (const table of ['stock_actions', 'stock_movements']) {
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0);
  }
  assert.deepEqual(
    (
      await pool.query(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid='"InvoiceStatus"'::regtype ORDER BY enumsortorder`,
      )
    ).rows.map((r) => r.enumlabel),
    process.argv.includes('--verify-upgrade')
      ? ['DRAFT', 'SENT', 'PAID']
      : ['DRAFT', 'SENT', 'PAID', 'VOIDED'],
  );
  checks.push('empty ledger/default-off tracking; expected invoice lifecycle enum');
  const owner = `stock-owner-${randomUUID()}`;
  const other = `stock-other-${randomUUID()}`;
  for (const id of [owner, other])
    await pool.query(
      'INSERT INTO users (id,email,"displayName","updatedAt") VALUES ($1,$2,$3,NOW())',
      [id, `${id}@invoiceo.test`, 'Stock schema test'],
    );
  async function product(userId = owner, type = 'PRODUCT', tracked = true) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO catalog_items (id,"userId",type,name,unit,rate,currency,"stockTrackingStartedAt","updatedAt")
      VALUES ($1,$2,$3::"LineItemType",'Fixture item','kg',10,'USD',$4,NOW())`,
      [id, userId, type, tracked ? '2026-11-03T12:00:00Z' : null],
    );
    return id;
  }
  async function invoice(userId = owner, customerId = null) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO invoices (id,"userId","customerId","invoiceNumber","serviceDate","dueDate",subtotal,"taxRate","taxAmount",total,status,"issuedAt","updatedAt")
      VALUES ($1,$2,$3,$1,'2026-11-03','2026-12-03',0,0,0,0,'SENT','2026-11-03T12:00:00Z',NOW())`,
      [id, userId, customerId],
    );
    return id;
  }
  async function action(input = {}) {
    const id = input.id ?? randomUUID();
    const kind = input.kind ?? 'ADJUSTMENT';
    const source =
      kind === 'OPENING'
        ? `opening:${input.productId}`
        : kind === 'INVOICE_ISSUE'
          ? `invoice:${input.invoiceId}:issue`
          : kind === 'INVOICE_VOID'
            ? `invoice:${input.invoiceId}:void`
            : null;
    const requestId = input.requestId ?? randomUUID();
    return (
      await pool.query(
        `INSERT INTO stock_actions (id,"userId","requestId","requestHash",kind,"sourceKey","catalogItemId","invoiceId","reversalOfId",reason,"effectiveDate","createdAt")
      VALUES ($1,$2,$3,$4,$5::"StockActionKind",$6,$7,$8,$9,$10,'2026-11-03','2026-11-03T12:00:00Z') RETURNING *`,
        [
          id,
          input.userId ?? owner,
          requestId,
          input.hash ?? createHash('sha256').update(requestId).digest('hex'),
          kind,
          Object.hasOwn(input, 'sourceKey') ? input.sourceKey : source,
          input.productId ?? null,
          input.invoiceId ?? null,
          input.reversalOfId ?? null,
          input.reason ?? 'Fixture stock action',
        ],
      )
    ).rows[0];
  }
  async function movement(a, productId, delta, userId = owner) {
    return (
      await pool.query(
        `INSERT INTO stock_movements (id,"userId","actionId","catalogItemId","quantityDelta") VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [randomUUID(), userId, a.id, productId, delta],
      )
    ).rows[0];
  }
  const rejects = (fn, code) =>
    assert.rejects(fn, (error) => error.code === code, `Expected SQLSTATE ${code}`);
  const item = await product();
  const second = await product();
  const otherItem = await product(other);
  const untracked = await product(owner, 'PRODUCT', false);
  const service = await product(owner, 'SERVICE', false);
  const customerId = randomUUID();
  await pool.query(
    `INSERT INTO customers (id,"userId",name,email,phone,address,city,state,"zipCode","updatedAt") VALUES ($1,$2,'Stock client','client@invoiceo.test','123','Street','City','State','12345',NOW())`,
    [customerId, owner],
  );
  const inv = await invoice(owner, customerId);
  const otherInv = await invoice(other);
  const opening = await action({ kind: 'OPENING', productId: item });
  await movement(opening, item, '10.000');
  const issue = await action({ kind: 'INVOICE_ISSUE', invoiceId: inv });
  await movement(issue, item, '-3.000');
  assert.equal(
    (
      await pool.query(
        'SELECT SUM("quantityDelta")::text AS balance FROM stock_movements WHERE "catalogItemId"=$1',
        [item],
      )
    ).rows[0].balance,
    '7.000',
  );
  assert.equal(opening.createdAt.getTime(), issue.createdAt.getTime());
  assert.ok(BigInt(opening.sequence) < BigInt(issue.sequence));
  await rejects(() => action({ kind: 'INVOICE_ISSUE', invoiceId: inv }), '23505');
  await rejects(() => action({ kind: 'OPENING', productId: item }), '23505');
  await rejects(() => movement(issue, item, '-1'), '23505');
  const zeroItem = await product();
  await movement(await action({ kind: 'OPENING', productId: zeroItem }), zeroItem, '0');
  checks.push(
    'exact 10 - 3 = 7, zero opening, timestamp-tie sequence ordering and unique opening/issue/item posting',
  );

  await rejects(() => action({ kind: 'OPENING', productId: untracked }), '23514');
  await reject(
    'UPDATE catalog_items SET "stockTrackingStartedAt"=NOW() WHERE id=$1',
    [service],
    '23514',
  );
  await rejects(() => action({ kind: 'ADJUSTMENT', productId: otherItem }), '23503');
  await rejects(() => action({ kind: 'INVOICE_EDIT', invoiceId: otherInv }), '23503');
  await rejects(() => action({ productId: item, sourceKey: 'unexpected' }), '23514');
  await rejects(() => action({ kind: 'OPENING', productId: second, sourceKey: null }), '23514');
  await rejects(() => action({ kind: 'INVOICE_EDIT', productId: item, invoiceId: inv }), '23514');
  await rejects(() => action({ productId: item, requestId: ' ' }), '23514');
  await rejects(() => action({ productId: item, reason: ' ' }), '23514');
  await rejects(() => action({ productId: item, hash: 'f'.repeat(63) }), '23514');
  await rejects(() => action({ productId: item, reason: 'x'.repeat(501) }), '22001');
  const sharedRequest = randomUUID();
  const adjustment = await action({ productId: item, requestId: sharedRequest });
  await action({ userId: other, productId: otherItem, requestId: sharedRequest });
  await rejects(() => action({ productId: item, requestId: sharedRequest }), '23505');
  const otherAction = await action({ userId: other, productId: otherItem });
  await rejects(() => action({ productId: item, reversalOfId: otherAction.id }), '23503');
  await action({ productId: item, reversalOfId: adjustment.id });
  await rejects(() => action({ productId: item, reversalOfId: adjustment.id }), '23505');
  const self = randomUUID();
  await rejects(() => action({ id: self, productId: item, reversalOfId: self }), '23514');
  await rejects(() => movement(otherAction, item, '1'), '23503');
  await rejects(() => movement(adjustment, otherItem, '1'), '23503');
  await rejects(() => movement(adjustment, second, '1'), '23514');
  await rejects(() => movement(issue, untracked, '-1'), '23514');
  await rejects(() => movement(issue, service, '-1'), '23514');
  checks.push(
    'account-isolated product/invoice/action/reversal references; source/hash/reason shapes; per-account retry/reversal identities',
  );

  for (const [kind, delta] of [
    ['OPENING', '-1'],
    ['ADJUSTMENT', '0'],
    ['INVOICE_ISSUE', '1'],
    ['INVOICE_EDIT', '0'],
    ['INVOICE_VOID', '-1'],
  ]) {
    const p = await product();
    const a = await action(
      kind.startsWith('INVOICE') ? { kind, invoiceId: await invoice() } : { kind, productId: p },
    );
    await rejects(() => movement(a, p, delta), '23514');
  }
  await rejects(() => movement(adjustment, item, 'NaN'), '23514');
  await rejects(() => movement(adjustment, item, '1000000000000000'), '22003');
  const maxItem = await product();
  const max = await movement(
    await action({ kind: 'OPENING', productId: maxItem }),
    maxItem,
    '999999999999999.999',
  );
  assert.equal(max.quantityDelta, '999999999999999.999');
  const rawPrecisionItem = await product();
  const raw = await movement(
    await action({ kind: 'OPENING', productId: rawPrecisionItem }),
    rawPrecisionItem,
    '0.1234',
  );
  assert.equal(
    raw.quantityDelta,
    '0.123',
    'PostgreSQL typmod coercion is documented; API must validate before writing.',
  );
  const { stockQuantity } = require('../dist/inventory/stock-quantity');
  assert.throws(() => stockQuantity('0.1234'));
  checks.push(
    'finite signed numeric bounds/directions; exact maximum; explicit native SQL rounding versus strict API helper rejection',
  );

  await reject(
    'UPDATE stock_actions SET reason=$2 WHERE id=$1',
    [opening.id, 'Changed history'],
    '23514',
  );
  await reject('DELETE FROM stock_actions WHERE id=$1', [opening.id], '23514');
  await reject(
    'UPDATE stock_movements SET "quantityDelta"=9 WHERE "actionId"=$1',
    [opening.id],
    '23514',
  );
  await reject('DELETE FROM stock_movements WHERE "actionId"=$1', [opening.id], '23514');
  await reject('TRUNCATE stock_actions, stock_movements', [], '23514');
  await reject('TRUNCATE stock_movements', [], '23514');
  await reject('DELETE FROM invoices WHERE id=$1', [inv], '23503');
  await reject('DELETE FROM customers WHERE id=$1', [customerId], '23503');
  await reject('DELETE FROM catalog_items WHERE id=$1', [item], '23503');
  for (const column of ['unit', 'stockTrackingStartedAt', 'type']) {
    const value = column === 'unit' ? "'box'" : column === 'type' ? "'SERVICE'" : 'NULL';
    await reject(`UPDATE catalog_items SET "${column}"=${value} WHERE id=$1`, [zeroItem], '23514');
  }
  await pool.query('UPDATE catalog_items SET name=$2,rate=20,"isArchived"=true WHERE id=$1', [
    item,
    'Renamed archived item',
  ]);
  await reject('UPDATE invoices SET "issuedAt"=NULL WHERE id=$1', [inv], '23514');
  await reject("UPDATE invoices SET status='DRAFT' WHERE id=$1", [inv], '23514');
  const deletable = await invoice();
  await pool.query('DELETE FROM invoices WHERE id=$1', [deletable]);
  checks.push(
    'append-only rows/TRUNCATE guard, zero-opening unit/tracking locks, issue identity and retained invoice/customer/product history',
  );

  const raceProduct = await product();
  const race = await Promise.allSettled([
    action({ kind: 'OPENING', productId: raceProduct }),
    action({ kind: 'OPENING', productId: raceProduct }),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(race.find((r) => r.status === 'rejected').reason.code, '23505');
  checks.push('real concurrent duplicate opening requests select one unique source action');

  const { PrismaService } = require('../dist/database/prisma.service');
  prisma = new PrismaService();
  await prisma.$connect();
  assert.ok(
    await prisma.catalogItem.findUnique({ where: { userId_id: { userId: owner, id: item } } }),
  );
  const modeled = await prisma.stockAction.findUnique({
    where: { userId_requestId: { userId: owner, requestId: opening.requestId } },
    include: { movements: { include: { catalogItem: true } } },
  });
  assert.equal(typeof modeled.sequence, 'bigint');
  assert.equal(modeled.movements[0].quantityDelta.toFixed(3), '10.000');
  assert.equal(modeled.movements[0].catalogItem.userId, owner);
  checks.push(
    'generated Prisma client reads composite relations, BigInt action order and exact Decimal movements',
  );

  await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [[owner, other]]);
  for (const table of ['stock_actions', 'stock_movements', 'catalog_items', 'invoices']) {
    assert.equal(
      (
        await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE "userId"=ANY($1::text[])`, [
          [owner, other],
        ])
      ).rows[0].n,
      0,
    );
  }
  checks.push('whole-account deletion cascades without deleting retained history independently');
  return checks;
}
(async () => {
  if (process.argv.includes('--verify-rollback')) {
    assert.ok(snapshotFile, 'Set INVENTORY_SCHEMA_SNAPSHOT_FILE for rollback preservation.');
    assert.deepEqual(await snapshot(), JSON.parse(readFileSync(snapshotFile, 'utf8')));
    const leftovers = (
      await pool.query(`SELECT
      to_regclass('public.stock_actions') IS NOT NULL AS actions,
      to_regclass('public.stock_movements') IS NOT NULL AS movements,
      to_regtype('public."StockActionKind"') IS NOT NULL AS kind,
      (SELECT count(*)::int FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'inventory_%') AS functions`)
    ).rows[0];
    assert.deepEqual(leftovers, { actions: false, movements: false, kind: false, functions: 0 });
    console.log(
      JSON.stringify({
        passed: true,
        mode: 'verify-rollback',
        originalTablesPreserved: 8,
        inventoryObjectsLeft: false,
      }),
    );
    return;
  }
  if (process.argv.includes('--seed-before')) {
    await seedBefore();
    return;
  }
  const upgraded = process.argv.includes('--verify-upgrade');
  if (!upgraded && !process.argv.includes('--verify'))
    throw new Error('Choose --seed-before, --verify-upgrade or --verify.');
  if (upgraded) await verifyPreservation();
  const invariantFingerprint = await invariantMetadata();
  const checks = await verifySchema();
  checks.push(
    'six CHECK constraints, eight enabled triggers, five functions and four commit-time source FKs verified directly',
  );
  if (upgraded) {
    await verifyPreservation();
    checks.unshift(
      'all eight original tables preserved; new fields null; legacy floats/totals untouched',
    );
  }
  console.log(
    JSON.stringify(
      {
        passed: true,
        mode: upgraded ? 'verify-upgrade' : 'verify-fresh',
        invariantFingerprint,
        checks,
      },
      null,
      2,
    ),
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    await pool.end();
  });
