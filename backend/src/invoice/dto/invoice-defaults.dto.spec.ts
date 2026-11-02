import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InvoiceDefaultsDto } from './invoice-defaults.dto';

const valid = { currency: 'INR', taxRate: 0, paymentTerms: 'Net 30', notes: '', terms: '' };
const errors = (data: object) =>
  validate(plainToInstance(InvoiceDefaultsDto, data), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('Invoice defaults contract', () => {
  it('accepts a zero tax rate and explicitly empty reusable text', async () => {
    expect(await errors(valid)).toHaveLength(0);
  });
  it.each([
    { currency: 'XYZ' },
    { currency: null },
    { taxRate: -0.1 },
    { taxRate: 1.1 },
    { taxRate: NaN },
    { paymentTerms: 'x'.repeat(201) },
    { notes: 'x'.repeat(1001) },
    { terms: null },
    { terms: 'x'.repeat(2001) },
    { userId: 'someone-else' },
    { quickCompanyName: 'Not a preference' },
    { amountPaid: 10 },
  ])('rejects invalid settings or invoice-only fields: %j', async (change) => {
    expect((await errors({ ...valid, ...change })).length).toBeGreaterThan(0);
  });
  it('requires all five settings when replacing defaults', async () => {
    expect((await errors({})).length).toBe(5);
  });
});
