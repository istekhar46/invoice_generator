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
