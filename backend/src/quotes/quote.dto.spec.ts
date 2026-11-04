import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuoteDto, QuoteStatusDto, ConvertQuoteDto } from './quote.dto';
import { quoteExpired } from './quote.service';
const input = {
  clientRequestId: 'quote-request',
  customerId: 'customer',
  quoteDate: '2026-11-05',
  validUntil: '2026-12-05',
  taxRate: 0.05,
  lineItems: [{ type: 'PRODUCT', description: 'Logo', unit: 'PCS', quantity: 2, rate: 1 }],
};
const options = { enableImplicitConversion: true };
describe('Quotation request contracts', () => {
  it('accepts a complete draft without payment or status fields', async () => {
    expect(await validate(plainToInstance(CreateQuoteDto, input, options))).toEqual([]);
  });
  it.each([
    { quoteDate: '2026-02-29' },
    { quoteDate: '2026-11-05T00:00:00Z' },
    { validUntil: null },
    { customerId: false },
    { lineItems: [] },
    { lineItems: Array.from({ length: 101 }, () => input.lineItems[0]) },
    { clientRequestId: true },
    { clientRequestId: 'has spaces' },
    { taxRate: 1.01 },
  ])('rejects invalid quotation data %j', async (extra) => {
    expect(
      (await validate(plainToInstance(CreateQuoteDto, { ...input, ...extra }, options))).length,
    ).toBeGreaterThan(0);
  });
  it('rejects invented lifecycle states and invalid versions/dates', async () => {
    expect(
      (await validate(plainToInstance(QuoteStatusDto, { version: 1, status: 'PAID' }, options)))
        .length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(
            ConvertQuoteDto,
            { version: 0, serviceDate: '2026-02-30', dueDate: '2026-12-05' },
            options,
          ),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('keeps quotes valid through their full UTC validity date', () => {
    const date = new Date('2026-11-05T00:00:00.000Z');
    expect(quoteExpired(date, '2026-11-04')).toBe(false);
    expect(quoteExpired(date, '2026-11-05')).toBe(false);
    expect(quoteExpired(date, '2026-11-06')).toBe(true);
  });
});
