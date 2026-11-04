import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { QuotationsPage } from './QuotationsPage'
import { sampleQuote } from '../test/fixtures/quotes'
import type { Quote } from '../types/quotes'
const mocks = vi.hoisted(() => ({
  quote: null as Quote | null,
  status: vi.fn(),
  convert: vi.fn(),
  refetch: vi.fn(),
  list: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: 'owner-a' } }),
}))
vi.mock('../hooks/useQuotes', () => ({
  useQuotes: (query: unknown) => mocks.list(query),
  useQuote: () => ({
    data: mocks.quote,
    isPending: false,
    error: null,
    refetch: mocks.refetch,
  }),
  useQuoteActions: () => ({
    status: { mutateAsync: mocks.status, isPending: false, error: null },
    convert: { mutateAsync: mocks.convert, isPending: false },
    save: { mutateAsync: vi.fn(), isPending: false },
  }),
}))
function setup(path = '/quotes?id=quote-1') {
  const router = createMemoryRouter(
    [{ path: '*', element: <QuotationsPage /> }],
    { initialEntries: [path] }
  )
  return { ...render(<RouterProvider router={router} />), router }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.quote = structuredClone(sampleQuote)
  mocks.list.mockReturnValue({
    data: {
      data: [sampleQuote],
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    isPending: false,
    error: null,
  })
  mocks.status.mockResolvedValue(sampleQuote)
  mocks.convert.mockResolvedValue({
    invoice: { id: 'invoice-1', invoiceNumber: 'INV-000001' },
    replayed: false,
  })
})
it('shows quotation labels, exact saved values and validity without invoice payment controls', () => {
  setup()
  expect(
    screen.getByRole('article', { name: 'Quotation preview' })
  ).toHaveTextContent('QUOTATION')
  expect(screen.getByText('Valid until (UTC): 2026-12-05')).toBeInTheDocument()
  expect(screen.getAllByText('$76.16').length).toBeGreaterThan(0)
  expect(screen.queryByText('Amount paid')).not.toBeInTheDocument()
  expect(screen.queryByText('Balance due')).not.toBeInTheDocument()
  expect(screen.queryByText('Pay by UPI')).not.toBeInTheDocument()
})
it('requires an explicit owner confirmation when issuing; never exposes acceptance on drafts', async () => {
  mocks.quote = { ...sampleQuote, status: 'DRAFT', version: 1 }
  setup()
  expect(
    screen.queryByRole('button', { name: 'Record acceptance' })
  ).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Issue quotation' }))
  expect(mocks.status).not.toHaveBeenCalled()
  expect(
    screen.getByText(/No email is sent and stock stays unchanged/)
  ).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(mocks.status).toHaveBeenCalledWith({
    id: 'quote-1',
    version: 1,
    status: 'ISSUED',
  })
})
it('keeps expired accepted quotes non-convertible but retains cancellation and PDF', () => {
  mocks.quote = { ...sampleQuote, isExpired: true }
  setup()
  expect(
    screen.queryByRole('button', { name: 'Convert to invoice' })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel quotation' })).toBeEnabled()
  expect(
    screen.getByRole('button', { name: 'Download quotation PDF' })
  ).toBeEnabled()
})
it('links to an existing target and hides repeat conversion/status changes', () => {
  mocks.quote = {
    ...sampleQuote,
    convertedInvoice: {
      id: 'invoice-1',
      invoiceNumber: 'INV-000012',
      status: 'VOIDED',
    },
  }
  setup()
  expect(screen.getByRole('link', { name: 'INV-000012' })).toHaveAttribute(
    'href',
    '/invoices?id=invoice-1'
  )
  expect(
    screen.queryByRole('button', { name: 'Convert to invoice' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Cancel quotation' })
  ).not.toBeInTheDocument()
})
it('reviews dates/number, preserves failed input, and opens the single returned draft invoice', async () => {
  mocks.convert.mockRejectedValueOnce(new Error('Number already used'))
  const { router } = setup()
  await userEvent.click(
    screen.getByRole('button', { name: 'Convert to invoice' })
  )
  await userEvent.type(screen.getByLabelText('Invoice number'), 'CUSTOM-001')
  await userEvent.click(
    screen.getByRole('button', { name: 'Create linked draft invoice' })
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Number already used'
  )
  expect(screen.getByLabelText('Invoice number')).toHaveValue('CUSTOM-001')
  await userEvent.click(
    screen.getByRole('button', { name: 'Create linked draft invoice' })
  )
  await waitFor(() => expect(router.state.location.pathname).toBe('/invoices'))
  expect(router.state.location.search).toBe('?id=invoice-1')
  expect(mocks.convert).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'quote-1',
      version: 3,
      invoiceNumber: 'CUSTOM-001',
    })
  )
})
it('filters before paging and resets the page when search changes', async () => {
  const { router } = setup('/quotes?page=2')
  await userEvent.type(screen.getByLabelText('Search quotations'), 'Logo')
  expect(router.state.location.search).not.toContain('page=2')
  expect(mocks.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, search: 'Logo' })
  )
  await userEvent.selectOptions(
    screen.getByLabelText('Quotation status'),
    'ACCEPTED'
  )
  expect(mocks.list).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: 'ACCEPTED' })
  )
})
