import { Prisma } from '@prisma/client';

export interface StockQuantities {
  opening: string;
  adjustments: string;
  netInvoiced: string;
  quantity: string;
}

export const zeroStock: StockQuantities = {
  opening: '0.000',
  adjustments: '0.000',
  netInvoiced: '0.000',
  quantity: '0.000',
};

/** Complete ledger totals, including correction/reversal movements, never a history page. */
export async function stockOverview(tx: Prisma.TransactionClient, userId: string, ids: string[]) {
  if (!ids.length) return new Map<string, StockQuantities>();
  const rows = await tx.$queryRaw<
    {
      catalogItemId: string;
      opening: Prisma.Decimal;
      adjustments: Prisma.Decimal;
      netInvoiced: Prisma.Decimal;
      quantity: Prisma.Decimal;
    }[]
  >(Prisma.sql`
    SELECT m."catalogItemId",
      COALESCE(SUM(m."quantityDelta") FILTER (WHERE a.kind = 'OPENING'), 0) AS opening,
      COALESCE(SUM(m."quantityDelta") FILTER (WHERE a.kind = 'ADJUSTMENT'), 0) AS adjustments,
      -COALESCE(SUM(m."quantityDelta") FILTER (
        WHERE a.kind IN ('INVOICE_ISSUE', 'INVOICE_EDIT', 'INVOICE_VOID')), 0) AS "netInvoiced",
      SUM(m."quantityDelta") AS quantity
    FROM stock_movements m
    JOIN stock_actions a ON a.id = m."actionId" AND a."userId" = m."userId"
    WHERE m."userId" = ${userId} AND m."catalogItemId" IN (${Prisma.join(ids)})
    GROUP BY m."catalogItemId"
  `);
  return new Map(
    rows.map((row) => [
      row.catalogItemId,
      {
        opening: row.opening.toFixed(3),
        adjustments: row.adjustments.toFixed(3),
        netInvoiced: row.netInvoiced.toFixed(3),
        quantity: row.quantity.toFixed(3),
      },
    ]),
  );
}

/** Counts products, never quantities across incompatible units. Filters precede pagination. */
export async function stockSummary(
  tx: Prisma.TransactionClient,
  userId: string,
  search: string | undefined,
  status: 'active' | 'archived' | 'all',
) {
  const [summary] = await tx.$queryRaw<
    { tracked: number; inStock: number; outOfStock: number }[]
  >(Prisma.sql`
    SELECT COUNT(*)::int AS tracked,
      COUNT(*) FILTER (WHERE quantity > 0)::int AS "inStock",
      COUNT(*) FILTER (WHERE quantity = 0)::int AS "outOfStock"
    FROM (
      SELECT c.id, COALESCE(SUM(m."quantityDelta"), 0) AS quantity
      FROM catalog_items c
      LEFT JOIN stock_movements m ON m."catalogItemId" = c.id AND m."userId" = c."userId"
      WHERE c."userId" = ${userId} AND c.type = 'PRODUCT'
        AND c."stockTrackingStartedAt" IS NOT NULL
        ${status === 'all' ? Prisma.empty : Prisma.sql`AND c."isArchived" = ${status === 'archived'}`}
        ${search ? Prisma.sql`AND (c.name ILIKE ${`%${search}%`} OR c.sku ILIKE ${`%${search}%`})` : Prisma.empty}
      GROUP BY c.id
    ) balances
  `);
  return summary;
}
