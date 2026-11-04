// SDK uses export=; match the production CommonJS import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Razorpay = require('razorpay');
import { RazorpayProvider } from './razorpay-provider';
jest.mock('razorpay');
const all = jest.fn();
const MockRazorpay = jest.mocked(Razorpay);
describe('Razorpay read-only verification', () => {
  beforeEach(() => {
    MockRazorpay.mockImplementation(() => ({ paymentLink: { all } }) as unknown as Razorpay);
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  const credentials = { keyId: 'rzp_test_Fictional', keySecret: 'private-secret' };
  it('uses the official SDK to list one link without writes', async () => {
    all.mockResolvedValue({ payment_links: [] });
    await new RazorpayProvider().verify(credentials);
    expect(MockRazorpay).toHaveBeenCalledWith({
      key_id: credentials.keyId,
      key_secret: credentials.keySecret,
    });
    expect(all).toHaveBeenCalledWith({ count: 1 });
  });
  it.each([400, 401, 403, 429, 500])('redacts provider failure %i', async (statusCode) => {
    all.mockRejectedValue({ statusCode, error: { description: credentials.keySecret } });
    await expect(new RazorpayProvider().verify(credentials)).rejects.toThrow(
      statusCode < 429 ? 'did not accept' : 'could not be reached',
    );
  });
  it('bounds a stalled check and safely ignores its late read response', async () => {
    jest.useFakeTimers();
    let resolve!: (value: object) => void;
    all.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const result = new RazorpayProvider().verify(credentials);
    const rejected = expect(result).rejects.toThrow('could not be reached');
    await jest.advanceTimersByTimeAsync(7000);
    await rejected;
    resolve({ payment_links: [] });
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('Razorpay authenticated payment source metadata', () => {
  const credentials = { keyId: 'rzp_test_Fictional', keySecret: 'private-secret' };
  const fetchPayment = jest.fn();
  const fetchRefunds = jest.fn();
  const payment = {
    id: 'pay_Parent',
    amount: 100,
    currency: 'INR',
    method: 'upi',
    order_id: 'order_Parent',
    status: 'captured',
    captured: true,
    created_at: 1793800000,
  };

  beforeEach(() => {
    MockRazorpay.mockImplementation(
      () =>
        ({
          payments: { fetch: fetchPayment, fetchMultipleRefund: fetchRefunds },
        }) as unknown as Razorpay,
    );
    fetchRefunds.mockResolvedValue({ items: [] });
  });

  it('reads the source hint from authenticated payment notes', async () => {
    fetchPayment.mockResolvedValue({ ...payment, notes: { invoiceo_link: 'owned-link-id' } });
    const result = await new RazorpayProvider().fetchPayment(credentials, payment.id);
    expect(result.sourceId).toBe('owned-link-id');
    expect(fetchPayment).toHaveBeenCalledWith(payment.id);
  });

  it.each([undefined, [], {}, { other: 'value' }, { invoiceo_link: 123 }])(
    'does not invent a source for unrelated payment notes %p',
    async (notes) => {
      fetchPayment.mockResolvedValue({ ...payment, notes });
      const result = await new RazorpayProvider().fetchPayment(credentials, payment.id);
      expect(result.sourceId).toBeNull();
    },
  );
});
