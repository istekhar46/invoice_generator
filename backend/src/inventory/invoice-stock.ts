import { ConflictException } from '@nestjs/common';
import { CatalogItem, Invoice, LineItem, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { aggregateStockQuantities, planStockDeltas } from './stock-quantity';
import { assertStockBalances, stockRequestHash } from './stock-ledger';

type ProductMap = ReadonlyMap<string, CatalogItem>;
type Rows = readonly { catalogItemId?: string | null; quantity: number }[];

export function trackedProductIds(products: ProductMap) {
  return new Set(
    [...products.values()]
      .filter((product) => product.type === 'PRODUCT' && product.stockTrackingStartedAt)
      .map((product) => product.id),
  );
}

function effectiveToday(now: Date) {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** Invoice and all referenced products must already be locked. */
export async function issueInvoiceStock(
  tx: Prisma.TransactionClient,
  userId: string,
  invoice: Invoice & { lineItems: LineItem[] },
  products: ProductMap,
) {
  const quantities = aggregateStockQuantities(invoice.lineItems, trackedProductIds(products));
  const deltas = planStockDeltas(new Map(), quantities);
  await assertStockBalances(tx, userId, deltas);
  const now = new Date();
  // Created after product locks: opening/issue sequence gives an exact cutover boundary.
  await tx.stockAction.create({
    data: {
      userId,
      invoiceId: invoice.id,
      kind: 'INVOICE_ISSUE',
      requestId: `invoice:issue:${invoice.id}`,
      sourceKey: `invoice:${invoice.id}:issue`,
      requestHash: stockRequestHash({
        operation: 'issue',
        invoiceId: invoice.id,
        quantities: [...quantities]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, quantity]) => [id, quantity.toFixed(3)]),
      }),
      reason: 'Invoice issued',
      effectiveDate: effectiveToday(now),
      movements: {
        create: deltas.map(({ catalogItemId, delta }) => ({ catalogItemId, quantityDelta: delta })),
      },
    },
  });
  return now;
}

/** Historical issued invoices have no issue action and remain outside stock posting. */
export async function editInvoiceStock(
  tx: Prisma.TransactionClient,
  userId: string,
  invoiceId: string,
  previousRows: Rows,
  nextRows: Rows,
  products: ProductMap,
) {
  const issue = await tx.stockAction.findUnique({
    where: { userId_sourceKey: { userId, sourceKey: `invoice:${invoiceId}:issue` } },
    select: { sequence: true },
  });
  if (!issue) return;
  const tracked = trackedProductIds(products);
  const openings = await tx.stockAction.findMany({
    where: { userId, kind: 'OPENING', catalogItemId: { in: [...tracked] } },
    select: { catalogItemId: true, sequence: true },
  });
  if (openings.length !== tracked.size)
    throw new ConflictException(
      'Tracked product opening history is missing. Correct its stock history before editing this invoice.',
    );
  const eligible = new Set(
    openings.flatMap((opening) =>
      opening.catalogItemId && opening.sequence < issue.sequence ? [opening.catalogItemId] : [],
    ),
  );
  const deltas = planStockDeltas(
    aggregateStockQuantities(previousRows, eligible),
    aggregateStockQuantities(nextRows, eligible),
  );
  if (!deltas.length) return;
  await assertStockBalances(tx, userId, deltas);
  await tx.stockAction.create({
    data: {
      userId,
      invoiceId,
      kind: 'INVOICE_EDIT',
      requestId: `invoice:edit:${randomUUID()}`,
      requestHash: stockRequestHash({
        operation: 'edit',
        invoiceId,
        deltas: deltas.map(({ catalogItemId, delta }) => [catalogItemId, delta.toFixed(3)]),
      }),
      reason: 'Invoice quantities updated',
      effectiveDate: effectiveToday(new Date()),
      movements: {
        create: deltas.map(({ catalogItemId, delta }) => ({ catalogItemId, quantityDelta: delta })),
      },
    },
  });
}

/** Read with the invoice locked, before taking all referenced product locks. */
export async function invoiceStockReturns(
  tx: Prisma.TransactionClient,
  userId: string,
  invoiceId: string,
) {
  const sums = await tx.stockMovement.groupBy({
    by: ['catalogItemId'],
    where: { userId, action: { invoiceId, kind: { in: ['INVOICE_ISSUE', 'INVOICE_EDIT'] } } },
    _sum: { quantityDelta: true },
  });
  return sums
    .flatMap((sum) => {
      const quantity = sum._sum.quantityDelta;
      return quantity && !quantity.isZero()
        ? [{ catalogItemId: sum.catalogItemId, delta: quantity.negated() }]
        : [];
    })
    .sort((a, b) => a.catalogItemId.localeCompare(b.catalogItemId));
}

export async function voidInvoiceStock(
  tx: Prisma.TransactionClient,
  userId: string,
  invoiceId: string,
  deltas: Awaited<ReturnType<typeof invoiceStockReturns>>,
) {
  await assertStockBalances(tx, userId, deltas);
  const issue = await tx.stockAction.findUnique({
    where: { userId_sourceKey: { userId, sourceKey: `invoice:${invoiceId}:issue` } },
    select: { id: true },
  });
  await tx.stockAction.create({
    data: {
      userId,
      invoiceId,
      kind: 'INVOICE_VOID',
      requestId: `invoice:void:${invoiceId}`,
      sourceKey: `invoice:${invoiceId}:void`,
      reversalOfId: issue?.id ?? null,
      requestHash: stockRequestHash({
        operation: 'void',
        invoiceId,
        deltas: deltas.map(({ catalogItemId, delta }) => [catalogItemId, delta.toFixed(3)]),
      }),
      reason: 'Invoice voided',
      effectiveDate: effectiveToday(new Date()),
      movements: {
        create: deltas.map(({ catalogItemId, delta }) => ({ catalogItemId, quantityDelta: delta })),
      },
    },
  });
}
