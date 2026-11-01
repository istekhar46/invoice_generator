import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { InvoiceOptionsDto } from './invoice-options.dto';
import { UpdateInvoiceDto } from './update-invoice.dto';

describe('Invoice editor request contract', () => {
  it('accepts optional settings and trims invoice numbers', () => {
    const dto = plainToInstance(InvoiceOptionsDto, {
      invoiceNumber: ' INV-001 ',
      currency: 'KWD',
      amountPaid: 0,
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.invoiceNumber).toBe('INV-001');
  });
  it.each([null, -1, NaN, Infinity])('rejects invalid amount paid %s', (value) => {
    expect(
      validateSync(plainToInstance(InvoiceOptionsDto, { amountPaid: value })).some(
        (error) => error.property === 'amountPaid',
      ),
    ).toBe(true);
  });
  it.each(['isQuickInvoice', 'clientRequestId'])(
    'rejects changes to immutable creation field %s',
    (field) => {
      const dto = plainToInstance(UpdateInvoiceDto, {
        [field]: field === 'isQuickInvoice' ? true : 'another-key',
      });
      expect(
        validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).some(
          (error) => error.property === field,
        ),
      ).toBe(true);
    },
  );
  it('allows updating quick-invoice details without creation-only fields', () => {
    const dto = plainToInstance(UpdateInvoiceDto, {
      quickCustomerName: 'Updated client',
      terms: '',
      currency: 'INR',
      amountPaid: 300,
    });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
});
