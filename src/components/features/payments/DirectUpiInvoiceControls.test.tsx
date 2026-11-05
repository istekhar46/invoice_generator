import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { DirectUpiInvoiceControls } from './DirectUpiInvoiceControls'
import { invoicePdfFixtures } from '../../../test/fixtures/invoicePdfs'
import type { Invoice } from '../../../types/entities'
const mocks = vi.hoisted(() => ({
  preferences: vi.fn(),
  mutation: vi.fn(),
  mutate: vi.fn(),
}))
vi.mock('../../../hooks/useDirectUpi', () => ({
  useUpiPreferences: mocks.preferences,
  useInvoiceUpi: mocks.mutation,
}))
const base = {
  ...invoicePdfFixtures.find(x => x.name === 'gateway-live-inr')!.invoice,
  paymentUrl: null,
}
const details = { upiId: 'demo@bank', payeeName: 'Demo Shop' }
const directUpi = { ...details, reference: 'ab'.repeat(16) }
function mount(invoice: Invoice = base, refreshing = false) {
  render(
    <MemoryRouter>
      <DirectUpiInvoiceControls invoice={invoice} refreshing={refreshing} />
    </MemoryRouter>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.preferences.mockReturnValue({
    data: details,
    isFetching: false,
    isPending: false,
    error: null,
  })
  mocks.mutation.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    error: null,
  })
})
it('requires an explicit action with the reviewed payee details', () => {
  mount()
  expect(mocks.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Enable direct UPI QR' }))
  expect(mocks.mutate).toHaveBeenCalledExactlyOnceWith({
    invoiceId: base.id,
    details,
  })
})
it('retains the invoice payee rather than replacing it from new preferences', () => {
  mocks.preferences.mockReturnValue({
    data: { upiId: 'new@bank', payeeName: 'New Shop' },
  })
  mount({ ...base, directUpi })
  expect(screen.getByText(/Demo Shop · demo@bank/)).toBeInTheDocument()
  expect(screen.queryByText(/New Shop/)).not.toBeInTheDocument()
  expect(mocks.preferences).toHaveBeenCalledWith(false)
  expect(
    screen.getByRole('link', { name: 'Record UPI payment' })
  ).toHaveAttribute('href', `/payments?invoice=${base.id}&record=true`)
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove direct UPI from invoice' })
  )
  expect(mocks.mutate).toHaveBeenCalledWith({
    invoiceId: base.id,
    details: null,
  })
  expect(
    screen.getByText(/printed QRs can still receive payments/)
  ).toBeInTheDocument()
})
it.each([true, false])(
  'disables activation while refreshing=%s or an active payment URL exists',
  refreshing => {
    mount(
      { ...base, paymentUrl: refreshing ? null : 'https://rzp.io/i/active' },
      refreshing
    )
    expect(
      screen.getByRole('button', { name: 'Enable direct UPI QR' })
    ).toBeDisabled()
  }
)
it('retains removal access for a paid snapshot without payable QR instructions', () => {
  mount({ ...base, status: 'paid', amountPaid: base.total, directUpi })
  expect(screen.getByText(/no payment QR is shown/)).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Payment history' })
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Enable direct UPI QR' })
  ).not.toBeInTheDocument()
})
it('surfaces server route conflicts without changing the invoice', () => {
  mocks.mutation.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    error: new Error('Cancel the active Live link first'),
  })
  mount()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Cancel the active Live link first'
  )
  expect(mocks.mutate).not.toHaveBeenCalled()
})
