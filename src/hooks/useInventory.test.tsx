import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useStockAvailability } from './useInventory'
import { inventoryApi } from '../services/api/inventoryApi'

const mocks = vi.hoisted(() => ({
  user: 'owner-a' as string | undefined,
  get: vi.fn(),
}))
vi.mock('./useAuth', () => ({
  useUserProfile: () => ({ data: mocks.user ? { id: mocks.user } : undefined }),
}))
vi.mock('../services/api/apiClient', () => ({ apiClient: { get: mocks.get } }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = 'owner-a'
  mocks.get.mockResolvedValue([])
})

it('deduplicates IDs and isolates availability caches by account', async () => {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result, rerender } = renderHook(
    () => useStockAvailability(['b', 'a', 'b']),
    { wrapper }
  )
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(mocks.get).toHaveBeenCalledWith(
    '/inventory/availability?ids=a%2Cb',
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  )
  mocks.user = 'owner-b'
  rerender()
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2))
  expect(
    client.getQueryData(['inventory', 'owner-a', 'availability', ['a', 'b']])
  ).toEqual([])
  expect(
    client.getQueryData(['inventory', 'owner-b', 'availability', ['a', 'b']])
  ).toEqual([])
})
it('does not fetch for guests or an empty product selection', () => {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  renderHook(() => useStockAvailability([]), { wrapper })
  mocks.user = undefined
  renderHook(() => useStockAvailability(['a']), { wrapper })
  expect(mocks.get).not.toHaveBeenCalled()
})
it('splits large invoices into bounded requests and joins the results without float conversion', async () => {
  mocks.get
    .mockResolvedValueOnce([{ quantity: '999999999999999.999' }])
    .mockResolvedValueOnce([{ quantity: '0.125' }])
  const ids = Array.from({ length: 101 }, (_, i) => `product-${i}`)
  const results = await inventoryApi.availability(ids)
  expect(mocks.get).toHaveBeenCalledTimes(2)
  expect(
    new URL(mocks.get.mock.calls[0][0], 'http://localhost').searchParams
      .get('ids')
      ?.split(',')
  ).toHaveLength(100)
  expect(results).toEqual([
    { quantity: '999999999999999.999' },
    { quantity: '0.125' },
  ])
})
