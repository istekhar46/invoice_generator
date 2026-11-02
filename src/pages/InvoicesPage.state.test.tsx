import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { InvoicesPage } from './InvoicesPage'

const fixture = vi.hoisted(() => ({
  id: 'invoice-one',
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
  useInvoice: (id: string) => ({
    data: id === fixture.id ? fixture : undefined,
  }),
}))
vi.mock('../hooks/useCompany', () => ({
  useCompanyProfile: () => ({ data: null }),
}))
vi.mock('../hooks/useCustomers', () => ({
  useCustomer: () => ({ data: null }),
}))
vi.mock('../hooks/usePDFGeneration', () => ({
  usePDFGeneration: () => ({
    downloadInvoicePDFDirect: vi.fn(),
    isGenerating: false,
    error: null,
  }),
}))
vi.mock('../components/features/invoices/InvoiceList', () => ({
  InvoiceList: ({
    onInvoiceEdit,
  }: {
    onInvoiceEdit: (invoice: unknown) => void
  }) => (
    <button
      onClick={() => onInvoiceEdit({ ...fixture, isQuickInvoice: false })}
    >
      Edit fixture
    </button>
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
      <InvoicesPage />
    </>
  )
}
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
