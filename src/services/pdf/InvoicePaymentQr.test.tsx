// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { PDFGeneratorServiceImpl } from './pdfGenerator.service'
import {
  invoicePdfFixtures,
  pdfCompany,
  pdfCustomer,
} from '../../test/fixtures/invoicePdfs'
const encode = vi.hoisted(() => vi.fn())
vi.mock('../../utils/paymentQr', () => ({ paymentQrDataUrl: encode }))
const actual = await vi.importActual<typeof import('../../utils/paymentQr')>(
  '../../utils/paymentQr'
)
const invoice = invoicePdfFixtures.find(
  x => x.name === 'gateway-live-inr'
)!.invoice
beforeEach(() => {
  vi.resetAllMocks()
  encode.mockImplementation(actual.paymentQrDataUrl)
})
it('exports a payable saved invoice with a locally generated QR for its exact server-selected URL', async () => {
  const before = JSON.stringify(invoice)
  const blob = await new PDFGeneratorServiceImpl().generateInvoicePDF(
    invoice,
    pdfCompany,
    pdfCustomer
  )
  expect(encode).toHaveBeenCalledExactlyOnceWith(invoice.paymentUrl)
  expect(blob.size).toBeGreaterThan(2000)
  expect(JSON.stringify(invoice)).toBe(before)
})
it.each([
  { status: 'draft' as const },
  { status: 'voided' as const },
  { status: 'paid' as const, amountPaid: invoice.total },
  { currency: 'USD' },
  { id: '' },
  { paymentUrl: null },
  { paymentUrl: 'https://untrusted.example/pay' },
  { paymentUrl: 'javascript:alert(1)' },
])('does not encode an ineligible or unsafe destination: %j', async extra => {
  await new PDFGeneratorServiceImpl().generateInvoicePDF(
    { ...invoice, ...extra },
    pdfCompany,
    pdfCustomer
  )
  expect(encode).not.toHaveBeenCalled()
})
it('never adds payment QR content to a quotation', async () => {
  await new PDFGeneratorServiceImpl().generateInvoicePDF(
    invoice,
    pdfCompany,
    pdfCustomer,
    { status: 'Accepted' }
  )
  expect(encode).not.toHaveBeenCalled()
})
it('fails an export explicitly if QR generation fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  encode.mockRejectedValue(new Error('Encoder failed'))
  await expect(
    new PDFGeneratorServiceImpl().generateInvoicePDF(
      invoice,
      pdfCompany,
      pdfCustomer
    )
  ).rejects.toThrow('Failed to generate PDF')
})
