import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '../lib/queryKeys'
import { customerApi } from '../services/api'
import type {
  CustomerResponseDto,
  PaginatedCustomerResponse,
} from '../services/api'
import { useDeleteCustomer } from './useCustomers'

vi.mock('../services/api', () => ({
  customerApi: {
    deleteCustomer: vi.fn(),
  },
}))

vi.mock('./useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: () => ({
    isOnline: true,
    isOffline: false,
    wasOffline: false,
  }),
}))

const customer: CustomerResponseDto = {
  id: 'customer-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+44 20 7946 0958',
  address: '1 Computing Lane',
  city: 'London',
  state: 'England',
  zipCode: 'SW1A 1AA',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('useDeleteCustomer', () => {
  beforeEach(() => {
    vi.mocked(customerApi.deleteCustomer)
      .mockReset()
      .mockResolvedValue(undefined)
  })

  it('deletes successfully when the customer detail was prefetched', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const listKey = queryKeys.customersList({ page: 1, limit: 20 })
    const list: PaginatedCustomerResponse = {
      data: [customer],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }

    queryClient.setQueryData(listKey, list)
    queryClient.setQueryData(queryKeys.customer(customer.id), customer)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useDeleteCustomer(), { wrapper })

    await act(() => result.current.mutateAsync(customer.id))

    expect(customerApi.deleteCustomer).toHaveBeenCalledWith(customer.id)
    expect(
      queryClient.getQueryData<PaginatedCustomerResponse>(listKey)?.data
    ).toEqual([])
  })
})
