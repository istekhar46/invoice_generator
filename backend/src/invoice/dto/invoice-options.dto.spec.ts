import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { InvoiceOptionsDto } from './invoice-options.dto';
import { UpdateInvoiceDto } from './update-invoice.dto';
import { CreateQuickInvoiceDto } from './create-quick-invoice.dto';

describe('Invoice editor request contract', () => {
  it('accepts optional settings and trims invoice numbers', () => {
    const dto = plainToInstance(InvoiceOptionsDto, {
      invoiceNumber: ' INV-001 ',
      currency: 'KWD',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.invoiceNumber).toBe('INV-001');
  });
  it.each([null, -1, NaN, Infinity])('rejects invalid amount paid %s', (value) => {
    expect(
      validateSync(plainToInstance(CreateQuickInvoiceDto, { amountPaid: value })).some(
        (error) => error.property === 'amountPaid',
      ),
    ).toBe(true);
  });
  it.each(['isQuickInvoice', 'clientRequestId', 'amountPaid', 'importedGuestDraft'])(
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
    });
    expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
  });
});
