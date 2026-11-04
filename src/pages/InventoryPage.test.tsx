import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryPage } from './InventoryPage'
import { StockActionDialog } from '../components/features/inventory/StockActionDialog'
import type { StockDialogTarget } from '../components/features/inventory/StockActionDialog'
import type { StockAction, StockProduct } from '../types/inventory'
import { formatStockQuantity } from '../types/inventory'
import { ApiError } from '../services/api/apiClient'
import { queryKeys } from '../lib/queryKeys'
import { CacheInvalidationService } from '../services/cache/cacheInvalidation.service'

const mocks = vi.hoisted(() => ({
  owner: 'owner-a',
  balances: vi.fn(),
  balance: vi.fn(),
  history: vi.fn(),
  record: vi.fn(),
  catalog: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useUserProfile: () => ({ data: { id: mocks.owner } }),
}))
vi.mock('../services/api/inventoryApi', () => ({
  inventoryApi: {
    balances: mocks.balances,
    balance: mocks.balance,
    history: mocks.history,
    record: mocks.record,
  },
}))
vi.mock('../services/api/catalogApi', () => ({
  catalogApi: { list: mocks.catalog },
}))

const product: StockProduct = {
  id: 'product-a',
  name: 'Cotton fabric',
  sku: 'CTN',
  unit: 'm',
  isArchived: false,
  stockTrackingStartedAt: '2026-11-03',
}
const action: StockAction = {
  id: 'adjustment-a',
  sequence: '9007199254740993',
  requestId: 'original-request',
  kind: 'ADJUSTMENT',
  invoiceId: null,
  invoice: null,
  reversalOfId: null,
  reversedById: null,
  reason: 'Count correction',
  effectiveDate: '2026-11-02',
  createdAt: '2026-11-03T10:00:00Z',
  movements: [{ catalogItemId: product.id, quantityDelta: '-1.250', product }],
}
const page = <T,>(data: T[], extra = {}) => ({
  data: data.map(row =>
    typeof row === 'object' && row && 'quantity' in row
      ? {
          opening: '10.000',
          adjustments: '0.000',
          netInvoiced: '4.000',
          ...row,
        }
      : row
  ),
  summary: { tracked: 21, inStock: 20, outOfStock: 1 },
  total: data.length,
  page: 1,
  limit: 20,
  totalPages: data.length ? 1 : 0,
  hasPrev: false,
  hasNext: false,
  ...extra,
})

function setup(element: React.ReactNode, path = '/inventory') {
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
function dialog(target: StockDialogTarget = { type: 'adjustment', product }) {
  const close = vi.fn(),
    saved = vi.fn()
  return {
    ...setup(
      <StockActionDialog target={target} onClose={close} onSaved={saved} />
    ),
    close,
    saved,
  }
}
function fill(label = 'Quantity', quantity = '1.250') {
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), {
    target: { value: quantity },
  })
  fireEvent.change(screen.getByLabelText('Reason'), {
    target: { value: 'Physical count' },
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.owner = 'owner-a'
  mocks.balances.mockResolvedValue(
    page([{ product, quantity: '999999999999999.999' }])
  )
  mocks.balance.mockResolvedValue({ product, quantity: '5.000' })
  mocks.history.mockResolvedValue(page([action]))
  mocks.record.mockResolvedValue({ replayed: false, action })
  mocks.catalog.mockResolvedValue(
    page([{ ...product, type: 'product', stockTrackingStartedAt: null }])
  )
})

