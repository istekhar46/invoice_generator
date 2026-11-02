import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { InvoiceDefaultsGate } from './InvoiceDefaultsGate'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../../../hooks/useInvoiceDefaults', () => ({
  useNewInvoiceDefaults: query,
}))
const settings = {
  currency: 'INR',
  taxRate: 0,
  paymentTerms: 'Net 30',
  notes: '',
  terms: '',
}
const form = (data?: { settings: typeof settings }) => (
  <input
    aria-label="Current invoice"
    defaultValue={data?.settings.currency ?? 'blank'}
  />
)

describe('New invoice initialization', () => {
  beforeEach(() => query.mockReset())
  it('waits for defaults before opening the form and does not overwrite typing after a refresh', () => {
    query.mockReturnValue({ isPending: true })
    const view = render(
      <InvoiceDefaultsGate enabled>{form}</InvoiceDefaultsGate>
    )
    expect(screen.queryByLabelText('Current invoice')).not.toBeInTheDocument()
    query.mockReturnValue({ data: { settings } })
    view.rerender(<InvoiceDefaultsGate enabled>{form}</InvoiceDefaultsGate>)
    fireEvent.change(screen.getByLabelText('Current invoice'), {
      target: { value: 'My edits' },
    })
    query.mockReturnValue({
      isFetching: true,
      data: { settings: { ...settings, currency: 'JPY' } },
    })
    view.rerender(<InvoiceDefaultsGate enabled>{form}</InvoiceDefaultsGate>)
    expect(screen.getByLabelText('Current invoice')).toHaveValue('My edits')
  })
  it('allows an explicit blank start after a loading failure', () => {
    query.mockReturnValue({
      isPending: false,
      error: new Error('Network failure'),
    })
    render(<InvoiceDefaultsGate enabled>{form}</InvoiceDefaultsGate>)
    expect(screen.getByRole('alert')).toHaveTextContent('Network failure')
    fireEvent.click(
      screen.getByRole('button', { name: 'Start without saved defaults' })
    )
    expect(screen.getByLabelText('Current invoice')).toHaveValue('blank')
  })
  it('waits for fresh values on a new form even if an older snapshot is cached', () => {
    query.mockReturnValue({
      isPending: false,
      isFetching: true,
      data: { settings },
    })
    render(<InvoiceDefaultsGate enabled>{form}</InvoiceDefaultsGate>)
    expect(screen.queryByLabelText('Current invoice')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })
  it('keeps other defaults when the user continues without a failed company logo', () => {
    query.mockReturnValue({
      data: { settings, logoDataUrl: '', logoError: 'Logo unavailable' },
    })
    render(
      <InvoiceDefaultsGate enabled includeLogo>
        {form}
      </InvoiceDefaultsGate>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Logo unavailable')
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue without company logo' })
    )
    expect(screen.getByLabelText('Current invoice')).toHaveValue('INR')
  })
  it('bypasses initialization for an existing invoice or restored draft', () => {
    query.mockReturnValue({ isPending: true })
    render(<InvoiceDefaultsGate enabled={false}>{form}</InvoiceDefaultsGate>)
    expect(screen.getByLabelText('Current invoice')).toHaveValue('blank')
    expect(query).toHaveBeenCalledWith(false, false)
  })
})
