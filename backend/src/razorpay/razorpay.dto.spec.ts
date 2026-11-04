import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SaveRazorpayConnectionDto } from './razorpay.dto';
const valid = { keyId: 'rzp_test_Fictional001', keySecret: 'fictional-secret' };
describe('Razorpay credential input', () => {
  it.each([
    { keyId: false },
    { keySecret: 123 },
    { keySecret: null },
    { keySecret: '' },
    { keySecret: ' padded ' },
    { keyId: 'wrong-prefix' },
    { keyId: 'rzp_test_has space' },
    { keySecret: 'x'.repeat(257) },
    { extra: true },
  ])('rejects invalid raw input %j', (fields) => {
    expect(
      validateSync(
        plainToInstance(
          SaveRazorpayConnectionDto,
          { ...valid, ...fields },
          { enableImplicitConversion: true },
        ),
        { whitelist: true, forbidNonWhitelisted: true },
      ).length,
    ).toBeGreaterThan(0);
  });
  it('retains secret bytes without trimming or case changes', () => {
    const dto = plainToInstance(SaveRazorpayConnectionDto, valid);
    expect(validateSync(dto)).toEqual([]);
    expect(dto).toEqual(valid);
  });
});
