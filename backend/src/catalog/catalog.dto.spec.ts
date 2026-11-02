import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CatalogQueryDto, CreateCatalogItemDto, UpdateCatalogItemDto } from './catalog.dto';

const valid = {
  type: 'SERVICE',
  name: 'Consultation',
  description: '',
  unit: 'hour',
  rate: 75,
  currency: 'USD',
};

describe('Catalog API validation', () => {
  it('normalizes a valid item and permits clearing an optional SKU', async () => {
    const dto = plainToInstance(CreateCatalogItemDto, {
      ...valid,
      name: ' Consultation ',
      sku: ' sku-1 ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('Consultation');
    expect(dto.sku).toBe('SKU-1');
    expect(await validate(plainToInstance(UpdateCatalogItemDto, { sku: null }))).toEqual([]);
  });

  it.each([
    { type: 'MATERIAL' },
    { name: ' ' },
    { unit: '' },
    { rate: -1 },
    { rate: Infinity },
    { rate: 100001 },
    { currency: 'XYZ' },
    { description: 'x'.repeat(251) },
  ])('rejects invalid create fields %j', async (fields) => {
    expect(
      (await validate(plainToInstance(CreateCatalogItemDto, { ...valid, ...fields }))).length,
    ).toBeGreaterThan(0);
  });

  it.each(['type', 'name', 'description', 'unit', 'rate', 'currency', 'isArchived'])(
    'rejects null updates to %s',
    async (field) => {
      const dto = plainToInstance(UpdateCatalogItemDto, { [field]: null });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    },
  );

  it('does not coerce the string false into an archive action', async () => {
    const dto = plainToInstance(
      UpdateCatalogItemDto,
      { isArchived: 'false' },
      { enableImplicitConversion: true },
    );
    expect((await validate(dto)).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(UpdateCatalogItemDto, { isArchived: false }))).toEqual(
      [],
    );
  });

  it('bounds pagination and rejects unsupported filters', async () => {
    expect(
      await validate(plainToInstance(CatalogQueryDto, { page: '2', limit: '10', type: 'SERVICE' })),
    ).toEqual([]);
    expect(
      (await validate(plainToInstance(CatalogQueryDto, { page: 0, limit: 101, status: 'deleted' })))
        .length,
    ).toBe(3);
  });
});
