import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../services/api'
import { getCacheInvalidationService } from '../services'
import { queryKeys } from '../lib'
import { useToast } from './useToast'
import { useOnlineStatus } from './useOnlineStatus'
import { useAutoRetryOnReconnect } from './useRetry'
import type { CustomerQueryParams, CustomerResponseDto, PaginatedCustomerResponse, CreateCustomerDto, UpdateCustomerDto } from '../services/api'

// Query key factory for customers (legacy - use queryKeys from lib instead)
export const customerKeys = {
  all: queryKeys.customers,
  lists: () => [...queryKeys.customers, 'list'] as const,
  list: (params: CustomerQueryParams) => queryKeys.customersList(params),
  details: () => [...queryKeys.customers, 'detail'] as const,
  detail: (id: string) => queryKeys.customer(id),
}

/**
 * Hook for fetching paginated customers list with search and filtering
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms, 9.2 - pagination support
 */
export function useCustomers(params: CustomerQueryParams = {}) {
  const { isOnline } = useOnlineStatus()
  
  // Set default pagination parameters
  const paginatedParams = {
    page: 1,
    limit: 20,
    ...params,
  }
  
  const query = useQuery({
    queryKey: queryKeys.customersList(paginatedParams),
    queryFn: () => customerApi.getCustomers(paginatedParams),
    placeholderData: (previousData) => previousData, // For smooth pagination (keepPreviousData replacement)
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data: PaginatedCustomerResponse) => ({
      ...data,
      // Transform dates from strings to Date objects
      data: data.data.map(customer => ({
        ...customer,
        createdAt: new Date(customer.createdAt),
        updatedAt: new Date(customer.updatedAt),
      }))
    }),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}

/**
 * Hook for fetching a single customer by ID
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useCustomer(id: string) {
  const { isOnline } = useOnlineStatus()
  
  const query = useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => customerApi.getCustomer(id),
    enabled: !!id, // Only run query if ID is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on 404 errors (customer not found)
      if (error?.status === 404) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data: CustomerResponseDto) => ({
      ...data,
      // Transform dates from strings to Date objects
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}

/**
 * Hook for searching customers with debounced query
 * Convenience hook that wraps useCustomers with search-specific defaults
 */
export function useCustomerSearch(
  searchQuery: string,
  options: Omit<CustomerQueryParams, 'search'> = {}
) {
  const params: CustomerQueryParams = {
    ...options,
    search: searchQuery || undefined, // Don't send empty string
  }

  return useCustomers(params)
}

/**
 * Hook for getting all customers without pagination
 * Useful for dropdowns and selects
 */
export function useAllCustomers() {
  return useCustomers({ 
    limit: 100, // Large limit to get all customers
    sortBy: 'name',
    sortOrder: 'asc'
  })
}

/**
 * Hook for paginated customers with explicit pagination controls
 * Provides easy pagination state management
 */
export function usePaginatedCustomers(
  page: number = 1,
  limit: number = 20,
  options: Omit<CustomerQueryParams, 'page' | 'limit'> = {}
) {
  const params: CustomerQueryParams = {
    ...options,
    page,
    limit,
  }

  const query = useCustomers(params)

  return {
    ...query,
    pagination: {
      currentPage: query.data?.page || 1,
      totalPages: query.data?.totalPages || 1,
      hasNext: query.data?.hasNext || false,
      hasPrev: query.data?.hasPrev || false,
      total: query.data?.total || 0,
      limit: query.data?.limit || limit,
    }
  }
}

/**
 * Hook for creating a new customer
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customerApi.createCustomer(data),
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on validation errors
      if (error?.status === 400 || error?.status === 422) return false
      // Retry once for other errors
      return failureCount < 1
    },
    // Retry delay
    retryDelay: 2000,
    onSuccess: (newCustomer) => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.customers.addCustomer({
        ...newCustomer,
        createdAt: new Date(newCustomer.createdAt),
        updatedAt: new Date(newCustomer.updatedAt),
      })
      
      // Show success notification
      success('Customer created', `${newCustomer.name} has been added successfully`)
    },
    onError: (err: any) => {
      console.error('Failed to create customer:', err)
      
      // Show different error messages based on network status
      if (!isOnline) {
        error('Cannot create customer while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 400 || err?.status === 422) {
        error('Invalid customer data', err?.data?.message || 'Please check your input and try again')
      } else {
        error('Failed to create customer', 'Please check your input and try again')
      }
    },
  })
}

/**
 * Hook for updating an existing customer
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customerApi.updateCustomer(id, data),
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on validation errors
      if (error?.status === 400 || error?.status === 422) return false
      // Don't retry on not found errors
      if (error?.status === 404) return false
      // Retry once for other errors
      return failureCount < 1
    },
    // Retry delay
    retryDelay: 2000,
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.customer(id) })

      // Snapshot the previous value
      const previousCustomer = queryClient.getQueryData(queryKeys.customer(id))

      // Optimistically update the customer
      if (previousCustomer) {
        const cacheService = getCacheInvalidationService(queryClient)
        cacheService.customers.updateCustomer(id, {
          ...previousCustomer,
          ...data,
          updatedAt: new Date(),
        })
      }

      return { previousCustomer }
    },
    onError: (err: any, { id }, context) => {
      // Rollback on error
      if (context?.previousCustomer) {
        queryClient.setQueryData(queryKeys.customer(id), context.previousCustomer)
      }
      console.error('Failed to update customer:', err)
      
      // Show different error messages based on network status
      if (!isOnline) {
        error('Cannot update customer while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 400 || err?.status === 422) {
        error('Invalid customer data', err?.data?.message || 'Please check your input and try again')
      } else if (err?.status === 404) {
        error('Customer not found', 'The customer may have been deleted')
      } else {
        error('Failed to update customer', 'Please check your input and try again')
      }
    },
    onSuccess: (updatedCustomer) => {
      success('Customer updated', `${updatedCustomer.name} has been updated successfully`)
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.customers.invalidateCustomer(id)
    },
  })
}

/**
 * Hook for deleting a customer
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (id: string) => customerApi.deleteCustomer(id),
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on not found errors (already deleted)
      if (error?.status === 404) return false
      // Retry once for other errors
      return failureCount < 1
    },
    // Retry delay
    retryDelay: 2000,
    onMutate: async (customerId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.customer(customerId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.customers })

      // Snapshot the previous customer lists
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.customers })

      // Optimistically remove the customer from all lists
      queryClient.setQueriesData(
        { queryKey: queryKeys.customers },
        (old: PaginatedCustomerResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter(customer => customer.id !== customerId),
            total: old.total - 1,
          }
        }
      )

      return { previousLists, customerId }
    },
    onError: (err: any, _, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      console.error('Failed to delete customer:', err)
      
      // Show different error messages based on network status
      if (!isOnline) {
        error('Cannot delete customer while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 404) {
        error('Customer not found', 'The customer may have already been deleted')
      } else {
        error('Failed to delete customer', 'Please try again')
      }
    },
    onSuccess: (_, customerId) => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.crossEntity.onCustomerDeleted(customerId)
      
      success('Customer deleted', 'Customer has been removed successfully')
    },
    onSettled: () => {
      // Always refetch lists after error or success
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.customers.invalidateAllLists()
    },
  })
}