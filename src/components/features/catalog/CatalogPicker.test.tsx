import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogPicker } from './CatalogPicker'
import { CatalogItemForm } from './CatalogItemForm'
import type { CatalogItem } from '../../../types/catalog'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  save: vi.fn(),
  refetch: vi.fn(),
}))
vi.mock('../../../hooks/useCatalog', () => ({
  useCatalog: (query: unknown) => mocks.query(query),
  useSaveCatalogItem: () => ({
    mutateAsync: mocks.save,
    isPending: false,
    error: null,
  }),
}))

const product: CatalogItem = {
  id: 'catalog-1',
  type: 'product',
  name: 'Cable',
  description: 'Outdoor',
  sku: 'CAB-1',
  unit: 'each',
  rate: 12,
  currency: 'USD',
  isArchived: false,
  usedAt: null,
  stockTrackingStartedAt: null,
  createdAt: '',
  updatedAt: '',
}
const service: CatalogItem = {
  ...product,
  id: 'catalog-2',
  name: 'Consulting',
  description: '',
  type: 'service',
  unit: 'hour',
  currency: 'INR',
  rate: 1000,
  usedAt: '2026-11-02',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.query.mockReturnValue({
    data: {
      data: [product, service],
      total: 2,
      hasNext: false,
      hasPrev: false,
    },
    isPending: false,
    error: null,
    refetch: mocks.refetch,
  })
  mocks.save.mockResolvedValue(product)
})

describe('Catalog invoice selection', () => {
  it('loads only when opened and copies an independent product snapshot', async () => {
    const choose = vi.fn()
    render(<CatalogPicker currency="USD" onSelect={choose} />)
    expect(mocks.query).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Add from catalog' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Cable/ }))
    expect(choose).toHaveBeenCalledWith({
      catalogItemId: product.id,
      type: 'product',
      description: 'Cable — Outdoor',
      unit: 'each',
      quantity: 1,
      rate: 12,
      amount: 12,
    })
  })

  it('requires an explicit price for a service in another currency', async () => {
    const choose = vi.fn()
    render(<CatalogPicker currency="USD" onSelect={choose} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Add from catalog' })
    )
    await userEvent.click(screen.getByRole('button', { name: /Consulting/ }))
    expect(choose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Unit price in USD'), {
      target: { value: '75' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(choose).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogItemId: service.id,
        type: 'service',
        rate: 75,
        amount: 75,
      })
    )
  })

  it('shows a failed query with an explicit retry and keeps search available', async () => {
    mocks.query.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error('Catalog unavailable'),
      refetch: mocks.refetch,
    })
    render(<CatalogPicker currency="USD" onSelect={vi.fn()} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Add from catalog' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Catalog unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mocks.refetch).toHaveBeenCalled()
    expect(
      screen.getByRole('textbox', { name: 'Search catalog' })
    ).toBeEnabled()
  })

  it('creates a service inline without submitting the enclosing invoice', async () => {
    const invoiceSubmit = vi.fn(event => event.preventDefault())
    const choose = vi.fn()
    mocks.save.mockResolvedValue({ ...service, currency: 'USD', rate: 75 })
    render(
      <form onSubmit={invoiceSubmit}>
        <CatalogPicker currency="USD" onSelect={choose} />
      </form>
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Add from catalog' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'New catalog item' })
    )
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'service')
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Consulting' },
    })
    fireEvent.change(screen.getByLabelText('Selling price'), {
      target: { value: '75' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Create item' }))
    await waitFor(() =>
      expect(choose).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'service', rate: 75 })
      )
    )
    expect(invoiceSubmit).not.toHaveBeenCalled()
  })
})

describe('Catalog item editing', () => {
  it('locks an unused tracked product identity while allowing metadata changes', async () => {
    const tracked = {
      ...product,
      usedAt: null,
      stockTrackingStartedAt: '2026-11-03',
    }
    render(
      <CatalogItemForm item={tracked} onSaved={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByLabelText('Type')).toBeDisabled()
    expect(screen.getByLabelText('Unit')).toHaveAttribute('readonly')
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New name' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        id: product.id,
        data: expect.objectContaining({
          name: 'New name',
          type: 'product',
          unit: 'each',
        }),
      })
    )
  })
  it('retains the locked service type/unit when changing a used item price', async () => {
    const saved = vi.fn()
    mocks.save.mockResolvedValue({ ...service, rate: 50 })
    render(
      <CatalogItemForm item={service} onSaved={saved} onCancel={vi.fn()} />
    )
    expect(screen.getByLabelText('Type')).toBeDisabled()
    expect(screen.getByLabelText('Unit')).toHaveAttribute('readonly')
    fireEvent.change(screen.getByLabelText('Selling price'), {
      target: { value: '50' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.save).toHaveBeenCalledWith({
      id: service.id,
      data: expect.objectContaining({
        type: 'service',
        unit: 'hour',
        rate: 50,
      }),
    })
  })
})
