import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useQuoteActions, useQuotes } from './useQuotes'
import { queryKeys } from '../lib/queryKeys'
const mocks = vi.hoisted(() => ({
  owner: 'owner-a',
  list: vi.fn(),
  convert: vi.fn(),
}))
vi.mock('./useAuth', () => ({
  useUserProfile: () => ({ data: { id: mocks.owner } }),
}))
vi.mock('../services/api/quoteApi', () => ({
  quoteApi: {
    list: mocks.list,
    convert: mocks.convert,
    save: vi.fn(),
    status: vi.fn(),
  },
}))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.owner = 'owner-a'
  mocks.list.mockResolvedValue({ data: [], total: 0 })
  mocks.convert.mockResolvedValue({
    invoice: { id: 'invoice-a' },
    replayed: false,
  })
})
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}
it('isolates quote lists by account', async () => {
  const { client, wrapper } = setup()
  const { result, rerender } = renderHook(() => useQuotes({ page: 1 }), {
    wrapper,
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  mocks.owner = 'owner-b'
  rerender()
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2))
  expect(
    client.getQueryData(['quotes', 'owner-a', 'list', { page: 1 }])
  ).toEqual({ data: [], total: 0 })
  expect(
    client.getQueryData(['quotes', 'owner-b', 'list', { page: 1 }])
  ).toEqual({ data: [], total: 0 })
})
it('refreshes the current account quote/catalog, invoices and dashboard after conversion without invalidating other quote owners', async () => {
  const { client, wrapper } = setup()
  client.setQueryData(['quotes', 'owner-a', 'list', {}], {})
  client.setQueryData(['quotes', 'owner-b', 'list', {}], {})
  client.setQueryData(['catalog', 'owner-a', {}], {})
  client.setQueryData(queryKeys.dashboardStatistics(), {})
  const { result } = renderHook(() => useQuoteActions(), { wrapper })
  await act(() =>
    result.current.convert.mutateAsync({
      id: 'quote-a',
      version: 3,
      serviceDate: '2026-11-05',
      dueDate: '2026-12-05',
    })
  )
  expect(
    client.getQueryState(['quotes', 'owner-a', 'list', {}])?.isInvalidated
  ).toBe(true)
  expect(
    client.getQueryState(['quotes', 'owner-b', 'list', {}])?.isInvalidated
  ).toBe(false)
  expect(client.getQueryState(['catalog', 'owner-a', {}])?.isInvalidated).toBe(
    true
  )
  expect(
    client.getQueryState(queryKeys.dashboardStatistics())?.isInvalidated
  ).toBe(true)
})
