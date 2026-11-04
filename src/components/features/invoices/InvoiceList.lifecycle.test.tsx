import {
  render as renderUi,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvoiceList } from './InvoiceList'
import { InvoicePreview } from './InvoicePreview'
import { documentTotals } from '../../../utils/invoiceDocument'
const render = (ui: ReactNode) => renderUi(<MemoryRouter>{ui}</MemoryRouter>)

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  change: vi.fn(),
  prefetch: vi.fn(),
}))
vi.mock('../../../hooks/useInvoices', () => ({
  usePaginatedInvoices: () => ({
    data: { data: state.rows },
    isLoading: false,
    refetch: vi.fn(),
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      total: state.rows.length,
      limit: 20,
    },
  }),
  useDeleteInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateInvoiceStatus: () => ({
    mutateAsync: state.change,
    isPending: false,
  }),
}))
vi.mock('../../../hooks/usePrefetch', () => ({
  useAutoPrefetch: () => ({ smartPrefetch: state.prefetch }),
  usePrefetchOnHover: () => ({
    prefetchInvoice: vi.fn(),
    cancelPrefetch: vi.fn(),
  }),
  usePrefetchRelated: () => ({ prefetchCustomerInvoices: vi.fn() }),
}))
vi.mock('./PDFActions', () => ({ PDFActions: () => <span>PDF actions</span> }))

function invoice(status: string, amountPaid = 0) {
  return {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    status,
    amountPaid,
    total: 100,
    subtotal: 100,
    taxAmount: 0,
    taxRate: 0,
    currency: 'USD',
    lineItems: [],
    customer: null,
    quickCustomerName: 'Client',
    serviceDate: '2026-11-03',
    dueDate: '2026-12-03',
    createdAt: '2026-11-03',
    updatedAt: '2026-11-03',
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  state.change.mockResolvedValue({})
  state.rows = [invoice('DRAFT')]
})

describe('Invoice stock lifecycle controls', () => {
  it('routes INR receipts through explicit confirmation and retains history after reversal', async () => {
    state.rows = [{ ...invoice('SENT'), currency: 'INR' }]
    render(<InvoiceList />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    expect(
      screen.getByRole('link', { name: 'Record UPI payment' })
    ).toHaveAttribute('href', '/payments?invoice=invoice-1&record=true')
    expect(
      screen.getByRole('link', { name: 'Payment history' })
    ).toHaveAttribute('href', '/payments?invoice=invoice-1')
    expect(
      screen.queryByRole('button', { name: 'Mark as Paid' })
    ).not.toBeInTheDocument()
  })
  it('does not offer deleting a zero-paid draft with retained payment history', async () => {
    state.rows = [{ ...invoice('DRAFT'), hasPaymentHistory: true }]
    render(<InvoiceList />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    expect(
      screen.queryByRole('button', { name: 'Delete Invoice' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Payment history' })
    ).toBeInTheDocument()
  })
  it('issues drafts before payment and only offers deletion for unpaid drafts', async () => {
    const user = userEvent.setup()
    render(<InvoiceList />)
    await user.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    expect(
      screen.queryByRole('button', { name: 'Mark as Paid' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete Invoice' })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Issue invoice' }))
    await waitFor(() =>
      expect(state.change).toHaveBeenCalledWith({
        id: 'invoice-1',
        status: 'SENT',
      })
    )
  })

  it('retains converted drafts and offers stock-free cancellation instead of deletion', async () => {
    state.rows = [
      {
        ...invoice('DRAFT'),
        sourceQuoteId: 'quote-a',
        sourceQuote: { id: 'quote-a', quoteNumber: 'QT-000001' },
      },
    ]
    render(<InvoiceList />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    expect(
      screen.queryByRole('button', { name: 'Delete Invoice' })
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel draft' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(
      'Cancelling an unissued draft makes no stock change'
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel draft' })
    )
    await waitFor(() =>
      expect(state.change).toHaveBeenCalledWith({
        id: 'invoice-1',
        status: 'VOIDED',
      })
    )
  })

  it('requires confirmation before voiding an unpaid issued invoice', async () => {
    state.rows = [invoice('SENT')]
    const user = userEvent.setup()
    render(<InvoiceList />)
    await user.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    expect(
      screen.queryByRole('button', { name: 'Delete Invoice' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Void invoice' }))
    expect(state.change).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(
      'stock deducted by this invoice will be returned'
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Void invoice' })
    )
    await waitFor(() =>
      expect(state.change).toHaveBeenCalledWith({
        id: 'invoice-1',
        status: 'VOIDED',
      })
    )
  })

  it.each(['grid', 'list'])(
    'retains voided records as read-only in %s view',
    async view => {
      state.rows = [invoice('VOIDED')]
      const user = userEvent.setup()
      render(<InvoiceList />)
      if (view === 'list') await user.click(screen.getByTitle('List View'))
      expect(screen.getByRole('status')).toHaveTextContent('Voided')
      await user.click(
        screen.getByRole('button', { name: 'Actions for INV-001' })
      )
      expect(
        screen.getByText('Voided invoices are read-only.')
      ).toBeInTheDocument()
      for (const name of [
        'Edit Invoice',
        'Delete Invoice',
        'Mark as Paid',
        'Mark as Sent',
      ])
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  )

  it('shows stock conflicts with available quantities when issuing fails', async () => {
    state.change.mockRejectedValueOnce({
      message: 'Insufficient stock.',
      data: { details: { available: '1.250' } },
    })
    const user = userEvent.setup()
    render(<InvoiceList />)
    await user.click(
      screen.getByRole('button', { name: 'Actions for INV-001' })
    )
    await user.click(screen.getByRole('button', { name: 'Issue invoice' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Insufficient stock. Available stock: 1.250.'
    )
  })

  it('shows cancellation and zero balance without rewriting the original document total', () => {
    const cancelled = {
      status: 'voided' as const,
      subtotal: 100,
      total: 100,
      amountPaid: 0,
      taxRate: 0,
      taxAmount: 0,
      currency: 'USD',
      serviceDate: new Date('2026-11-03'),
      dueDate: new Date('2026-12-03'),
      lineItems: [],
    }
    expect(documentTotals(cancelled).balanceDue).toBe(0)
    expect(documentTotals({ ...cancelled, status: 'sent' }).balanceDue).toBe(
      100
    )
    render(<InvoicePreview invoice={cancelled} />)
    expect(
      screen.getByRole('heading', { name: 'VOIDED INVOICE' })
    ).toBeInTheDocument()
    expect(screen.getByText(/Balance due/).parentElement).toHaveTextContent(
      '$0.00'
    )
    expect(cancelled.total).toBe(100)
  })
})
