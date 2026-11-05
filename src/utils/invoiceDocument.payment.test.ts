import { describe, expect, it } from 'vitest'
import { documentPaymentUrl } from './invoiceDocument'
import { invoicePdfFixtures } from '../test/fixtures/invoicePdfs'
import { transformInvoiceResponse } from './apiTransformers'

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
  it('retains the Live URL after transforming the actual API contract without an owner ID', () => {
    const dto = {
      ...invoice,
      customer: null,
      status: 'SENT' as const,
      lineItems: invoice.lineItems.map(item => ({
        ...item,
        type:
          item.type === 'product' ? ('PRODUCT' as const) : ('SERVICE' as const),
      })),
    }
    Reflect.deleteProperty(dto, 'userId')
    const current = transformInvoiceResponse(dto)
    expect(current.userId).toBe('')
    expect(documentPaymentUrl(current)).toBe(invoice.paymentUrl)
  })
  it.each([
    { id: '' },
    { status: 'draft' as const },
    { status: 'paid' as const },
    { status: 'voided' as const },
    { currency: 'USD' },
    { amountPaid: invoice.total },
    { paymentUrl: null },
    { paymentUrl: 'javascript:alert(1)' },
    { paymentUrl: 'https://rzp.io.evil.test/abc' },
    { paymentUrl: 'https://user:secret@rzp.io/abc' },
    { paymentUrl: 'https://rzp.io:444/abc' },
  ])('omits unavailable, guest, unsafe and non-payable links %j', extra => {
    expect(documentPaymentUrl({ ...invoice, ...extra })).toBeNull()
  })
})
