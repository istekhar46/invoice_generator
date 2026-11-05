import { describe, expect, it } from 'vitest'
import { documentDirectUpi, documentPaymentUrl } from './invoiceDocument'
import { invoicePdfFixtures } from '../test/fixtures/invoicePdfs'
const invoice = invoicePdfFixtures.find(
  x => x.name === 'gateway-live-inr'
)!.invoice
const snapshot = {
  upiId: 'demo.shop@bank',
  payeeName: 'Shop & Co + Friends',
  reference: '1a'.repeat(16),
}
describe('Direct UPI document contract', () => {
  it('encodes receiving fields and invoice reference without query injection, using the outstanding amount', () => {
    const result = documentDirectUpi({
      ...invoice,
      invoiceNumber: 'INV & 1=2',
      total: 123.45,
      amountPaid: 23.4,
      directUpi: snapshot,
    })!
    const url = new URL(result.uri)
    expect(url.protocol).toBe('upi:')
    expect(url.hostname).toBe('pay')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      pa: snapshot.upiId,
      pn: snapshot.payeeName,
      am: '100.05',
      cu: 'INR',
      tr: snapshot.reference,
      tn: 'Invoice INV & 1=2',
    })
    expect(result.uri).not.toContain('+')
    expect(documentPaymentUrl({ ...invoice, directUpi: snapshot })).toBeNull()
  })
  it.each([
    { status: 'draft' as const },
    { status: 'paid' as const },
    { status: 'voided' as const },
    { currency: 'USD' },
    { id: '' },
    { total: 0, amountPaid: 0 },
    { directUpi: null },
    { directUpi: { ...snapshot, upiId: 'demo@bank&am=1' } },
    { directUpi: { ...snapshot, reference: 'internal-owner-invoice-id' } },
  ])('suppresses instructions for ineligible/malformed document %j', change => {
    expect(
      documentDirectUpi({ ...invoice, directUpi: snapshot, ...change })
    ).toBeNull()
  })
  it('keeps the saved payee and limits notes while amounts follow partial receipts', () => {
    const result = documentDirectUpi({
      ...invoice,
      invoiceNumber: 'x'.repeat(100),
      directUpi: snapshot,
      total: 50,
      amountPaid: 12.5,
    })!
    expect(result.upiId).toBe(snapshot.upiId)
    expect(new URL(result.uri).searchParams.get('am')).toBe('37.50')
    expect(new URL(result.uri).searchParams.get('tn')).toHaveLength(80)
  })
})
