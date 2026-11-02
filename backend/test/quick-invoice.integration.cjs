// Run only against an explicitly supplied disposable local database with the editor schema.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connection = process.env.INVOICE_EDITOR_TEST_DATABASE_URL;
if (!connection || !['localhost', '127.0.0.1'].includes(new URL(connection).hostname)) {
  throw new Error(
    'Set INVOICE_EDITOR_TEST_DATABASE_URL to a disposable local PostgreSQL database.',
  );
}
process.env.DATABASE_URL = connection;
process.env.PG_SSL = 'false';
const { PrismaService } = require('../dist/database/prisma.service.js');
const { InvoiceService } = require('../dist/invoice/invoice.service.js');
const { DashboardService } = require('../dist/dashboard/dashboard.service.js');
const { InvoiceDefaultsService } = require('../dist/invoice/invoice-defaults.service.js');
const prisma = new PrismaService();
const service = new InvoiceService(prisma);
const users = [`qi-test-${randomUUID()}`, `qi-test-${randomUUID()}`];
const payload = {
  isQuickInvoice: true,
  invoiceNumber: 'INV-001',
  quickCompanyName: 'Acme Studio',
  quickCustomerName: 'Sample Client',
  serviceDate: new Date('2026-10-01'),
  dueDate: new Date('2026-10-31'),
  taxRate: 0,
  currency: 'INR',
  discountType: 'percentage',
  discountValue: 10,
  shippingAmount: 20,
  amountPaid: 300,
  shippingAddress: 'Client warehouse\nMumbai',
  paymentTerms: 'Net 30',
  terms: 'Bank transfer',
  purchaseOrderNumber: 'PO-42',
  lineItems: [
    { type: 'PRODUCT', description: 'Design services', unit: 'project', quantity: 1, rate: 1000 },
  ],
};
(async () => {
  await prisma.$connect();
  for (const id of users)
    await prisma.user.create({
      data: { id, email: `${id}@invoiceo.test`, displayName: 'Invoice integration test' },
    });
  const first = await service.createQuick(users[0], { ...payload, clientRequestId: 'draft-1' });
  assert.equal(first.total, 920);
  assert.equal(first.currency, 'INR');
  assert.equal(first.amountPaid, 300);
  assert.equal(first.purchaseOrderNumber, 'PO-42');
  assert.equal(first.shippingAddress, 'Client warehouse\nMumbai');
  assert.equal(
    (await service.createQuick(users[0], { ...payload, clientRequestId: 'draft-1' })).id,
    first.id,
  );
  assert.notEqual((await service.createQuick(users[1], payload)).id, first.id);
  await assert.rejects(
    () => service.createQuick(users[0], payload),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    () => service.findById(users[1], first.id),
    (error) => error.getStatus() === 404,
  );
  await assert.rejects(
    () => service.update(users[0], first.id, { amountPaid: 921 }),
    (error) => error.getStatus() === 400,
  );
  const edited = await service.update(users[0], first.id, {
    notes: '',
    terms: '',
    shippingAmount: 30,
    quickCustomerName: 'Edited Client',
  });
  assert.equal(edited.total, 930);
  assert.equal(edited.notes, '');
  assert.equal(edited.terms, '');
  assert.equal(edited.quickCustomerName, 'Edited Client');
  await service.updateStatus(users[0], first.id, { status: 'PAID' });
  assert.equal((await service.findById(users[0], first.id)).amountPaid, 930);
  const usd = await service.createQuick(users[0], {
    ...payload,
    invoiceNumber: 'USD-001',
    currency: 'USD',
    discountValue: 0,
    shippingAmount: 0,
    amountPaid: 0,
    lineItems: [{ ...payload.lineItems[0], rate: 100 }],
  });
  await service.updateStatus(users[0], usd.id, { status: 'PAID' });
  const stats = await new DashboardService(prisma).getStatistics(users[0]);
  assert.equal(stats.totalRevenue, 100);
  assert.equal(stats.currencyTotals.find((value) => value.currency === 'INR').totalRevenue, 930);
  const reopened = await service.update(users[0], first.id, { shippingAmount: 40 });
  assert.equal(reopened.status, 'SENT');
  assert.equal(reopened.amountPaid, 930);
  assert.equal(reopened.total, 940);
  const auto = await Promise.all([
    service.createQuick(users[0], { ...payload, invoiceNumber: '' }),
    service.createQuick(users[0], { ...payload, invoiceNumber: '' }),
  ]);
  assert.notEqual(auto[0].invoiceNumber, auto[1].invoiceNumber);
  const imports = await Promise.all([
    service.createQuick(users[0], {
      ...payload,
      invoiceNumber: 'RACE-1',
      clientRequestId: 'race-1',
    }),
    service.createQuick(users[0], {
      ...payload,
      invoiceNumber: 'RACE-1',
      clientRequestId: 'race-1',
    }),
  ]);
  assert.equal(imports[0].id, imports[1].id);
  // Seed the rounding used by earlier saved invoices (raw lines summed before rounding).
  const legacy = await prisma.invoice.create({
    data: {
      userId: users[0],
      invoiceNumber: 'LEGACY-ROUNDING',
      isQuickInvoice: true,
      quickCustomerName: 'Legacy Client',
      serviceDate: payload.serviceDate,
      dueDate: payload.dueDate,
      subtotal: 0.67,
      taxRate: 0,
      taxAmount: 0,
      total: 0.67,
      lineItems: {
        create: [1, 2].map((index) => ({
          type: 'PRODUCT',
          description: `Original ${index}`,
          unit: 'each',
          quantity: 1,
          rate: 0.335,
          amount: 0.335,
        })),
      },
    },
    include: { lineItems: true },
  });
  const detailsOnly = await service.update(users[0], legacy.id, {
    notes: 'Details changed',
    lineItems: legacy.lineItems.map(({ type, unit, quantity, rate }) => ({
      type,
      unit,
      quantity,
      rate,
      description: 'Updated description',
    })),
  });
  assert.equal(detailsOnly.subtotal, 0.67);
  assert.equal(detailsOnly.total, 0.67);
  assert.equal(detailsOnly.lineItems[0].amount, 0.335);
  assert.equal((await service.update(users[0], legacy.id, { amountPaid: 0.67 })).total, 0.67);
  await assert.rejects(
    () => service.update(users[0], legacy.id, { amountPaid: 0.68 }),
    (error) => error.getStatus() === 400,
  );
  const repriced = await service.update(users[0], legacy.id, { taxRate: 0.1 });
  assert.equal(repriced.subtotal, 0.68);
  assert.equal(repriced.taxAmount, 0.07);
  assert.equal(repriced.total, 0.75);
  assert.equal(repriced.lineItems[0].amount, 0.34);
  const defaults = new InvoiceDefaultsService(prisma);
  assert.equal(await defaults.get(users[0]), null);
  const snapshot = JSON.stringify(await service.findById(users[0], first.id));
  const preferences = {
    currency: 'KWD',
    taxRate: 0,
    paymentTerms: 'Net 14',
    notes: 'Thank you',
    terms: 'Bank transfer',
  };
  await defaults.save(users[0], preferences);
  assert.deepEqual(await defaults.get(users[0]), preferences);
  assert.equal(await defaults.get(users[1]), null);
  await defaults.save(users[1], { ...preferences, currency: 'JPY', taxRate: 0.1 });
  await defaults.save(users[0], { ...preferences, paymentTerms: '', notes: '', terms: '' });
  assert.equal((await defaults.get(users[0])).notes, '');
  assert.equal((await defaults.get(users[1])).currency, 'JPY');
  assert.equal(await prisma.invoiceDefaults.count({ where: { userId: users[0] } }), 1);
  assert.equal(JSON.stringify(await service.findById(users[0], first.id)), snapshot);
  console.log(
    'PASS: fields/totals, edit/clear, account numbering/ownership, duplicate/overpayment errors, concurrent creation/imports, payment status, separate currency summaries, saved-total preservation/repricing, and isolated invoice defaults without modifying saved invoices.',
  );
})()
  .finally(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
