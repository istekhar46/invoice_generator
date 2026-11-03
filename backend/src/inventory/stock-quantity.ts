import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// NUMERIC(18,3). Keep API stock values as decimal strings, never binary floats.
export const MAX_STOCK_QUANTITY = '999999999999999.999';

export function stockQuantity(value: string | number): Prisma.Decimal {
  if (typeof value === 'string' && !/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new BadRequestException('Stock quantity must be a valid decimal.');
  }
  let quantity: Prisma.Decimal;
  try {
    quantity = new Prisma.Decimal(value);
  } catch {
    throw new BadRequestException('Stock quantity must be a valid decimal.');
  }
  if (
    !quantity.isFinite() ||
    quantity.lessThan(0) ||
    quantity.decimalPlaces() > 3 ||
    quantity.greaterThan(MAX_STOCK_QUANTITY)
  ) {
    throw new BadRequestException(
      `Stock quantity must be between 0 and ${MAX_STOCK_QUANTITY}, with at most 3 decimal places.`,
    );
  }
  return quantity;
}

interface StockLine {
  catalogItemId?: string | null;
  quantity: number;
}

/** Call only after catalog ownership/kind validation; untracked rows stay unchanged. */
export function aggregateStockQuantities(
  rows: readonly StockLine[],
  trackedProductIds: ReadonlySet<string>,
): Map<string, Prisma.Decimal> {
  const quantities = new Map<string, Prisma.Decimal>();
  for (const row of rows) {
    if (!row.catalogItemId || !trackedProductIds.has(row.catalogItemId)) continue;
    const quantity = stockQuantity(row.quantity);
    if (quantity.lessThan('0.01') || quantity.greaterThan(10000)) {
      throw new BadRequestException('Tracked invoice quantity must be between 0.01 and 10,000.');
    }
    const total = (quantities.get(row.catalogItemId) ?? new Prisma.Decimal(0)).plus(quantity);
    quantities.set(row.catalogItemId, stockQuantity(total.toString()));
  }
  return quantities;
}

/** Positive returns stock; negative consumes it. A caller must post atomically. */
export function planStockDeltas(
  previous: ReadonlyMap<string, Prisma.Decimal>,
  next: ReadonlyMap<string, Prisma.Decimal>,
): { catalogItemId: string; delta: Prisma.Decimal }[] {
  const ids = [...new Set([...previous.keys(), ...next.keys()])].sort();
  return ids.flatMap((catalogItemId) => {
    const before = previous.get(catalogItemId) ?? new Prisma.Decimal(0);
    const after = next.get(catalogItemId) ?? new Prisma.Decimal(0);
    const delta = before.minus(after);
    return delta.isZero() ? [] : [{ catalogItemId, delta }];
  });
}
