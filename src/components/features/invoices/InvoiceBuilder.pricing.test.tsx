import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { InvoiceBuilder } from './InvoiceBuilder'
import { LineItemsTable } from './LineItemsTable'
import type { Customer, Invoice } from '../../../types/entities'
import { formatCurrency } from '../../../utils/formatters'

const mocks = vi.hoisted(() => ({ save: vi.fn(), download: vi.fn() }))
vi.mock('../../../hooks/useInvoices', () => ({
  useCreateInvoice: () => ({ mutateAsync: mocks.save }),
  useUpdateInvoice: () => ({ mutateAsync: mocks.save }),
}))
vi.mock('../../../hooks/useCompany', () => ({
  useCompanyProfile: () => ({ data: null }),
}))
vi.mock('../../../hooks/useInvoiceDefaults', () => ({
  useSaveInvoiceDefaults: () => ({ mutateAsync: vi.fn() }),
  useNewInvoiceDefaults: () => ({
    data: {
      settings: {
        currency: 'INR',
        taxRate: 0.05,
        notes: '',
        terms: '',
        paymentTerms: '',
      },
    },
  }),
}))
vi.mock('../../../hooks/usePDFGeneration', () => ({
  usePDFGeneration: () => ({
    downloadInvoicePDFDirect: mocks.download,
    isGenerating: false,
  }),
}))
vi.mock('../../../hooks/useCatalog', () => ({
  useCatalog: () => ({
    data: {
      data: [
        {
          id: 'logo',
          type: 'product',
          name: 'Logo',
          description: '',
          unit: 'PCS',
          rate: 3000,
          currency: 'INR',
        },
      ],
    },
  }),
}))
vi.mock('../../../hooks/useInventory', () => ({
  useStockAvailability: () => ({ data: [], isPending: false }),
}))

const customer: Customer = {
  id: 'customer',
  userId: 'owner',
  name: 'Customer',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  createdAt: new Date(),
  updatedAt: new Date(),
}
const invoice: Invoice = {
  id: 'invoice',
  userId: 'owner',
  customerId: customer.id,
  customer,
  invoiceNumber: 'INV-1',
  currency: 'INR',
  status: 'draft',
  serviceDate: new Date(),
  dueDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  subtotal: 6000,
  discountType: 'fixed',
  discountValue: 100,
  taxRate: 0.05,
  taxAmount: 295,
  total: 6195,
  lineItems: [
    {
      id: 'line',
      invoiceId: 'invoice',
      type: 'product',
      catalogItemId: 'logo',
      description: 'Logo',
      unit: 'PCS',
      quantity: 2,
      rate: 3000,
      amount: 6000,
    },
  ],
}
const originalWidth = window.innerWidth
const display = (value: number) => formatCurrency(value, 'INR')
const next = () =>
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
const chooseLogo = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add from catalog' }))
  fireEvent.click(screen.getByRole('button', { name: /Logo/ }))
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.download.mockResolvedValue(undefined)
  // Keep the request pending: these tests assert the actual submitted payload, not a fake server result.
  mocks.save.mockImplementation(() => new Promise(() => {}))
  Object.defineProperty(window, 'innerWidth', {
    value: 1024,
    configurable: true,
    writable: true,
  })
})
afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    value: originalWidth,
    configurable: true,
    writable: true,
  })
})

