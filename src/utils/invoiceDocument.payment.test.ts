import { describe, expect, it } from 'vitest'
import { documentPaymentUrl } from './invoiceDocument'
import { invoicePdfFixtures } from '../test/fixtures/invoicePdfs'

const invoice = {
  ...invoicePdfFixtures[0].invoice,
  userId: 'owner',
  status: 'sent' as const,
  paymentUrl: 'https://rzp.io/i/fictional',
}
describe('Invoice payment URL eligibility', () => {
  it('shows the server-selected URL on a saved payable INR invoice', () => {
    expect(documentPaymentUrl(invoice)).toBe(invoice.paymentUrl)
  })
  it.each([
    { userId: '' },
    { status: 'draft' as const },
    { status: 'paid' as const },
    { status: 'voided' as const },
    { currency: 'USD' },
    { amountPaid: invoice.total },
    { paymentUrl: null },
    { paymentUrl: 'javascript:alert(1)' },
    { paymentUrl: 'https://rzp.io.evil.test/abc' },
    { paymentUrl: 'https://user:secret@rzp.io/abc' },
  ])('omits unavailable, guest, unsafe and non-payable links %j', extra => {
    expect(documentPaymentUrl({ ...invoice, ...extra })).toBeNull()
  })
})
