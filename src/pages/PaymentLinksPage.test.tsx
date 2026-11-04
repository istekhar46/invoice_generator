import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentLinksPage } from './PaymentLinksPage'
import { CreatePaymentLinkDialog } from '../components/features/payments/CreatePaymentLinkDialog'
import type { GatewayLink } from '../types/razorpay'

const mocks = vi.hoisted(() => ({
  owner: 'owner-a',
  list: vi.fn(),
  command: vi.fn(),
  setup: vi.fn(),
  invoice: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: mocks.owner } }),
}))
vi.mock('../services/api/gatewayApi', () => ({
  gatewayApi: { list: mocks.list, command: mocks.command },
}))
vi.mock('../services/api/razorpayApi', () => ({
  razorpayApi: { list: mocks.setup },
}))
vi.mock('../services/api/paymentApi', () => ({
  paymentApi: { invoice: mocks.invoice },
}))
const link: GatewayLink = {
  id: 'link-a',
  invoiceId: 'invoice-a',
  mode: 'TEST',
  state: 'ACTIVE',
  referenceId: 'reference-a',
  amount: '100.00',
  currency: 'INR',
  providerId: 'plink_123',
  url: 'https://rzp.io/i/fictional',
  lastError: null,
  synchronizedAt: null,
  createdAt: '2026-11-04T00:00:00Z',
  invoice: { id: 'invoice-a', invoiceNumber: 'INV-001', status: 'SENT' },
  payments: [],
}
const page = (data: GatewayLink[], extra = {}) => ({
  data,
  total: data.length,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
  ...extra,
})
function mount(element = <PaymentLinksPage />, path = '/payments/links') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([{ path: '*', element }], {
    initialEntries: [path],
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { client, router }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.owner = 'owner-a'
  mocks.list.mockResolvedValue(page([link]))
  mocks.command.mockResolvedValue(link)
  mocks.setup.mockResolvedValue({
    setupAvailable: true,
    connections: [{ mode: 'TEST', enabled: true }],
  })
  mocks.invoice.mockResolvedValue({
    id: 'invoice-a',
    invoiceNumber: 'INV-001',
    status: 'SENT',
    currency: 'INR',
    total: '100.00',
    amountPaid: '0.00',
    balance: '100.00',
    hasPaymentHistory: false,
  })
})
describe('Payment links workspace', () => {
  it('defaults to Test and keeps account/mode/filter/page queries separate', async () => {
    const { client, router } = mount()
    await screen.findByRole('link', { name: 'Open Test checkout' })
    expect(screen.getByText(/Test URLs never appear/)).toBeInTheDocument()
    expect(
      client
        .getQueryCache()
        .getAll()
        .some(
          query =>
            query.queryKey[0] === 'gateway' && query.queryKey[1] === 'owner-a'
        )
    ).toBe(true)
    fireEvent.change(screen.getByLabelText('Razorpay mode'), {
      target: { value: 'LIVE' },
    })
    await waitFor(() =>
      expect(mocks.list.mock.calls.at(-1)?.[0].mode).toBe('LIVE')
    )
    expect(router.state.location.search).toContain('mode=LIVE')
    fireEvent.change(screen.getByLabelText('Link status'), {
      target: { value: 'UNKNOWN' },
    })
    await waitFor(() =>
      expect(mocks.list.mock.calls.at(-1)?.[0].state).toBe('UNKNOWN')
    )
  })
  it('shows received, applied, excess and pending refund details without manual reversal', async () => {
    mocks.list.mockResolvedValue(
      page([
        {
          ...link,
          mode: 'LIVE',
          state: 'PAID',
          url: null,
          payments: [
            {
              id: 'source',
              providerId: 'pay_123',
              currency: 'INR',
              method: 'upi',
              received: '100.00',
              applied: '40.00',
              refunded: '0.00',
              unapplied: '60.00',
              exception: 'EXCESS',
              providerCreatedAt: link.createdAt,
              recordedAt: link.createdAt,
              refunds: [
                {
                  id: 'refund',
                  providerId: 'rfnd_123',
                  amount: '50.00',
                  invoiceReduction: '0.00',
                  status: 'pending',
                  recordedAt: link.createdAt,
                },
              ],
            },
          ],
        },
      ])
    )
    mount(undefined, '/payments/links?mode=LIVE')
    const payment = within(
      await screen.findByRole('region', { name: 'Payment pay_123' })
    )
    expect(payment.getByText('INR 60.00')).toBeInTheDocument()
    expect(
      payment.getByText(/Unapplied funds need your review/)
    ).toBeInTheDocument()
    expect(payment.getByText(/rfnd_123 · pending/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Reverse/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /checkout/ })
    ).not.toBeInTheDocument()
  })
  it('offers explicit recovery using the same stored link', async () => {
    mocks.list.mockResolvedValue(
      page([
        {
          ...link,
          state: 'UNKNOWN',
          url: null,
          lastError: 'Provider did not confirm.',
        },
      ])
    )
    mocks.command.mockRejectedValueOnce(new Error('Still unavailable'))
    mount()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry creation' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Still unavailable'
    )
    expect(mocks.command).toHaveBeenCalledTimes(1)
    expect(mocks.command.mock.calls[0][0]).toEqual({
      type: 'retry',
      id: link.id,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(mocks.command).toHaveBeenCalledTimes(2))
    expect(mocks.command.mock.calls[1][0]).toEqual({
      type: 'refresh',
      id: link.id,
    })
  })
  it('uses server paging and resets page when a filter changes', async () => {
    mocks.list.mockResolvedValue(
      page([link], { total: 12, totalPages: 2, hasNext: true })
    )
    const { router } = mount(undefined, '/payments/links?invoice=invoice-a')
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    await waitFor(() => expect(mocks.list.mock.calls.at(-1)?.[0].page).toBe(2))
    fireEvent.change(screen.getByLabelText('Search payment links'), {
      target: { value: 'INV-002' },
    })
    await waitFor(() => expect(mocks.list.mock.calls.at(-1)?.[0].page).toBe(1))
    expect(router.state.location.search).not.toContain('page=')
  })
  it('keeps one create request ID across failures and prevents dismissal while pending', async () => {
    const close = vi.fn(),
      saved = vi.fn()
    let finish!: (link: GatewayLink) => void
    mocks.command
      .mockImplementationOnce(() =>
        Promise.reject(new Error('Uncertain response'))
      )
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve
          })
      )
    mount(
      <CreatePaymentLinkDialog
        mode="TEST"
        initialInvoiceId="invoice-a"
        onClose={close}
        onSaved={saved}
      />
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Create link' }))
    await screen.findByText('Uncertain response')
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }))
    await waitFor(() => expect(mocks.command).toHaveBeenCalledTimes(2))
    expect(mocks.command.mock.calls[0][0]).toEqual(
      mocks.command.mock.calls[1][0]
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).not.toHaveBeenCalled()
    finish(link)
    await waitFor(() => expect(saved.mock.calls[0]?.[0]).toEqual(link))
  })
})