describe('Inventory workspace', () => {
  it('includes archived tracked products in the history picker and retains the chosen product when filtering movement type', async () => {
    mocks.catalog.mockResolvedValue(
      page([{ ...product, type: 'product', isArchived: true }])
    )
    const { router } = setup(<InventoryPage />, '/inventory?view=history')
    await userEvent.click(
      screen.getByRole('button', { name: 'All tracked products' })
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /Cotton fabric/ })
    )
    expect(mocks.catalog).toHaveBeenCalledWith(
      expect.objectContaining({
        tracking: 'tracked',
        status: 'all',
        type: 'product',
      })
    )
    await screen.findByRole('button', { name: 'Cotton fabric' })
    await userEvent.selectOptions(
      screen.getByLabelText('Movement type'),
      'ADJUSTMENT'
    )
    expect(router.state.location.search).toContain('product=product-a')
    expect(router.state.location.search).toContain('kind=ADJUSTMENT')
  })
  it('keeps exact quantities, filters before paging, and resets page on search', async () => {
    const { router } = setup(<InventoryPage />, '/inventory?page=2')
    await screen.findByText('999,999,999,999,999.999')
    expect(screen.getByLabelText('Inventory summary')).toHaveTextContent(
      'Tracked products21In stock20Out of stock1'
    )
    expect(
      screen.getByRole('columnheader', { name: 'Net invoiced' })
    ).toBeInTheDocument()
    expect(mocks.balances).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, status: 'active' }),
      expect.any(AbortSignal)
    )
    fireEvent.change(screen.getByLabelText('Search stock balances'), {
      target: { value: 'cotton' },
    })
    await waitFor(() =>
      expect(mocks.balances).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'cotton' }),
        expect.any(AbortSignal)
      )
    )
    await userEvent.selectOptions(
      screen.getByLabelText('Stock product status'),
      'archived'
    )
    await waitFor(() =>
      expect(mocks.balances).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'archived' }),
        expect.any(AbortSignal)
      )
    )
    expect(router.state.location.search).toContain('status=archived')
    expect(
      screen.getByRole('link', { name: 'History for Cotton fabric' })
    ).toHaveAttribute('href', '/inventory?view=history&product=product-a')
    expect(formatStockQuantity('1.250')).toBe('1.25')
    expect(formatStockQuantity('0.000')).toBe('0')
    expect(formatStockQuantity('-999999999999999.999')).toBe(
      '-999,999,999,999,999.999'
    )
  })

  it('preserves history filters in the URL, shows invoice sources and limits reversals to manual originals', async () => {
    mocks.history.mockResolvedValue(
      page([
        action,
        {
          ...action,
          id: 'invoice-action',
          sequence: '2',
          kind: 'INVOICE_ISSUE',
          invoiceId: 'invoice-1',
          invoice: {
            id: 'invoice-1',
            invoiceNumber: 'INV-003',
            customerName: 'Fixture customer',
          },
          reversedById: 'void-action',
          movements: [],
        },
        {
          ...action,
          id: 'void-action',
          sequence: '5',
          kind: 'INVOICE_VOID',
          reversalOfId: 'invoice-action',
          movements: [],
        },
        {
          ...action,
          id: 'already-reversed',
          sequence: '3',
          reversedById: 'reversal-1',
        },
        {
          ...action,
          id: 'reversal-1',
          sequence: '4',
          reversalOfId: 'already-reversed',
        },
        { ...action, id: 'opening', sequence: '1', kind: 'OPENING' },
      ])
    )
    const { router } = setup(
      <InventoryPage />,
      '/inventory?view=history&product=product-a'
    )
    await screen.findByRole('heading', { name: 'Invoice voided #5' })
    expect(
      screen.getByText('Stock restored from original invoice issue')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Voided · original issue retained')
    ).toBeInTheDocument()
    expect(mocks.history).toHaveBeenCalledWith(
      expect.objectContaining({ catalogItemId: 'product-a' }),
      expect.any(AbortSignal)
    )
    expect(screen.getByRole('link', { name: 'INV-003' })).toHaveAttribute(
      'href',
      '/invoices?id=invoice-1'
    )
    expect(screen.getByText('Customer: Fixture customer')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Reverse adjustment/ })
    ).toHaveLength(1)
    await userEvent.selectOptions(
      screen.getByLabelText('Movement type'),
      'INVOICE_VOID'
    )
    await waitFor(() =>
      expect(mocks.history).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'INVOICE_VOID' }),
        expect.any(AbortSignal)
      )
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear product filter' })
    )
    expect(router.state.location.search).not.toContain('product=')
  })

  it('handles loading, query failure with retry, and empty results', async () => {
    mocks.balances
      .mockRejectedValueOnce(new Error('Inventory unavailable'))
      .mockResolvedValueOnce(page([]))
    setup(<InventoryPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading inventory')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Inventory unavailable'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByText('Start with your stock on hand')
    expect(
      screen.getByRole('button', { name: 'Choose a product' })
    ).toBeEnabled()
  })

  it('paginates and recovers from a stale out-of-range page', async () => {
    mocks.balances
      .mockResolvedValueOnce(
        page([{ product, quantity: '1.000' }], {
          total: 21,
          totalPages: 2,
          hasNext: true,
        })
      )
      .mockResolvedValueOnce(page([], { hasPrev: true }))
    setup(<InventoryPage />)
    await screen.findByRole('link', { name: 'Cotton fabric' })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mocks.balances).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal)
      )
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Back to first page' })
    )
    await screen.findByRole('link', { name: 'Cotton fabric' })
  })

  it('uses the owner-scoped cache when the account changes', async () => {
    const { client, router } = setup(<InventoryPage />)
    await screen.findByText('Cotton fabric')
    mocks.owner = 'owner-b'
    mocks.balances.mockResolvedValue(page([]))
    await act(() => router.navigate('/inventory?status=all'))
    await screen.findByText('No matching stock')
    expect(screen.queryByText('Cotton fabric')).not.toBeInTheDocument()
    const owners = client
      .getQueryCache()
      .getAll()
      .filter(query => query.queryKey[0] === 'inventory')
      .map(query => query.queryKey[1])
    expect(owners).toContain('owner-a')
    expect(owners).toContain('owner-b')
  })
})

