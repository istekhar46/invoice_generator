import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CustomerList } from './CustomerList'

vi.mock('../../../hooks/useCustomers', () => ({
  usePaginatedCustomers: () => ({
    data: { data: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    pagination: {
      currentPage: 1,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      total: 0,
      limit: 20,
    },
  }),
  useDeleteCustomer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('../../../hooks/usePrefetch', () => ({
  useAutoPrefetch: () => ({ smartPrefetch: vi.fn() }),
}))

vi.mock('./CustomerFormModal', () => ({
  CustomerFormModal: () => null,
}))

describe('CustomerList selectable empty state', () => {
  it('offers the invoice flow a way to add a customer', async () => {
    const user = userEvent.setup()
    const onAddCustomer = vi.fn()

    render(
      <CustomerList
        selectable
        onAddCustomer={onAddCustomer}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Add Customer' }))

    expect(onAddCustomer).toHaveBeenCalledOnce()
  })
})
