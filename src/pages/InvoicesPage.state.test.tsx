import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { InvoicesPage } from './InvoicesPage'

const calls = vi.hoisted(() => ({
  getInvoice: vi.fn(),
  download: vi.fn(),
  detail: vi.fn(),
}))
vi.mock('../services/api/invoiceApi', () => ({
  invoiceApi: { getInvoice: calls.getInvoice },
}))
vi.mock('../components/features/payments/InvoicePaymentPanel', () => ({
  InvoicePaymentPanel: () => <p>Payment controls</p>,
}))

const fixture = vi.hoisted(() => ({
  id: 'invoice-one',
  userId: 'owner-one',
  currency: 'INR',
  amountPaid: 0,
  paymentUrl: 'https://rzp.io/i/stale-link',
  invoiceNumber: 'INV-ONE',
  customer: null,
  isQuickInvoice: true,
  lineItems: [],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  status: 'DRAFT',
  serviceDate: new Date(),
  dueDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
}))
vi.mock('../hooks/useInvoices', () => ({
  useInvoice: (id: string, options: unknown) => {
    calls.detail(id, options)
    return { data: id === fixture.id ? fixture : undefined }
  },
}))
vi.mock('../hooks/useCompany', () => ({
  useCompanyProfile: () => ({ data: null }),
}))
vi.mock('../hooks/useCustomers', () => ({
  useCustomer: () => ({ data: null }),
}))
vi.mock('../hooks/usePDFGeneration', () => ({
  usePDFGeneration: () => ({
    downloadInvoicePDFDirect: calls.download,
    isGenerating: false,
    error: null,
  }),
}))
vi.mock('../components/features/invoices/InvoiceList', () => ({
  InvoiceList: ({
    onInvoiceEdit,
    onInvoiceSelect,
  }: {
    onInvoiceEdit: (invoice: unknown) => void
    onInvoiceSelect: (invoice: unknown) => void
  }) => (
    <>
      <button onClick={() => onInvoiceSelect(fixture)}>Open fixture</button>
      <button
        onClick={() => onInvoiceEdit({ ...fixture, isQuickInvoice: false })}
      >
        Edit fixture
      </button>
    </>
  ),
}))
vi.mock('../components/features/invoices/InvoiceBuilder', () => ({
  InvoiceBuilder: ({ invoice }: { invoice?: { invoiceNumber: string } }) => (
    <p>
      {invoice ? `Editing ${invoice.invoiceNumber}` : 'Fresh standard invoice'}
    </p>
  ),
}))
vi.mock('../components/features/invoices/AccountQuickInvoiceBuilder', () => ({
  AccountQuickInvoiceBuilder: () => <p>Quick editor</p>,
}))
vi.mock('../components/guards/CompanySetupGuard', () => ({
  CompanySetupGuard: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('../components/features/invoices/InvoicePreview', () => ({
  InvoicePreview: () => <p>Fixture invoice preview</p>,
}))

function Harness() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => navigate('/invoices?create=true')}>
        New invoice route
      </button>
      <button onClick={() => navigate('/invoices?id=invoice-two')}>
        Another invoice route
      </button>
      <InvoicesPage />
    </>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.download.mockResolvedValue(undefined)
})

describe('Invoice page route state', () => {
  it('opens a deep-linked preview and removes it when closed', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices?id=invoice-one']}>
        <Harness />
      </MemoryRouter>
    )
    expect(
      await screen.findByText('Fixture invoice preview')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    expect(
      screen.queryByText('Fixture invoice preview')
    ).not.toBeInTheDocument()
  })
  it('switches from an existing invoice to a fresh form when the create route is requested', () => {
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Harness />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit fixture' }))
    expect(screen.getByText('Editing INV-ONE')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New invoice route' }))
    expect(screen.getByText('Fresh standard invoice')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to Invoices' }))
    expect(
      screen.getByRole('button', { name: 'Edit fixture' })
    ).toBeInTheDocument()
  })
})

it('subscribes to fresh detail data for an invoice opened from the list', async () => {
  render(
    <MemoryRouter initialEntries={['/invoices']}>
      <Harness />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open fixture' }))
  expect(await screen.findByText('Fixture invoice preview')).toBeInTheDocument()
  expect(calls.detail).toHaveBeenLastCalledWith(fixture.id, { staleTime: 0 })
})
it('does not show a previous list selection while a different deep-linked invoice loads', () => {
  render(
    <MemoryRouter initialEntries={['/invoices']}>
      <Harness />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open fixture' }))
  expect(screen.getByText('Fixture invoice preview')).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Another invoice route', hidden: true })
  )
  expect(calls.detail).toHaveBeenLastCalledWith('invoice-two', { staleTime: 0 })
  expect(screen.queryByText('Fixture invoice preview')).not.toBeInTheDocument()
  expect(screen.queryByText('Payment controls')).not.toBeInTheDocument()
})
it('fetches the current saved invoice before modal export, removing a stale payment URL', async () => {
  calls.getInvoice.mockResolvedValue({
    ...fixture,
    status: 'VOIDED',
    paymentUrl: null,
  })
  render(
    <MemoryRouter initialEntries={['/invoices?id=invoice-one']}>
      <Harness />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  await screen.findByRole('button', { name: 'Download PDF' })
  expect(calls.getInvoice).toHaveBeenCalledWith(fixture.id)
  expect(calls.download).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'voided', paymentUrl: null }),
    null,
    null
  )
})
it('keeps the invoice open with an error when fresh export data cannot be loaded', async () => {
  calls.getInvoice.mockRejectedValue(new Error('Current invoice unavailable'))
  render(
    <MemoryRouter initialEntries={['/invoices?id=invoice-one']}>
      <Harness />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Current invoice unavailable'
  )
  expect(calls.download).not.toHaveBeenCalled()
  expect(screen.getByText('Fixture invoice preview')).toBeInTheDocument()
})
