import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaymentsPage } from './PaymentsPage'
import { PaymentDialog } from '../components/features/payments/PaymentDialog'
import type { PaymentTarget } from '../components/features/payments/PaymentDialog'
import type { PaymentEntry, PaymentInvoice } from '../types/payments'
import { formatPayment } from '../types/payments'
import { ApiError } from '../services/api/apiClient'

const mocks = vi.hoisted(() => ({
  owner: 'owner-a',
  history: vi.fn(),
  invoice: vi.fn(),
  payable: vi.fn(),
  record: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: mocks.owner } }),
}))
vi.mock('../services/api/paymentApi', () => ({
  paymentApi: {
    history: mocks.history,
    invoice: mocks.invoice,
    payable: mocks.payable,
    record: mocks.record,
  },
}))
const invoice: PaymentInvoice = {
  id: 'invoice-a',
  invoiceNumber: 'INV-001',
  status: 'SENT',
  currency: 'INR',
  total: '100.00',
  amountPaid: '25.50',
  balance: '74.50',
  hasPaymentHistory: true,
}
const entry: PaymentEntry = {
  id: 'receipt-a',
  sequence: '9007199254740993',
  requestId: 'original-id',
  kind: 'UPI',
  amountMinor: '2550',
  amount: '25.50',
  currency: 'INR',
  openingSource: null,
  paymentDate: '2026-11-03',
  reference: 'UPI-123',
  notes: 'Received directly',
  createdAt: '2026-11-03T10:00:00Z',
  reversalOfId: null,
  reversalOfSequence: null,
  reversedById: null,
  invoice: {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: 'SENT',
    customerName: 'Buyer',
  },
}
const page = <T,>(data: T[], extra = {}) => ({
  data,
  total: data.length,
  page: 1,
  limit: 20,
  totalPages: data.length ? 1 : 0,
  hasNext: false,
  hasPrev: false,
  ...extra,
})
function setup(element: React.ReactNode, path = '/payments') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([{ path: '*', element }], {
    initialEntries: [path],
  })
  return {
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    ),
    client,
    router,
  }
}
function dialog(
  target: PaymentTarget = { type: 'record', invoiceId: invoice.id }
) {
  const close = vi.fn(),
    saved = vi.fn()
  return {
    ...setup(<PaymentDialog target={target} onClose={close} onSaved={saved} />),
    close,
    saved,
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.owner = 'owner-a'
  mocks.invoice.mockResolvedValue(invoice)
  mocks.history.mockResolvedValue(page([entry]))
  mocks.payable.mockResolvedValue(
    page([
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: 'Buyer',
        currency: 'INR',
        balance: '74.50',
      },
    ])
  )
  mocks.record.mockResolvedValue({ replayed: false, entry })
})

