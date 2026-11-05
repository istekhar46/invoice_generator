import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DirectUpiDetailsDto } from './direct-upi.dto';

const valid = { upiId: 'business.demo@bank', payeeName: 'Demo & Company' };
const check = (data: object) =>
  validate(plainToInstance(DirectUpiDetailsDto, data, { enableImplicitConversion: true }), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
describe('Direct UPI preferences', () => {
  it('trims receiving details without changing the UPI ID case', async () => {
    const result = plainToInstance(DirectUpiDetailsDto, {
      upiId: ' Demo@bank ',
      payeeName: ' Demo Shop ',
    });
    expect(await validate(result)).toEqual([]);
    expect(result).toEqual({ upiId: 'Demo@bank', payeeName: 'Demo Shop' });
  });
  it.each([
    { upiId: 'upi://pay?pa=demo@bank' },
    { upiId: 'demo@bank&pn=Other' },
    { upiId: 'demo@bank@other' },
    { upiId: 'demo bank@bank' },
    { upiId: 'x'.repeat(256) + '@bank' },
    { upiId: 12 },
    { upiId: null },
    { payeeName: 123 },
    { payeeName: true },
    { payeeName: null },
    { payeeName: ' ' },
    { payeeName: 'x'.repeat(81) },
    { payeeName: 'Hidden\u202ename' },
    { payeeName: 'Bad\nName' },
    { userId: 'another-owner' },
    { reference: 'injected' },
  ])('rejects invalid or additional fields %j', async (change) => {
    expect((await check({ ...valid, ...change })).length).toBeGreaterThan(0);
  });
});
