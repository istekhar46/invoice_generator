import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { InvoicePaymentPanel } from './InvoicePaymentPanel'
import { invoicePdfFixtures } from '../../../test/fixtures/invoicePdfs'
import type { Invoice } from '../../../types/entities'
const mocks = vi.hoisted(() => ({
  setup: vi.fn(),
  links: vi.fn(),
  command: vi.fn(),
  setupRetry: vi.fn(),
  linksRetry: vi.fn(),
  create: vi.fn(),
}))
vi.mock('../../../hooks/useRazorpay', () => ({ useRazorpaySetup: mocks.setup }))
vi.mock('../../../hooks/useGateway', () => ({
  useGatewayLinks: mocks.links,
  useGatewayCommand: () => ({
    mutate: mocks.command,
    isPending: false,
    error: null,
  }),
}))
vi.mock('./CreatePaymentLinkDialog', () => ({
  CreatePaymentLinkDialog: (props: unknown) => {
    mocks.create(props)
    return <div>Review Live link creation</div>
  },
}))
const invoice = invoicePdfFixtures.find(
  x => x.name === 'gateway-live-inr'
)!.invoice
const active = {
  id: 'link-current',
  invoiceId: invoice.id,
  mode: 'LIVE',
  state: 'ACTIVE',
  synchronizedAt: null,
  lastError: null,
}
function mount(value: Invoice = invoice, refreshing = false) {
  return render(
    <MemoryRouter>
      <InvoicePaymentPanel invoice={value} refreshing={refreshing} />
    </MemoryRouter>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.setup.mockReturnValue({
    data: {
      setupAvailable: true,
      connections: [{ mode: 'LIVE', enabled: true }],
    },
    isPending: false,
    error: null,
    refetch: mocks.setupRetry,
  })
  mocks.links.mockReturnValue({
    data: { data: [] },
    isPending: false,
    error: null,
    refetch: mocks.linksRetry,
  })
})
it('uses explicit Live invoice-scoped creation and the existing review dialog', () => {
  mount({ ...invoice, paymentUrl: null })
  expect(mocks.links).toHaveBeenCalledWith({
    mode: 'LIVE',
    invoiceId: invoice.id,
    limit: 1,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create payment link' }))
  expect(screen.getByText('Review Live link creation')).toBeInTheDocument()
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ mode: 'LIVE', initialInvoiceId: invoice.id })
  )
  expect(mocks.command).not.toHaveBeenCalled()
})
it('does not treat a Test-only merchant connection as Live checkout setup', () => {
  mocks.setup.mockReturnValue({
    data: {
      setupAvailable: true,
      connections: [{ mode: 'TEST', enabled: true }],
    },
    isPending: false,
  })
  mount({ ...invoice, paymentUrl: null })
  expect(
    screen.getByRole('link', { name: 'Payment settings' })
  ).toHaveAttribute('href', '/payments/settings')
  expect(
    screen.queryByRole('button', { name: 'Create payment link' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Open checkout' })
  ).not.toBeInTheDocument()
})
it.each([
  { status: 'draft' as const },
  { status: 'paid' as const, amountPaid: invoice.total },
  { status: 'voided' as const },
  { currency: 'USD' },
])('keeps ineligible invoice %j out of online payment actions', extra => {
  mount({ ...invoice, ...extra })
  expect(
    screen.getByRole('link', { name: 'Payment history' })
  ).toBeInTheDocument()
  expect(mocks.setup).not.toHaveBeenCalled()
  expect(mocks.links).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('button', { name: 'Create payment link' })
  ).not.toBeInTheDocument()
})
it('copies the selected server URL, refreshes the same link and requires cancellation confirmation', async () => {
  mocks.links.mockReturnValue({ data: { data: [active] }, isPending: false })
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  mount()
  expect(screen.getByRole('link', { name: 'Open checkout' })).toHaveAttribute(
    'href',
    invoice.paymentUrl
  )
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  await screen.findByText('Payment link copied.')
  expect(writeText).toHaveBeenCalledWith(invoice.paymentUrl)
  fireEvent.click(
    screen.getByRole('button', { name: 'Refresh payment status' })
  )
  expect(mocks.command).toHaveBeenLastCalledWith({
    type: 'refresh',
    id: active.id,
  })
  mocks.command.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel payment link' }))
  expect(mocks.command).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect(mocks.command).toHaveBeenCalledWith(
    { type: 'cancel', id: active.id },
    expect.anything()
  )
})
it('reports clipboard failures without claiming a link was copied', async () => {
  mocks.links.mockReturnValue({ data: { data: [active] }, isPending: false })
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy')
  expect(screen.queryByText('Payment link copied.')).not.toBeInTheDocument()
})
it('shows unresolved provider state with refresh/retry, without creating another link', () => {
  mocks.links.mockReturnValue({
    data: {
      data: [
        {
          ...active,
          state: 'UNKNOWN',
          lastError: 'Provider state is uncertain.',
        },
      ],
    },
    isPending: false,
  })
  mount({ ...invoice, paymentUrl: null })
  expect(screen.getByText('Payment link: Needs refresh')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Provider state is uncertain'
  )
  expect(
    screen.queryByRole('button', { name: 'Create payment link' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry link creation' }))
  expect(mocks.command).toHaveBeenCalledWith({ type: 'retry', id: active.id })
})
it('exposes fetch errors and retries setup/history without permitting payment creation', async () => {
  mocks.links.mockReturnValue({
    error: new Error('Payment links unavailable'),
    isPending: false,
    refetch: mocks.linksRetry,
  })
  mount({ ...invoice, paymentUrl: null })
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Payment links unavailable'
  )
  expect(
    screen.queryByRole('button', { name: 'Create payment link' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry payments' }))
  await waitFor(() => expect(mocks.linksRetry).toHaveBeenCalledOnce())
  expect(mocks.setupRetry).toHaveBeenCalledOnce()
})
it('withholds the old checkout destination while the invoice is being refreshed', () => {
  mocks.links.mockReturnValue({ data: { data: [active] }, isPending: false })
  mount(invoice, true)
  expect(
    screen.queryByRole('link', { name: 'Open checkout' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Copy link' })
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Refresh payment status' })
  ).toBeDisabled()
})