it('chooses catalog quantity before adding and carries the percentage discount through review, PDF and create', async () => {
  render(
    <MemoryRouter>
      <InvoiceBuilder initialCustomer={customer} />
    </MemoryRouter>
  )
  next()
  next()
  chooseLogo()
  expect(screen.getByLabelText('Item quantity')).toHaveValue(1)
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Item quantity'), {
    target: { value: '2' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
  expect(screen.getByRole('cell', { name: '2 PCS' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Discount (%)'), {
    target: { value: '10' },
  })
  expect(screen.getByLabelText('Discount amount')).toHaveTextContent(
    display(600)
  )
  expect(screen.getByText(display(270))).toBeInTheDocument()
  expect(screen.getAllByText(display(5670)).length).toBeGreaterThan(0)
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }))
  await waitFor(() =>
    expect(mocks.download).toHaveBeenCalledWith(
      expect.objectContaining({
        discountType: 'percentage',
        discountValue: 10,
        subtotal: 6000,
        taxAmount: 270,
        total: 5670,
        lineItems: [
          expect.objectContaining({
            catalogItemId: 'logo',
            quantity: 2,
            amount: 6000,
          }),
        ],
      }),
      customer,
      null
    )
  )
  fireEvent.click(screen.getByRole('button', { name: /save invoice/i }))
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'INR',
        discountType: 'percentage',
        discountValue: 10,
        lineItems: [
          expect.objectContaining({
            catalogItemId: 'logo',
            quantity: 2,
            rate: 3000,
          }),
        ],
      })
    )
  )
})

it('loads a saved fixed discount, rejects an excessive discount, then submits the corrected update', async () => {
  render(
    <MemoryRouter>
      <InvoiceBuilder invoice={invoice} />
    </MemoryRouter>
  )
  next()
  expect(screen.getByLabelText('Discount type')).toHaveValue('fixed')
  expect(screen.getByLabelText('Discount (INR)')).toHaveValue(100)
  fireEvent.change(screen.getByLabelText('Discount (INR)'), {
    target: { value: '6001' },
  })
  expect(
    screen.getByText('Discount cannot exceed subtotal.')
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Discount (INR)'), {
    target: { value: '250' },
  })
  expect(screen.getByLabelText('Discount amount')).toHaveTextContent(
    display(250)
  )
  expect(screen.getByText(display(287.5))).toBeInTheDocument()
  next()
  fireEvent.click(screen.getByRole('button', { name: /update invoice/i }))
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith({
      id: invoice.id,
      data: expect.objectContaining({
        discountType: 'fixed',
        discountValue: 250,
      }),
    })
  )
})

it('blocks percentages above 100 and clears the discount back to zero', () => {
  render(
    <MemoryRouter>
      <InvoiceBuilder invoice={invoice} />
    </MemoryRouter>
  )
  next()
  fireEvent.change(screen.getByLabelText('Discount type'), {
    target: { value: 'percentage' },
  })
  fireEvent.change(screen.getByLabelText('Discount (%)'), {
    target: { value: '101' },
  })
  expect(screen.getByText('Discount cannot exceed 100%.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Discount (%)'), {
    target: { value: '' },
  })
  expect(screen.getByLabelText('Discount amount')).toHaveTextContent(display(0))
  expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
})

it('opens the catalog selection in the mobile item editor and preserves a fractional quantity', async () => {
  Object.defineProperty(window, 'innerWidth', {
    value: 390,
    configurable: true,
    writable: true,
  })
  const change = vi.fn()
  render(
    <MemoryRouter>
      <LineItemsTable currency="INR" lineItems={[]} onChange={change} />
    </MemoryRouter>
  )
  chooseLogo()
  expect(change).not.toHaveBeenCalled()
  expect(
    screen.getByRole('dialog', { name: 'Add Line Item' })
  ).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Item quantity'), {
    target: { value: '1.250' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
  expect(change).toHaveBeenCalledWith([
    expect.objectContaining({
      catalogItemId: 'logo',
      type: 'product',
      unit: 'PCS',
      quantity: 1.25,
      rate: 3000,
      amount: 3750,
    }),
  ])
})

it('validates catalog quantity limits before adding and lets the selection be cancelled', () => {
  const change = vi.fn()
  render(
    <MemoryRouter>
      <LineItemsTable currency="INR" lineItems={[]} onChange={change} />
    </MemoryRouter>
  )
  chooseLogo()
  fireEvent.change(screen.getByLabelText('Item quantity'), {
    target: { value: '10001' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
  expect(screen.getByText('Quantity cannot exceed 10,000')).toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
  fireEvent.click(screen.getByTitle('Cancel'))
  expect(screen.getByText('No line items yet')).toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
})
