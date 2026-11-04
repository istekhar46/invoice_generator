import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RecordUpiPaymentDto, ReversePaymentDto } from './payment.dto';
const valid = { requestId: 'valid-request', paymentDate: '2026-11-03', amount: '1.25' };
describe('Payment request validation', () => {
  it.each([
    { amount: 1.25 },
    { amount: null },
    { amount: '1.001' },
    { paymentDate: '2026-02-29' },
    { reference: false },
    { notes: null },
    { requestId: 'bad key' },
    { unknown: true },
  ])('rejects raw/precision/date/extra input %j', (fields) => {
    expect(
      validateSync(
        plainToInstance(
          RecordUpiPaymentDto,
          { ...valid, ...fields },
          { enableImplicitConversion: true },
        ),
        { whitelist: true, forbidNonWhitelisted: true },
      ).length,
    ).toBeGreaterThan(0);
  });
  it('trims descriptive inputs while retaining exact amount strings', () => {
    const dto = plainToInstance(RecordUpiPaymentDto, {
      ...valid,
      reference: ' UPI-123 ',
      notes: ' Note ',
    });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.reference).toBe('UPI-123');
    expect(dto.notes).toBe('Note');
  });
  it('requires an explicit correction reason', () => {
    expect(
      validateSync(
        plainToInstance(ReversePaymentDto, {
          requestId: 'reverse',
          paymentDate: '2026-11-03',
          reason: '  ',
        }),
      ).length,
    ).toBeGreaterThan(0);
  });
});
