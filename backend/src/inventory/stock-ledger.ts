import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { MAX_STOCK_QUANTITY } from './stock-quantity';

export interface StockDelta {
  catalogItemId: string;
  delta: Prisma.Decimal;
}

export function stockRequestHash(payload: object) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/** Call with all affected products locked until transaction commit. */
export async function assertStockBalances(
  tx: Prisma.TransactionClient,
  userId: string,
  deltas: readonly StockDelta[],
) {
  if (!deltas.length) return;
  const sums = await tx.stockMovement.groupBy({
    by: ['catalogItemId'],
    where: { userId, catalogItemId: { in: deltas.map((item) => item.catalogItemId) } },
    _sum: { quantityDelta: true },
  });
  const balances = new Map(sums.map((sum) => [sum.catalogItemId, sum._sum.quantityDelta]));
  for (const { catalogItemId, delta } of deltas) {
    const available = balances.get(catalogItemId) ?? new Prisma.Decimal(0);
    const next = available.plus(delta);
    if (next.isNegative())
      throw new ConflictException({
        message: 'Insufficient stock.',
        details: {
          catalogItemId,
          available: available.toFixed(3),
          requested: delta.negated().toFixed(3),
        },
      });
    if (next.greaterThan(MAX_STOCK_QUANTITY))
      throw new ConflictException(`Stock balance cannot exceed ${MAX_STOCK_QUANTITY}.`);
  }
}
