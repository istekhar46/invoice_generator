// Explicit disposable localhost database only. --upgrade starts with the previous schema.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');
const connection = process.env.CATALOG_TEST_DATABASE_URL;
if (!connection || !['localhost', '127.0.0.1'].includes(new URL(connection).hostname)) {
  throw new Error('Set CATALOG_TEST_DATABASE_URL to an explicitly disposable localhost database.');
}
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
const pool = new Pool({ connectionString: connection });
const suffix = randomUUID();
const users = [`catalog-owner-${suffix}`, `catalog-other-${suffix}`, `catalog-legacy-${suffix}`, `catalog-delete-${suffix}`];
const legacyId = `catalog-legacy-invoice-${suffix}`;
let prisma;
const rejects = (fn, status) => assert.rejects(fn, error => error.getStatus?.() === status);

async function upgrade() {
  await pool.query('INSERT INTO users (id, email, "displayName", "updatedAt") VALUES ($1,$2,$3,NOW())', [users[2], `${users[2]}@invoiceo.test`, 'Legacy catalog fixture']);
  await pool.query(`INSERT INTO invoices (id,"userId","invoiceNumber","serviceDate","dueDate",subtotal,"taxRate","taxAmount",total,currency,"amountPaid",status,"updatedAt")
    VALUES ($1,$2,'LEGACY-001','2026-01-01','2026-01-31',0.67,0,0,0.67,'USD',0.3,'SENT',NOW())`, [legacyId, users[2]]);
  for (const [index, type] of ['MATERIAL', 'LABOR'].entries()) {
    await pool.query(`INSERT INTO line_items (id,"invoiceId",type,description,unit,quantity,rate,amount)
      VALUES ($1,$2,$3::"LineItemType",$4,'each',1,0.335,0.335)`, [`legacy-line-${index}-${suffix}`, legacyId, type, `Legacy ${type}`]);
  }
  const invoice = (await pool.query('SELECT * FROM invoices WHERE id=$1', [legacyId])).rows[0];
  const rows = (await pool.query('SELECT * FROM line_items WHERE "invoiceId"=$1 ORDER BY id', [legacyId])).rows;
  await pool.query(readFileSync(join(__dirname, '../prisma/updates/20261102_product_service_catalog.sql'), 'utf8'));
  assert.deepEqual((await pool.query('SELECT * FROM invoices WHERE id=$1', [legacyId])).rows[0], invoice);
  assert.deepEqual((await pool.query('SELECT * FROM line_items WHERE "invoiceId"=$1 ORDER BY id', [legacyId])).rows,
    rows.map(row => ({ ...row, type: row.type === 'MATERIAL' ? 'PRODUCT' : 'SERVICE', catalogItemId: null })));
  assert.equal((await pool.query('SELECT COUNT(*) FROM catalog_items')).rows[0].count, '0');
  console.log('PASS: old enum upgrade preserves every legacy invoice/line financial field and creates no catalog backfill.');
}

