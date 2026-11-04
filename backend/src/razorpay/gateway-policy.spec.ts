import { refundApplied } from './gateway-policy';
import { minor, parseLink } from './gateway-provider.types';
import { upiLinkRequest } from './razorpay-provider';

describe('Gateway financial/provider contracts', () => {
  it('refunds original excess before reducing applied funds, across batches', () => {
    expect(refundApplied(10000n, 4000n, 0n, 5000n)).toBe(0n);
    expect(refundApplied(10000n, 4000n, 5000n, 2000n)).toBe(1000n);
    expect(refundApplied(10000n, 4000n, 7000n, 3000n)).toBe(3000n);
    expect(() => refundApplied(10000n, 4000n, 10000n, 1n)).toThrow('inconsistent');
  });
  it.each([1.5, -1, NaN, Infinity, '1e2', '1.00', '', Number.MAX_SAFE_INTEGER + 1])(
    'rejects inexact/invalid provider minor units %s',
    (value) => {
      expect(() => minor(value)).toThrow('inconsistent');
    },
  );
  it('creates a full-balance UPI-only request with no automatic notifications or contacts', () => {
    const request = upiLinkRequest('reference', 'source', 100n);
    expect(request).toMatchObject({
      amount: 100,
      currency: 'INR',
      accept_partial: false,
      customer: { name: 'Invoice customer' },
      notify: { sms: false, email: false, whatsapp: false },
      reminder_enable: false,
      notes: { invoiceo_link: 'source' },
    });
    expect(request.options.checkout.method).toEqual({
      upi: true,
      card: false,
      netbanking: false,
      wallet: false,
      emi: false,
      paylater: false,
    });
    expect(request.options.checkout.config.display.preferences.show_default_blocks).toBe(false);
  });
  it('accepts provider links only on the documented secure short-link host', () => {
    const row = {
      id: 'plink_123',
      reference_id: 'reference',
      amount: 100,
      amount_paid: 0,
      currency: 'INR',
      status: 'created',
      short_url: 'https://rzp.io/i/fictional',
      notes: { invoiceo_link: 'source' },
      payments: [],
    };
    expect(parseLink(row).amount).toBe(100n);
    for (const url of [
      'https://rzp.io.evil.test/a',
      'http://rzp.io/a',
      'https://user:password@rzp.io/a',
      'https://rzp.io:123/a',
    ])
      expect(() => parseLink({ ...row, short_url: url })).toThrow();
  });
});
