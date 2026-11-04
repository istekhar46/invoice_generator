import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PDFActions } from './PDFActions'
import { invoicePdfFixtures } from '../../../test/fixtures/invoicePdfs'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  download: vi.fn(),
  preview: vi.fn(),
}))
vi.mock('../../../services/api/invoiceApi', () => ({
  invoiceApi: { getInvoice: mocks.get },
}))
vi.mock('../../../hooks/useCompany', () => ({
  useCompanyProfile: () => ({ data: null }),
}))
vi.mock('../../../hooks/usePDFGeneration', () => ({
  usePDFGeneration: () => ({
    isGenerating: false,
    error: null,
    downloadInvoicePDFDirect: mocks.download,
    previewInvoicePDFDirect: mocks.preview,
    clearError: vi.fn(),
  }),
}))
const saved = {
  ...invoicePdfFixtures[0].invoice,
  isQuickInvoice: true,
  paymentUrl: 'https://rzp.io/i/stale',
}
const fresh = {
  ...saved,
  status: 'SENT',
  amountPaid: 120,
  paymentUrl: null,
  lineItems: saved.lineItems.map(item => ({
    ...item,
    type: item.type.toUpperCase(),
  })),
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue(fresh)
})
it('fetches current charges, paid balance and link before exporting a saved invoice', async () => {
  render(<PDFActions invoice={saved} />)
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  await waitFor(() => expect(mocks.download).toHaveBeenCalled())
  expect(mocks.get).toHaveBeenCalledWith(saved.id)
  expect(mocks.download.mock.calls[0][0]).toMatchObject({
    amountPaid: 120,
    paymentUrl: null,
    status: 'sent',
  })
})
it('shows read failures and never exports a cached payment link after a failed refresh', async () => {
  mocks.get.mockRejectedValue(new Error('Invoice could not be refreshed'))
  const onError = vi.fn()
  render(<PDFActions invoice={saved} onError={onError} />)
  fireEvent.click(screen.getByRole('button', { name: 'Preview PDF' }))
  await waitFor(() =>
    expect(onError).toHaveBeenCalledWith('Invoice could not be refreshed')
  )
  expect(mocks.preview).not.toHaveBeenCalled()
})
