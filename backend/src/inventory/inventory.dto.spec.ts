import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdjustStockDto,
  InventoryAvailabilityQueryDto,
  InventoryBalanceQueryDto,
  InventoryHistoryQueryDto,
  OpeningStockDto,
} from './inventory.dto';

const opening = {
  requestId: 'retry-1',
  reason: ' Current count ',
  effectiveDate: '2026-11-03',
  quantity: '1.250',
  unit: 'kg',
};
const convert = (input: object) =>
  plainToInstance(OpeningStockDto, input, { enableImplicitConversion: true });

describe('Inventory request contract', () => {
  it('validates bounded nonempty availability batches under implicit conversion', async () => {
    const convertIds = (ids: unknown) =>
      plainToInstance(InventoryAvailabilityQueryDto, { ids }, { enableImplicitConversion: true });
    expect(await validate(convertIds('product-a,product-b'))).toEqual([]);
    expect(convertIds('product-a,product-b').ids).toEqual(['product-a', 'product-b']);
    for (const ids of [
      undefined,
      '',
      'a,a',
      'a,',
      false,
      2,
      ['a', 2],
      'x'.repeat(101),
      Array.from({ length: 101 }, (_, i) => String(i)).join(','),
    ])
      expect((await validate(convertIds(ids))).length).toBeGreaterThan(0);
  });
  it('retains decimal strings and trims the reason without coercing input types', async () => {
    const dto = convert(opening);
    expect(await validate(dto)).toEqual([]);
    expect(dto.quantity).toBe('1.250');
    expect(dto.reason).toBe('Current count');
  });

  it.each([
    { quantity: 1.25 },
    { quantity: true },
    { quantity: null },
    { quantity: undefined },
    { quantity: '-1' },
    { quantity: '1.0000' },
    { quantity: '0.0001' },
    { quantity: '1e3' },
    { quantity: '1000000000000000' },
    { quantity: 'NaN' },
    { quantity: ' 1.25 ' },
    { reason: false },
    { unit: false },
    { unit: '' },
    { reason: ' ' },
    { reason: 'x'.repeat(501) },
    { requestId: ' ' },
    { requestId: 12 },
    { requestId: 'x'.repeat(101) },
    { effectiveDate: '2026-02-29' },
    { effectiveDate: '2026-11-03T00:00:00Z' },
    { effectiveDate: null },
  ])('rejects invalid input under global implicit conversion: %j', async (fields) => {
    expect((await validate(convert({ ...opening, ...fields }))).length).toBeGreaterThan(0);
  });

  it('accepts zero and the exact maximum; requires an explicit direction for adjustments', async () => {
    for (const quantity of ['0', '999999999999999.999'])
      expect(await validate(convert({ ...opening, quantity }))).toEqual([]);
    for (const direction of ['IN', 'OUT'])
      expect(await validate(plainToInstance(AdjustStockDto, { ...opening, direction }))).toEqual(
        [],
      );
    expect((await validate(plainToInstance(AdjustStockDto, opening))).length).toBeGreaterThan(0);
  });

  it('keeps default filters and bounds pagination and optional filter types', async () => {
    const defaults = plainToInstance(
      InventoryBalanceQueryDto,
      {},
      { enableImplicitConversion: true },
    );
    expect(await validate(defaults)).toEqual([]);
    expect(defaults).toMatchObject({ page: 1, limit: 20, status: 'active' });
    for (const query of [
      { page: 0 },
      { limit: 101 },
      { status: 'deleted' },
      { search: false },
      { status: null },
    ]) {
      expect(
        (
          await validate(
            plainToInstance(InventoryBalanceQueryDto, query, { enableImplicitConversion: true }),
          )
        ).length,
      ).toBeGreaterThan(0);
    }
    expect(
      (await validate(plainToInstance(InventoryHistoryQueryDto, { catalogItemId: null }))).length,
    ).toBeGreaterThan(0);
  });
});
