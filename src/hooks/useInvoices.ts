import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceApi } from '../services/api'
import { getCacheInvalidationService } from '../services'
import { queryKeys } from '../lib'
import { useToast } from './useToast'
import { useOnlineStatus } from './useOnlineStatus'
import { useAutoRetryOnReconnect } from './useRetry'
import type { 
  InvoiceQueryParams, 
  InvoiceResponseDto, 
  PaginatedInvoiceResponse,
  CreateInvoiceDto,
  UpdateInvoiceDto
} from '../services/api'

// Query key factory for invoices (legacy - use queryKeys from lib instead)
export const invoiceKeys = {
  all: queryKeys.invoices,
  lists: () => [...queryKeys.invoices, 'list'] as const,
  list: (params: InvoiceQueryParams) => queryKeys.invoicesList(params),
  details: () => [...queryKeys.invoices, 'detail'] as const,
  detail: (id: string) => queryKeys.invoice(id),
}

/**
 * Hook for fetching paginated invoices list with filtering and sorting
 * Supports filtering by status, customer, and date range
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms, 9.2 - pagination support
 */
export function useInvoices(params: InvoiceQueryParams = {}) {
  const { isOnline } = useOnlineStatus()
  
  // Set default pagination parameters
  const paginatedParams = {
    page: 1,
    limit: 20,
    ...params,
  }
  
  const query = useQuery({
    queryKey: queryKeys.invoicesList(paginatedParams),
    queryFn: () => invoiceApi.getInvoices(paginatedParams),
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
    select: (data: PaginatedInvoiceResponse) => ({
      ...data,
      // Transform dates from strings to Date objects
      data: data.data.map(invoice => ({
        ...invoice,
        serviceDate: new Date(invoice.serviceDate),
        dueDate: new Date(invoice.dueDate),
        createdAt: new Date(invoice.createdAt),
        updatedAt: new Date(invoice.updatedAt),
      }))
    }),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}

/**
 * Hook for fetching a single invoice by ID with complete line items data
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useInvoice(id: string) {
  const { isOnline } = useOnlineStatus()
  
  const query = useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => invoiceApi.getInvoice(id),
    enabled: !!id, // Only run query if ID is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on 404 errors (invoice not found)
      if (error?.status === 404) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data: InvoiceResponseDto) => ({
      ...data,
      // Transform dates from strings to Date objects
      serviceDate: new Date(data.serviceDate),
      dueDate: new Date(data.dueDate),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}

/**
 * Hook for filtering invoices by status
 * Convenience hook that wraps useInvoices with status-specific filtering
 */
export function useInvoicesByStatus(
  status: 'DRAFT' | 'SENT' | 'PAID',
  options: Omit<InvoiceQueryParams, 'status'> = {}
) {
  const params: InvoiceQueryParams = {
    ...options,
    status,
  }

  return useInvoices(params)
}

/**
 * Hook for filtering invoices by customer
 * Convenience hook for customer-specific invoices
 */
export function useInvoicesByCustomer(
  customerId: string,
  options: Omit<InvoiceQueryParams, 'customerId'> = {}
) {
  const params: InvoiceQueryParams = {
    ...options,
    customerId,
  }

  return useInvoices(params)
}

/**
 * Hook for filtering invoices by date range
 * Convenience hook for date range filtering
 */
export function useInvoicesByDateRange(
  dateFrom: Date,
  dateTo: Date,
  options: Omit<InvoiceQueryParams, 'dateFrom' | 'dateTo'> = {}
) {
  const params: InvoiceQueryParams = {
    ...options,
    dateFrom,
    dateTo,
  }

  return useInvoices(params)
}

/**
 * Hook for getting draft invoices
 * Convenience hook for draft invoices with default sorting
 */
export function useDraftInvoices(options: Omit<InvoiceQueryParams, 'status'> = {}) {
  return useInvoicesByStatus('DRAFT', {
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...options,
  })
}

/**
 * Hook for getting sent invoices
 * Convenience hook for sent invoices with default sorting
 */
export function useSentInvoices(options: Omit<InvoiceQueryParams, 'status'> = {}) {
  return useInvoicesByStatus('SENT', {
    sortBy: 'serviceDate',
    sortOrder: 'asc',
    ...options,
  })
}

/**
 * Hook for getting paid invoices
 * Convenience hook for paid invoices with default sorting
 */
export function usePaidInvoices(options: Omit<InvoiceQueryParams, 'status'> = {}) {
  return useInvoicesByStatus('PAID', {
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...options,
  })
}

/**
 * Hook for getting recent invoices
 * Convenience hook for recent invoices across all statuses
 */
export function useRecentInvoices(limit: number = 10) {
  return useInvoices({
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit,
  })
}

/**
 * Hook for paginated invoices with explicit pagination controls
 * Provides easy pagination state management
 */
export function usePaginatedInvoices(
  page: number = 1,
  limit: number = 20,
  options: Omit<InvoiceQueryParams, 'page' | 'limit'> = {}
) {
  const params: InvoiceQueryParams = {
    ...options,
    page,
    limit,
  }

  const query = useInvoices(params)

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
 * Hook for creating a new invoice
 * Implements optimistic updates and proper cache invalidation
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (data: CreateInvoiceDto) => invoiceApi.createInvoice(data),
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
    onSuccess: (newInvoice) => {
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.invoices.addInvoice({
        ...newInvoice,
        serviceDate: new Date(newInvoice.serviceDate),
        dueDate: new Date(newInvoice.dueDate),
        createdAt: new Date(newInvoice.createdAt),
        updatedAt: new Date(newInvoice.updatedAt),
      })
      // Invalidate dashboard statistics cache when new invoice is created
      cacheService.dashboard.invalidateStatistics()
      
      success('Invoice created', `Invoice ${newInvoice.invoiceNumber} has been created successfully`)
    },
    onError: (err: any) => {
      console.error('Failed to create invoice:', err)
      
      // Show different error messages based on network status
      if (!isOnline) {
        error('Cannot create invoice while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 400 || err?.status === 422) {
        error('Invalid invoice data', err?.data?.message || 'Please check your input and try again')
      } else {
        error('Failed to create invoice', 'Please check your input and try again')
      }
    },
  })
}

/**
 * Hook for updating an existing invoice
 * Implements optimistic updates with rollback on error
 * Requirements: 1.3, 2.4, 2.5, 7.1, 7.2
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceDto }) =>
      invoiceApi.updateInvoice(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices })

      // Snapshot the previous invoice value for rollback
      const previousInvoice = queryClient.getQueryData(queryKeys.invoice(id))

      // Snapshot all invoice lists for rollback
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.invoices })

      // Optimistically update the invoice in detail cache
      if (previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), {
          ...previousInvoice,
          ...data,
          // Transform dates if they exist in the update data
          serviceDate: data.serviceDate 
            ? (data.serviceDate instanceof Date ? data.serviceDate : new Date(data.serviceDate))
            : (previousInvoice as any).serviceDate,
          dueDate: data.dueDate 
            ? (data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate))
            : (previousInvoice as any).dueDate,
          updatedAt: new Date(),
        })
      }

      // Optimistically update the invoice in all list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.invoices },
        (old: PaginatedInvoiceResponse | undefined) => {
          if (!old || !old.data) return old
          return {
            ...old,
            data: old.data.map(invoice => 
              invoice.id === id 
                ? {
                    ...invoice,
                    ...data,
                    serviceDate: data.serviceDate 
                      ? (data.serviceDate instanceof Date ? data.serviceDate : new Date(data.serviceDate))
                      : invoice.serviceDate,
                    dueDate: data.dueDate 
                      ? (data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate))
                      : invoice.dueDate,
                    updatedAt: new Date(),
                  }
                : invoice
            ),
          }
        }
      )

      return { previousInvoice, previousLists }
    },
    onError: (err: any, { id }, context) => {
      // Rollback detail cache on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice)
      }

      // Rollback all list caches on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }

      console.error('Failed to update invoice:', err)
      
      // User-friendly error messages based on error status
      if (!isOnline) {
        error('Cannot update while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 400 || err?.status === 422) {
        // Extract detailed validation error message
        const errorMessage = err?.data?.message || err?.message || 'Please check your input and try again'
        error('Invalid invoice data', errorMessage)
      } else if (err?.status === 404) {
        error('Invoice not found', 'The invoice may have been deleted')
      } else if (err?.status === 403) {
        error('Access denied', 'You do not have permission to update this invoice')
      } else {
        error('Failed to update invoice', err?.message || 'Please try again')
      }
    },
    onSuccess: (updatedInvoice) => {
      success('Invoice updated', `Invoice ${updatedInvoice.invoiceNumber} has been updated successfully`)
    },
    onSettled: (_, __, { id }) => {
      // Always refetch to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      // Invalidate dashboard statistics as invoice data may affect totals
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

/**
 * Hook for updating invoice status with optimistic updates
 * Implements optimistic updates for immediate UI feedback
 * Integrates offline support and retry mechanisms
 * Requirements: 8.4 - offline status indication, 8.6 - retry mechanisms
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'DRAFT' | 'SENT' | 'PAID' }) =>
      invoiceApi.updateInvoiceStatus(id, status),
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
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) })
      
      // Snapshot previous value
      const previousInvoice = queryClient.getQueryData(queryKeys.invoice(id))
      
      // Use centralized cache invalidation service for optimistic updates
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.invoices.updateInvoiceStatus(id, status)
      
      return { previousInvoice }
    },
    onError: (err: any, { id }, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice)
      }
      console.error('Failed to update invoice status:', err)
      
      // Show different error messages based on network status
      if (!isOnline) {
        error('Cannot update status while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 404) {
        error('Invoice not found', 'The invoice may have been deleted')
      } else {
        error('Failed to update status', 'Please try again')
      }
    },
    onSuccess: (_, { status }) => {
      const statusText = status.toLowerCase()
      success('Status updated', `Invoice has been marked as ${statusText}`)
    },
    onSettled: (_, __, { id }) => {
      // Refetch to ensure consistency
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.invoices.invalidateInvoice(id)
      // Also invalidate all invoice lists to update dashboard statistics
      cacheService.invoices.invalidateAllLists()
      // Invalidate dashboard statistics cache
      cacheService.dashboard.invalidateStatistics()
    },
  })
}

/**
 * Hook for deleting an invoice
 * Implements optimistic updates with rollback on error
 * Requirements: 3.3, 4.5, 7.3, 7.4, 7.5
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (id: string) => invoiceApi.deleteInvoice(id),
    onMutate: async (invoiceId) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(invoiceId) })
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices })

      // Snapshot the previous invoice for rollback
      const previousInvoice = queryClient.getQueryData(queryKeys.invoice(invoiceId))

      // Snapshot all invoice lists for rollback
      const previousLists = queryClient.getQueriesData({ queryKey: queryKeys.invoices })

      // Optimistically remove the invoice from detail cache
      queryClient.removeQueries({ queryKey: queryKeys.invoice(invoiceId) })

      // Optimistically remove the invoice from all list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.invoices },
        (old: PaginatedInvoiceResponse | undefined) => {
          if (!old || !old.data) return old
          return {
            ...old,
            data: old.data.filter(invoice => invoice.id !== invoiceId),
            total: old.total - 1,
          }
        }
      )

      return { previousInvoice, previousLists, invoiceId }
    },
    onError: (err: any, invoiceId, context) => {
      // Rollback detail cache on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(invoiceId), context.previousInvoice)
      }

      // Rollback all list caches on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }

      console.error('Failed to delete invoice:', err)
      
      // User-friendly error messages based on error status
      if (!isOnline) {
        error('Cannot delete while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 404) {
        error('Invoice not found', 'The invoice may have already been deleted')
      } else if (err?.status === 403) {
        error('Access denied', 'You do not have permission to delete this invoice')
      } else {
        error('Failed to delete invoice', err?.message || 'Please try again')
      }
    },
    onSuccess: () => {
      success('Invoice deleted', 'Invoice has been removed successfully')
    },
    onSettled: () => {
      // Always refetch to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      // Invalidate dashboard statistics as invoice deletion affects totals
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      // Invalidate customer-related queries as they may show invoice counts
      queryClient.invalidateQueries({ queryKey: queryKeys.customers })
    },
  })
}