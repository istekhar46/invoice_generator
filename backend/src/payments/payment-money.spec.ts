import { paidCache, paidStatus, paymentAmount, savedMinor, upiMinor } from './payment-money';
describe('Exact payment money', () => {
  it.each([
    ['0.01', 1n],
    ['1.25', 125n],
    ['0001.2', 120n],
    ['90071992547409.91', 9007199254740991n],
  ])('parses exact INR %s', (value, expected) => {
    expect(upiMinor(value)).toBe(expected);
  });
  it.each([
    '0',
    '0.00',
    '-1',
    '1e3',
    '1.001',
    '1.',
    'NaN',
    '90071992547409.92',
    '100000000000000',
    ' 1',
  ])('rejects invalid new receipt %s', (value) => {
    expect(() => upiMinor(value)).toThrow();
  });
  it('keeps existing half-away currency rounding and exact string formatting', () => {
    expect(savedMinor(0.335, 'USD')).toBe(34n);
    expect(savedMinor(1.005, 'INR')).toBe(101n);
    expect(savedMinor(123.4, 'JPY')).toBe(123n);
    expect(savedMinor(0.1234, 'KWD')).toBe(123n);
    expect(paymentAmount(-125n, 'INR')).toBe('-1.25');
    expect(paymentAmount(1n, 'KWD')).toBe('0.001');
    expect(paymentAmount(123n, 'JPY')).toBe('123');
    expect(paidCache(125n, 'INR')).toBe(1.25);
    expect(() => paidCache(9007199254740991n, 'INR')).toThrow();
  });
  it('derives settlement without issuing drafts or reopening cancelled/zero-total records', () => {
    expect(paidStatus('DRAFT', 100n, 100n)).toBe('DRAFT');
    expect(paidStatus('SENT', 100n, 100n)).toBe('PAID');
    expect(paidStatus('PAID', 100n, 50n)).toBe('SENT');
    expect(paidStatus('VOIDED', 100n, 0n)).toBe('VOIDED');
    expect(paidStatus('SENT', 0n, 0n)).toBe('SENT');
    expect(paidStatus('PAID', 0n, 0n)).toBe('PAID');
    expect(() => paidStatus('SENT', 100n, 101n)).toThrow();
  });
});
