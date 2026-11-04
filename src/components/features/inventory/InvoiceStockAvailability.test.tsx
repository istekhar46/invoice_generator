import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { InvoiceStockAvailability } from './InvoiceStockAvailability'

const stock = vi.hoisted(() => vi.fn())
vi.mock('../../../hooks/useInventory', () => ({ useStockAvailability: stock }))
const tracked = {
  id: 'row',
  type: 'product',
  catalogItemId: 'logo',
  quantity: 2,
}
const balance = {
  product: { id: 'logo', name: 'Logo', unit: 'PCS', isArchived: false },
  quantity: '4.000',
}
beforeEach(() =>
  stock.mockReturnValue({ data: [balance], error: null, isPending: false })
)

it('shows row quantity and current availability with source link and issue timing', () => {
  render(
    <MemoryRouter>
      <InvoiceStockAvailability
        items={[
          tracked,
          { ...tracked, id: 'row2', quantity: 1 },
          { type: 'service', catalogItemId: 'consult' },
        ]}
      />
    </MemoryRouter>
  )
  expect(stock).toHaveBeenLastCalledWith(['logo', 'logo'])
  expect(screen.getByText('Invoice quantity: 2 PCS')).toBeInTheDocument()
  expect(screen.getAllByText('Available: 4 PCS')).toHaveLength(2)
  expect(screen.getAllByRole('link', { name: 'Logo' })[0]).toHaveAttribute(
    'href',
    '/inventory?view=history&product=logo'
  )
  expect(
    screen.getByText(/current availability already includes issued invoices/)
  ).toBeInTheDocument()
})
it('does not request stock for one-off rows or services', () => {
  stock.mockClear()
  const { container } = render(
    <InvoiceStockAvailability
      items={[
        { type: 'service', catalogItemId: 'service' },
        { type: 'product' },
      ]}
    />
  )
  expect(container).toBeEmptyDOMElement()
  expect(stock).not.toHaveBeenCalled()
})
it('shows exact fractions and archived current stock', () => {
  stock.mockReturnValue({
    data: [
      {
        ...balance,
        product: { ...balance.product, isArchived: true },
        quantity: '999999999999999.125',
      },
    ],
    isPending: false,
  })
  render(
    <MemoryRouter>
      <InvoiceStockAvailability items={[tracked]} />
    </MemoryRouter>
  )
  expect(
    screen.getByText('Available: 999,999,999,999,999.125 PCS')
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'Logo (archived)' })
  ).toBeInTheDocument()
})
it('keeps lookup failure explicit and retryable', async () => {
  const refetch = vi.fn()
  stock.mockReturnValue({ error: new Error('offline'), refetch })
  render(<InvoiceStockAvailability items={[tracked]} />)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Stock availability could not be loaded'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(refetch).toHaveBeenCalledOnce()
})
