import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { PublicInvoicePage } from './PublicInvoicePage'
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  generate: vi.fn(),
  download: vi.fn(),
}))
vi.mock('../services/api/invoiceSharingApi', async importOriginal => ({
  ...(await importOriginal<
    typeof import('../services/api/invoiceSharingApi')
  >()),
  readPublicInvoice: mocks.read,
}))
vi.mock('../services/pdf/pdfGenerator.service', () => ({
  pdfGeneratorService: {
    generateInvoicePDF: mocks.generate,
    downloadPDF: mocks.download,
  },
}))
vi.mock('../components/features/invoices/InvoicePreview', () => ({
  InvoicePreview: ({
    invoice,
  }: {
    invoice: { invoiceNumber: string; paymentUrl?: string | null }
  }) => (
    <div>
      {invoice.invoiceNumber}
      {invoice.paymentUrl && <a href={invoice.paymentUrl}>Checkout</a>}
    </div>
  ),
}))
const document = {
  documentId: 'public-render-id',
  invoiceNumber: 'SHARED-001',
  status: 'SENT',
  serviceDate: '2026-11-05',
  dueDate: '2026-11-06',
  createdAt: '2026-11-05',
  updatedAt: '2026-11-05',
  subtotal: 1,
  taxRate: 0,
  taxAmount: 0,
  total: 1,
  amountPaid: 0,
  currency: 'INR',
  discountType: 'percentage',
  discountValue: 0,
  shippingAmount: 0,
  notes: '',
  paymentUrl: 'https://rzp.io/i/fictional',
  lineItems: [],
  company: null,
  customer: null,
}
function Harness() {
  const navigate = useNavigate()
  return (
    <>
      <button
        onClick={() => navigate('/shared/invoice#second.capability.signature')}
      >
        Different invoice
      </button>
      <PublicInvoicePage />
    </>
  )
}
function mount(route = '/shared/invoice#first.capability.signature') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Harness />
    </MemoryRouter>
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.read.mockResolvedValue(document)
  mocks.generate.mockResolvedValue(new Blob(['pdf']))
})
it('shows the anonymous document and fetches fresh data before downloading without using owner APIs', async () => {
  mount()
  await screen.findByText('SHARED-001')
  mocks.read.mockResolvedValueOnce({
    ...document,
    status: 'PAID',
    amountPaid: 1,
    paymentUrl: null,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce())
  expect(mocks.read).toHaveBeenCalledTimes(2)
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'paid',
      amountPaid: 1,
      paymentUrl: null,
    }),
    null,
    null
  )
  expect(
    screen.queryByRole('link', { name: 'Checkout' })
  ).not.toBeInTheDocument()
})
it('clears displayed invoice/checkout and prevents export if the share is revoked before download', async () => {
  mount()
  await screen.findByText('SHARED-001')
  mocks.read.mockRejectedValueOnce(
    new Error('This invoice link is unavailable.')
  )
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('unavailable')
  expect(screen.queryByText('SHARED-001')).not.toBeInTheDocument()
  expect(mocks.generate).not.toHaveBeenCalled()
})
it('removes old checkout while refreshing and shows current cancellation', async () => {
  mount()
  await screen.findByText('SHARED-001')
  let resolve: (value: unknown) => void = () => {}
  mocks.read.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Refresh invoice' }))
  expect(
    screen.queryByRole('link', { name: 'Checkout' })
  ).not.toBeInTheDocument()
  await act(async () =>
    resolve({ ...document, status: 'VOIDED', paymentUrl: null })
  )
  expect(
    await screen.findByText('This invoice is cancelled. No payment is due.')
  ).toBeInTheDocument()
})
it('discards a late result for a previous token after fragment navigation', async () => {
  let resolve: (value: unknown) => void = () => {}
  mocks.read.mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  mocks.read.mockResolvedValueOnce({ ...document, invoiceNumber: 'SECOND' })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Different invoice' }))
  await screen.findByText('SECOND')
  await act(async () => resolve(document))
  expect(screen.queryByText('SHARED-001')).not.toBeInTheDocument()
  expect(screen.getByText('SECOND')).toBeInTheDocument()
})
it('does not request data for a missing or malformed token', async () => {
  mount('/shared/invoice#invalid')
  expect(await screen.findByRole('alert')).toHaveTextContent('unavailable')
  expect(mocks.read).not.toHaveBeenCalled()
})
