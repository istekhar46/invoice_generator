/**
 * Data Prefetching Service
 * Handles prefetching of related data for performance optimization
 * Requirements: 9.4 - prefetch related data when appropriate
 */

import { QueryClient } from '@tanstack/react-query'
import { customerApi, invoiceApi, companyApi } from '../api'
import { queryKeys } from '../../lib'

export class PrefetchService {
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  /**
   * Prefetch customer data when hovering over customer-related elements
   */
  async prefetchCustomer(customerId: string) {
    if (!customerId) return

    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.customer(customerId),
      queryFn: () => customerApi.getCustomer(customerId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }

  /**
   * Prefetch invoice data when hovering over invoice-related elements
   */
  async prefetchInvoice(invoiceId: string) {
    if (!invoiceId) return

    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.invoice(invoiceId),
      queryFn: () => invoiceApi.getInvoice(invoiceId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }

  /**
   * Prefetch customer's invoices when viewing customer details
   */
  async prefetchCustomerInvoices(customerId: string) {
    if (!customerId) return

    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.invoicesList({ customerId, limit: 10 }),
      queryFn: () => invoiceApi.getInvoices({ customerId, limit: 10 }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }

  /**
   * Prefetch next page of paginated data
   */
  async prefetchNextPage<T>(
    queryKey: any[],
    queryFn: () => Promise<T>,
    currentPage: number,
    hasNext: boolean
  ) {
    if (!hasNext) return

    const nextPageKey = [...queryKey.slice(0, -1), { ...queryKey[queryKey.length - 1], page: currentPage + 1 }]
    
    await this.queryClient.prefetchQuery({
      queryKey: nextPageKey,
      queryFn,
      staleTime: 2 * 60 * 1000, // 2 minutes for pagination
    })
  }

  /**
   * Prefetch company profile when user might need it
   */
  async prefetchCompanyProfile() {
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.companyProfile(),
      queryFn: () => companyApi.getProfile(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
  }

  /**
   * Prefetch related data for invoice creation/editing
   */
  async prefetchInvoiceRelatedData() {
    // Prefetch customers for invoice creation
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.customersList({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
      queryFn: () => customerApi.getCustomers({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
      staleTime: 5 * 60 * 1000,
    })

    // Prefetch company profile for invoice generation
    await this.prefetchCompanyProfile()
  }

  /**
   * Prefetch data for dashboard
   */
  async prefetchDashboardData() {
    // Prefetch recent invoices
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.invoicesList({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      queryFn: () => invoiceApi.getInvoices({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      staleTime: 2 * 60 * 1000,
    })

    // Prefetch recent customers
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.customersList({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      queryFn: () => customerApi.getCustomers({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      staleTime: 2 * 60 * 1000,
    })
  }

  /**
   * Intelligent prefetching based on user behavior patterns
   */
  async smartPrefetch(context: 'customer-list' | 'invoice-list' | 'dashboard' | 'invoice-form') {
    switch (context) {
      case 'customer-list':
        // When viewing customers, likely to view invoices next
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.invoicesList({ limit: 20 }),
          queryFn: () => invoiceApi.getInvoices({ limit: 20 }),
          staleTime: 3 * 60 * 1000,
        })
        break

      case 'invoice-list':
        // When viewing invoices, likely to view customers next
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.customersList({ limit: 20 }),
          queryFn: () => customerApi.getCustomers({ limit: 20 }),
          staleTime: 3 * 60 * 1000,
        })
        break

      case 'dashboard':
        await this.prefetchDashboardData()
        break

      case 'invoice-form':
        await this.prefetchInvoiceRelatedData()
        break
    }
  }
}

// Create singleton instance
let prefetchService: PrefetchService | null = null

export const getPrefetchService = (queryClient: QueryClient): PrefetchService => {
  if (!prefetchService) {
    prefetchService = new PrefetchService(queryClient)
  }
  return prefetchService
}

export const createPrefetchService = (queryClient: QueryClient): PrefetchService => {
  return new PrefetchService(queryClient)
}