describe('Stock forms', () => {
  it('selects only active untracked products with server-side search and paging, then records zero opening', async () => {
    mocks.catalog.mockResolvedValue(
      page([{ ...product, type: 'product' }], { total: 11, hasNext: true })
    )
    const { saved } = dialog({ type: 'opening' })
    await screen.findByRole('button', { name: /Cotton fabric/ })
    expect(mocks.catalog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'product',
        tracking: 'untracked',
        status: 'active',
        limit: 10,
      })
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(mocks.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    )
    fireEvent.change(screen.getByLabelText('Search stock products'), {
      target: { value: 'cotton' },
    })
    await waitFor(() =>
      expect(mocks.catalog).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'cotton' })
      )
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /Cotton fabric/ })
    )
    fill('Opening quantity', '0.000')
    await userEvent.click(
      screen.getByRole('button', { name: 'Start tracking' })
    )
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'opening',
        productId: product.id,
        data: expect.objectContaining({ quantity: '0.000', unit: 'm' }),
      }),
      expect.anything()
    )
  })

  it.each(['0', '0.000', '-1', '1.0001', '1e3', '1000000000000000', ''])(
    'rejects invalid adjustment quantity %s',
    async quantity => {
      dialog()
      fill('Quantity', quantity)
      await userEvent.click(
        screen.getByRole('button', { name: 'Save adjustment' })
      )
      expect(screen.getByRole('alert')).toHaveTextContent('positive quantity')
      expect(mocks.record).not.toHaveBeenCalled()
    }
  )

  it('requires a reason and valid date', async () => {
    dialog()
    fireEvent.change(screen.getByLabelText(/^Quantity/), {
      target: { value: '1.250' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent('reason')
    fill()
    fireEvent.change(screen.getByLabelText('Effective date'), {
      target: { value: '' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    expect(screen.getByRole('alert')).toHaveTextContent('valid effective date')
    expect(mocks.record).not.toHaveBeenCalled()
  })

  it('keeps inputs and the request ID across retries and edited details after an uncertain response', async () => {
    mocks.record
      .mockRejectedValueOnce(
        new ApiError('Insufficient stock.', 409, 'Conflict', {
          details: { available: '0.750' },
        })
      )
      .mockRejectedValueOnce(new Error('Network connection failed'))
      .mockRejectedValueOnce(
        new Error(
          'This request ID was already used with different stock action details. Use a new request ID.'
        )
      )
    dialog()
    fill()
    await userEvent.selectOptions(screen.getByLabelText('Change'), 'OUT')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Available: 0.75'
    )
    expect(screen.getByLabelText(/^Quantity/)).toHaveValue('1.250')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Network connection failed'
      )
    )
    fireEvent.change(screen.getByLabelText(/^Quantity/), {
      target: { value: '0.500' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'An earlier attempt was saved with different details'
      )
    )
    const commands = mocks.record.mock.calls.map(call => call[0])
    expect(commands[0].data.direction).toBe('OUT')
    expect(commands[0].data.quantity).toBe('1.250')
    expect(commands[2].data.quantity).toBe('0.500')
    expect(new Set(commands.map(command => command.data.requestId)).size).toBe(
      1
    )
  })

  it('prevents edits and closing while saving and invalidates stock/catalog without touching other owners', async () => {
    let finish!: (value: unknown) => void
    mocks.record.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve
        })
    )
    const { client, close, saved } = dialog()
    for (const key of [
      ['inventory', 'owner-a', 'history'],
      ['catalog', 'owner-a', {}],
      ['inventory', 'owner-b', 'history'],
    ])
      client.setQueryData(key, [])
    fill('Quantity', '999999999999999.999')
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    expect(screen.getByLabelText('Reason')).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    await userEvent.keyboard('{Escape}')
    expect(close).not.toHaveBeenCalled()
    await act(async () => finish({ replayed: false, action }))
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(
      client.getQueryState(['inventory', 'owner-a', 'history'])?.isInvalidated
    ).toBe(true)
    expect(
      client.getQueryState(['catalog', 'owner-a', {}])?.isInvalidated
    ).toBe(true)
    expect(
      client.getQueryState(['inventory', 'owner-b', 'history'])?.isInvalidated
    ).toBe(false)
  })

  it('records a manual reversal against its source with its own reason/date and no replacement quantity', async () => {
    const { saved } = dialog({ type: 'reversal', action })
    expect(screen.queryByLabelText(/^Quantity/)).not.toBeInTheDocument()
    expect(screen.getByText(/9007199254740993/)).toHaveTextContent('-1.25 m')
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Incorrect count' },
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm reversal' })
    )
    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(mocks.record.mock.calls[0][0]).toEqual({
      type: 'reversal',
      actionId: action.id,
      data: {
        requestId: expect.any(String),
        reason: 'Incorrect count',
        effectiveDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    })
  })

  it('invalidates balances and catalog on failed writes too, so ambiguous responses cannot leave stale stock', async () => {
    mocks.record.mockRejectedValue(new Error('Connection lost'))
    const { client } = dialog()
    client.setQueryData(['inventory', 'owner-a', 'history'], [])
    client.setQueryData(['catalog', 'owner-a', {}], [])
    fill()
    await userEvent.click(
      screen.getByRole('button', { name: 'Save adjustment' })
    )
    await screen.findByRole('alert')
    expect(
      client.getQueryState(['inventory', 'owner-a', 'history'])?.isInvalidated
    ).toBe(true)
    expect(
      client.getQueryState(['catalog', 'owner-a', {}])?.isInvalidated
    ).toBe(true)
  })
})

it('invoice mutations invalidate stock and catalog snapshots alongside invoice lists', async () => {
  const client = new QueryClient()
  client.setQueryData(['inventory', 'owner-a', 'balances'], [])
  client.setQueryData(['catalog', 'owner-a', {}], [])
  client.setQueryData(queryKeys.profile(), { id: 'owner-a' })
  client.setQueryData(['quotes', 'owner-a', 'list'], [])
  client.setQueryData(['quotes', 'owner-b', 'list'], [])
  new CacheInvalidationService(client).invoices.invalidateInvoice('invoice-1')
  expect(
    client.getQueryState(['inventory', 'owner-a', 'balances'])?.isInvalidated
  ).toBe(true)
  expect(client.getQueryState(['catalog', 'owner-a', {}])?.isInvalidated).toBe(
    true
  )
  expect(
    client.getQueryState(['quotes', 'owner-a', 'list'])?.isInvalidated
  ).toBe(true)
  expect(
    client.getQueryState(['quotes', 'owner-b', 'list'])?.isInvalidated
  ).toBe(false)
})