describe('Payments Timeline', () => {
  it('labels owner receipts and unknown-date openings without implying gateway verification', async () => {
    mocks.history.mockResolvedValue(
      page([
        entry,
        {
          ...entry,
          id: 'opening',
          sequence: '2',
          kind: 'OPENING',
          openingSource: 'MIGRATION',
          paymentDate: null,
          reference: null,
        },
        { ...entry, id: 'reversed', sequence: '3', reversedById: 'correction' },
        {
          ...entry,
          id: 'correction',
          sequence: '4',
          kind: 'REVERSAL',
          amount: '-25.50',
          reversalOfId: 'reversed',
          reversalOfSequence: '3',
        },
      ])
    )
    setup(<PaymentsPage />)
    await screen.findAllByText(
      'Recorded by account owner · not gateway verified'
    )
    expect(
      screen.getByText(/Payment method and date unknown/)
    ).toBeInTheDocument()
    expect(
      screen.getByText('Migrated recorded paid balance')
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Reverse entry/ })
    ).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'INV-001' })[0]).toHaveAttribute(
      'href',
      '/invoices?id=invoice-a'
    )
    expect(formatPayment('90071992547409.91', 'INR')).toBe(
      'INR 90,071,992,547,409.91'
    )
  })
  it('keeps invoice/type/date/status filters in the URL and resets pagination on a search', async () => {
    const { router } = setup(
      <PaymentsPage />,
      '/payments?invoice=invoice-a&page=2'
    )
    await screen.findByText('Balance due')
    expect(mocks.history).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'invoice-a', page: 2 }),
      expect.any(AbortSignal)
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Payment entry type'),
      'OPENING'
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Payment entry status'),
      'reversed'
    )
    fireEvent.change(screen.getByLabelText('Payment date from'), {
      target: { value: '2026-11-01' },
    })
    fireEvent.change(screen.getByLabelText('Search payment history'), {
      target: { value: 'UPI-123' },
    })
    await waitFor(() =>
      expect(mocks.history).toHaveBeenLastCalledWith(
        expect.objectContaining({
          invoiceId: 'invoice-a',
          kind: 'OPENING',
          status: 'reversed',
          dateFrom: '2026-11-01',
          search: 'UPI-123',
          page: 1,
        }),
        expect.any(AbortSignal)
      )
    )
    expect(router.state.location.search).toContain('invoice=invoice-a')
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear invoice filter' })
    )
    expect(router.state.location.search).not.toContain('invoice=')
  })
  it('supports a direct record link and removes the record flag when cancelled', async () => {
    const { router } = setup(
      <PaymentsPage />,
      '/payments?invoice=invoice-a&record=true'
    )
    await screen.findByLabelText('Amount received (INR)')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(router.state.location.search).toBe('?invoice=invoice-a')
  })
  it('shows query errors with retry, empty results and page recovery', async () => {
    mocks.history
      .mockRejectedValueOnce(new Error('Payments unavailable'))
      .mockResolvedValue(page([]))
    setup(<PaymentsPage />, '/payments?page=8')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Payments unavailable'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('No payment entries yet')
    await userEvent.click(
      screen.getByRole('button', { name: 'Back to first page' })
    )
    await waitFor(() =>
      expect(mocks.history).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.any(AbortSignal)
      )
    )
  })
  it('isolates cached history after an account change', async () => {
    const { router, client } = setup(<PaymentsPage />)
    await screen.findByText('Received directly')
    mocks.owner = 'owner-b'
    mocks.history.mockResolvedValue(page([]))
    await act(() => router.navigate('/payments?status=active'))
    await screen.findByText('No payment entries match these filters')
    expect(screen.queryByText('Received directly')).not.toBeInTheDocument()
    const owners = client
      .getQueryCache()
      .getAll()
      .filter(q => q.queryKey[0] === 'payments')
      .map(q => q.queryKey[1])
    expect(owners).toContain('owner-a')
    expect(owners).toContain('owner-b')
  })
})
describe('Payment forms', () => {
  it('picks only payable invoices with server paging and prefills the current balance', async () => {
    mocks.payable.mockResolvedValue(
      page(
        [
          {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: 'Buyer',
            currency: 'INR',
            balance: '74.50',
          },
        ],
        { hasNext: true, total: 11 }
      )
    )
    const { saved } = dialog({ type: 'record' })
    await screen.findByRole('button', { name: /INV-001/ })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mocks.payable).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal)
      )
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /INV-001/ })
    )
    expect(await screen.findByLabelText('Amount received (INR)')).toHaveValue(
      '74.50'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.record.mock.calls[0][0]).toMatchObject({
      type: 'record',
      invoiceId: 'invoice-a',
      data: { amount: '74.50', requestId: expect.any(String) },
    })
  })
  it.each(['0', '-1', '1.001', '1e3', ''])(
    'rejects invalid INR input %s',
    async amount => {
      dialog()
      fireEvent.change(await screen.findByLabelText('Amount received (INR)'), {
        target: { value: amount },
      })
      await userEvent.click(
        screen.getByRole('button', { name: 'Save payment' })
      )
      expect(screen.getByRole('alert')).toHaveTextContent('positive INR amount')
      expect(mocks.record).not.toHaveBeenCalled()
    }
  )
  it('preserves inputs, displays overpayment balance and reuses one request ID across retries/changed details', async () => {
    mocks.record
      .mockRejectedValueOnce(
        new ApiError('Payment exceeds the invoice balance.', 409, 'Conflict', {
          details: { balance: '10.00', currency: 'INR' },
        })
      )
      .mockRejectedValueOnce(
        new Error(
          'This request ID was already used with different payment details.'
        )
      )
    dialog()
    const amount = await screen.findByLabelText('Amount received (INR)')
    fireEvent.change(amount, { target: { value: '20.01' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Current balance: INR 10.00'
    )
    expect(amount).toHaveValue('20.01')
    fireEvent.change(amount, { target: { value: '10.00' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'earlier attempt was saved'
      )
    )
    expect(mocks.record.mock.calls[0][0].data.requestId).toBe(
      mocks.record.mock.calls[1][0].data.requestId
    )
  })
  it('allows a safe replay after an uncertain full-payment response makes the invoice Paid', async () => {
    mocks.record
      .mockImplementationOnce(async () => {
        mocks.invoice.mockResolvedValue({
          ...invoice,
          status: 'PAID',
          amountPaid: '100.00',
          balance: '0.00',
        })
        throw new Error('Connection lost')
      })
      .mockResolvedValueOnce({ replayed: true, entry })
    const { saved } = dialog()
    await screen.findByLabelText('Amount received (INR)')
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    await screen.findByRole('alert')
    await screen.findByText('Current balance: INR 0.00')
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.record.mock.calls[0][0].data.requestId).toBe(
      mocks.record.mock.calls[1][0].data.requestId
    )
  })
  it('blocks new receipts on Draft/non-INR invoices and invalid dates', async () => {
    mocks.invoice.mockResolvedValue({
      ...invoice,
      currency: 'USD',
      status: 'DRAFT',
    })
    dialog()
    await screen.findByText(/Only issued INR invoices/)
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeDisabled()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('requires a reason and posts a full linked reversal without a replacement amount', async () => {
    const { saved } = dialog({
      type: 'reversal',
      entry: {
        ...entry,
        kind: 'OPENING',
        openingSource: 'MIGRATION',
        paymentDate: null,
      },
    })
    await screen.findByLabelText('Reason')
    expect(
      screen.queryByLabelText('Amount received (INR)')
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm reversal' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent('reason')
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Opening amount was incorrect' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm reversal' })
    )
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.record.mock.calls[0][0]).toMatchObject({
      type: 'reversal',
      entryId: entry.id,
      data: { reason: 'Opening amount was incorrect' },
    })
  })
  it('prevents closing/editing pending writes and refreshes owner payment/invoice/dashboard caches', async () => {
    let finish!: (value: unknown) => void
    mocks.record.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const { close, client, saved } = dialog()
    for (const key of [
      ['payments', 'owner-a', 'history'],
      ['payments', 'owner-b', 'history'],
      ['invoices', 'list', {}],
      ['dashboard', 'statistics'],
    ])
      client.setQueryData(key, [])
    await screen.findByLabelText('Amount received (INR)')
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }))
    expect(screen.getByLabelText('Notes (optional)')).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    await userEvent.keyboard('{Escape}')
    expect(close).not.toHaveBeenCalled()
    await act(async () => finish({ replayed: false, entry }))
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(
      client.getQueryState(['payments', 'owner-a', 'history'])?.isInvalidated
    ).toBe(true)
    expect(
      client.getQueryState(['payments', 'owner-b', 'history'])?.isInvalidated
    ).toBe(false)
    expect(client.getQueryState(['invoices', 'list', {}])?.isInvalidated).toBe(
      true
    )
    expect(
      client.getQueryState(['dashboard', 'statistics'])?.isInvalidated
    ).toBe(true)
  })
})