(async () => {
  if (process.argv.includes('--upgrade')) await upgrade();
  const { PrismaService } = require('../dist/database/prisma.service');
  const { CatalogService } = require('../dist/catalog/catalog.service');
  const { InvoiceService } = require('../dist/invoice/invoice.service');
  prisma = new PrismaService();
  await prisma.$connect();
  const catalog = new CatalogService(prisma);
  const invoices = new InvoiceService(prisma);
  for (const id of [users[0], users[1], users[3]]) {
    await prisma.user.create({ data: { id, email: `${id}@invoiceo.test`, displayName: 'Catalog integration test' } });
  }
  const input = { type: 'PRODUCT', name: 'Cable', description: 'Outdoor', sku: 'CABLE-1', unit: 'each', rate: 100, currency: 'USD' };
  const product = await catalog.create(users[0], input);
  const service = await catalog.create(users[0], { ...input, type: 'SERVICE', name: 'Consultation', sku: null, unit: 'hour', rate: 75 });
  await catalog.create(users[1], input);
  await rejects(() => catalog.create(users[0], input), 409);
  await rejects(() => catalog.findById(users[1], product.id), 404);
  await rejects(() => catalog.update(users[1], product.id, { name: 'Hijacked' }), 404);
  const found = await catalog.findAll(users[0], { search: 'cable', page: 1, limit: 1 });
  assert.equal(found.total, 1);
  assert.equal(found.data[0].id, product.id);
  assert.equal((await catalog.findAll(users[0], { type: 'SERVICE', page: 1, limit: 20 })).total, 1);
  const payload = {
    isQuickInvoice: true, quickCustomerName: 'Client', serviceDate: new Date('2026-11-01'), dueDate: new Date('2026-12-01'), taxRate: 0, currency: 'USD',
    lineItems: [
      { type: 'PRODUCT', catalogItemId: product.id, description: 'Cable — Outdoor', unit: 'each', quantity: 2, rate: 100 },
      { type: 'SERVICE', catalogItemId: service.id, description: 'Consultation', unit: 'hour', quantity: 1, rate: 75 },
    ],
  };
  await rejects(() => invoices.createQuick(users[1], payload), 404);
  await rejects(() => invoices.createQuick(users[0], { ...payload, lineItems: [{ ...payload.lineItems[1], type: 'PRODUCT' }] }), 400);
  await rejects(() => invoices.createQuick(users[0], { ...payload, lineItems: [{ ...payload.lineItems[1], unit: 'each' }] }), 400);
  const invoice = await invoices.createQuick(users[0], payload);
  assert.equal(invoice.total, 275);
  assert.deepEqual(invoice.lineItems.map(row => row.type).sort(), ['PRODUCT', 'SERVICE']);
  assert.equal(invoice.lineItems.find(row => row.type === 'SERVICE').catalogItemId, service.id);
  assert.ok((await catalog.findById(users[0], product.id)).usedAt);
  await rejects(() => catalog.update(users[0], product.id, { unit: 'box' }), 400);
  await rejects(() => catalog.update(users[0], product.id, { type: 'SERVICE' }), 400);
  await catalog.update(users[0], product.id, { name: 'New name', rate: 800, isArchived: true });
  const unchanged = await invoices.findById(users[0], invoice.id);
  assert.equal(unchanged.lineItems.find(row => row.catalogItemId === product.id).rate, 100);
  assert.equal(unchanged.total, 275);
  assert.equal(unchanged.lineItems.find(row => row.catalogItemId === product.id).description, 'Cable — Outdoor');
  await rejects(() => invoices.createQuick(users[0], payload), 400);
  const edited = await invoices.update(users[0], invoice.id, { lineItems: payload.lineItems.map(row => ({ ...row, description: `${row.description} (edited)` })) });
  assert.equal(edited.total, 275);
  assert.ok(edited.lineItems.every(row => row.catalogItemId));
  await rejects(() => invoices.update(users[0], invoice.id, { lineItems: [...payload.lineItems, payload.lineItems[0]] }), 400);
  assert.equal((await catalog.findAll(users[0], { status: 'archived', page: 1, limit: 20 })).total, 1);
  await catalog.update(users[0], product.id, { isArchived: false });
  // Standard invoices use the same transactional reference validation.
  const customer = await prisma.customer.create({ data: { userId: users[0], name: 'Client', email: 'client@invoiceo.test', phone: '1234567890', address: 'Street', city: 'City', state: 'State', zipCode: '12345' } });
  const standard = await invoices.create(users[0], { ...payload, customerId: customer.id });
  assert.equal(standard.lineItems.length, 2);
  assert.equal(standard.lineItems.find(row => row.type === 'SERVICE').catalogItemId, service.id);
  const racing = await catalog.create(users[0], { ...input, sku: null });
  const result = await Promise.allSettled([
    invoices.createQuick(users[0], { ...payload, lineItems: [{ ...payload.lineItems[0], catalogItemId: racing.id }] }),
    catalog.update(users[0], racing.id, { unit: 'box' }),
  ]);
  assert.equal(result.filter(entry => entry.status === 'fulfilled').length, 1);
  const afterRace = await catalog.findById(users[0], racing.id);
  if (result[0].status === 'fulfilled') assert.equal(afterRace.unit, 'each');
  else assert.equal(afterRace.unit, 'box');
  await invoices.delete(users[0], standard.id);
  await invoices.delete(users[0], invoice.id);
  await rejects(() => catalog.update(users[0], service.id, { unit: 'day' }), 400);
  // Account deletion must still cascade through both catalogs and referenced rows.
  const deletable = await catalog.create(users[3], { ...input, sku: null });
  await invoices.createQuick(users[3], { ...payload, lineItems: [{ ...payload.lineItems[0], catalogItemId: deletable.id }] });
  await prisma.user.delete({ where: { id: users[3] } });
  if (process.argv.includes('--upgrade')) {
    const legacy = await invoices.update(users[2], legacyId, { notes: 'Detail-only edit' });
    assert.equal(legacy.subtotal, 0.67);
    assert.equal(legacy.total, 0.67);
    assert.equal(legacy.amountPaid, 0.3);
    assert.ok(legacy.lineItems.every(row => row.amount === 0.335 && !row.catalogItemId));
    const repriced = await invoices.update(users[2], legacyId, { taxRate: 0.1 });
    assert.equal(repriced.subtotal, 0.68);
    assert.equal(repriced.total, 0.75);
  }
  console.log('PASS: catalog ownership/search/SKU isolation; mixed quick/standard invoices; snapshot/archive rules; first-use locks/concurrency; account cascade.' +
    (process.argv.includes('--upgrade') ? ' Legacy preservation/repricing also passed.' : ''));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (prisma) {
    await prisma.invoice.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
  await pool.end();
});
