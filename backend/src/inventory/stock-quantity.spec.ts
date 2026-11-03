import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  aggregateStockQuantities,
  MAX_STOCK_QUANTITY,
  planStockDeltas,
  stockQuantity,
} from './stock-quantity';

describe('Stock quantity contract', () => {
  it.each(['0', '-0', '1.250', '0.001', MAX_STOCK_QUANTITY, 12.345])(
    'accepts exact opening/balance quantity %s without rounding',
    (value) => {
      expect(stockQuantity(value).equals(new Prisma.Decimal(value))).toBe(true);
    },
  );

  it.each([
    '',
    'invalid',
    '0xff',
    '1e3',
    ' 1 ',
    '-0.001',
    '0.0001',
    '1000000000000000',
    'NaN',
    'Infinity',
    NaN,
    Infinity,
  ])('rejects invalid, negative, over-precision or overflowing quantity %s', (value) => {
    expect(() => stockQuantity(value)).toThrow(BadRequestException);
  });

  it('sums duplicate tracked rows exactly and leaves untracked legacy quantities alone', () => {
    const quantities = aggregateStockQuantities(
      [
        { catalogItemId: 'product', quantity: 0.1 },
        { catalogItemId: 'product', quantity: 0.2 },
        { catalogItemId: 'untracked', quantity: 1.23456 },
        { quantity: 1.23456 },
      ],
      new Set(['product']),
    );
    expect([...quantities.keys()]).toEqual(['product']);
    expect(quantities.get('product')?.toString()).toBe('0.3');
  });

  it.each([0, 0.001, 10000.001, 0.1234])(
    'rejects tracked invoice quantity %s outside the existing bounds or precision',
    (quantity) => {
      expect(() =>
        aggregateStockQuantities([{ catalogItemId: 'product', quantity }], new Set(['product'])),
      ).toThrow(BadRequestException);
    },
  );

  it('rejects a binary floating-point artifact rather than silently rounding an invoice', () => {
    expect(() => stockQuantity(0.1 + 0.2)).toThrow(BadRequestException);
  });

  it('plans grouped net movements in deterministic item order', () => {
    const before = aggregateStockQuantities(
      [
        { catalogItemId: 'z', quantity: 3 },
        { catalogItemId: 'a', quantity: 0.1 },
        { catalogItemId: 'a', quantity: 0.2 },
      ],
      new Set(['a', 'b', 'z']),
    );
    const after = aggregateStockQuantities(
      [
        { catalogItemId: 'a', quantity: 0.4 },
        { catalogItemId: 'b', quantity: 1.25 },
      ],
      new Set(['a', 'b', 'z']),
    );
    expect(
      planStockDeltas(before, after).map((row) => [row.catalogItemId, row.delta.toString()]),
    ).toEqual([
      ['a', '-0.1'],
      ['b', '-1.25'],
      ['z', '3'],
    ]);
    expect(before.get('a')?.toString()).toBe('0.3');
  });

  it('creates no movement when row order/splitting changes without changing quantities', () => {
    const tracked = new Set(['product']);
    const before = aggregateStockQuantities(
      [
        { catalogItemId: 'product', quantity: 0.1 },
        { catalogItemId: 'product', quantity: 0.2 },
      ],
      tracked,
    );
    const after = aggregateStockQuantities([{ catalogItemId: 'product', quantity: 0.3 }], tracked);
    expect(planStockDeltas(before, after)).toEqual([]);
    expect(planStockDeltas(after, after)).toEqual([]);
  });
});
