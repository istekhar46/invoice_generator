/**
 * Cache Invalidation Service
 * 
 * Provides centralized cache invalidation strategies for TanStack Query.
 * This service ensures consistent cache management across all mutations
 * and implements background refetch strategies.
 * 
 * Requirements: 7.1, 7.6 - cache invalidation on mutations, background refetch on focus
 */

import { QueryClient } from '@tanstack/react-query'
import { queryKeys, queryKeyUtils } from '../../lib/queryKeys'

export class CacheInvalidationService {
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  /**
   * Authentication-related cache invalidation
   */
  auth = {
    /**
     * Invalidate all authentication-related queries
     * Called after login, logout, or token refresh
     */
    invalidateAll: () => {
      this.queryClient.invalidateQueries({ queryKey: queryKeys.auth })
    },

    /**
     * Clear all cached data (used on logout)
     */
    clearAll: () => {
      this.queryClient.clear()
    },

    /**
     * Update profile cache with new user data
     */
    updateProfile: (userData: any) => {
      this.queryClient.setQueryData(queryKeys.profile(), userData)
    },

    /**
     * Invalidate profile query specifically
     */
    invalidateProfile: () => {
      this.queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
    },
  }

  /**
   * Customer-related cache invalidation
   */
  customers = {
    /**
     * Invalidate all customer list queries
     * Called after creating, updating, or deleting customers
     */
    invalidateAllLists: () => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeyUtils.getAllCustomerListKeys() 
      })
    },

    /**
     * Invalidate specific customer detail query
     */
    invalidateDetail: (customerId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.customer(customerId) 
      })
    },

    /**
     * Invalidate both lists and specific customer detail
     */
    invalidateCustomer: (customerId: string) => {
      this.customers.invalidateAllLists()
      this.customers.invalidateDetail(customerId)
    },

    /**
     * Remove customer from cache (after deletion)
     */
    removeCustomer: (customerId: string) => {
      this.queryClient.removeQueries({ 
        queryKey: queryKeys.customer(customerId) 
      })
      this.customers.invalidateAllLists()
    },

    /**
     * Update customer in cache (optimistic update)
     */
    updateCustomer: (customerId: string, customerData: any) => {
      this.queryClient.setQueryData(queryKeys.customer(customerId), customerData)
    },

    /**
     * Add new customer to cache
     */
    addCustomer: (customerData: any) => {
      this.queryClient.setQueryData(queryKeys.customer(customerData.id), customerData)
      this.customers.invalidateAllLists()
    },
  }

  /**
   * Invoice-related cache invalidation
   */
  invoices = {
    /**
     * Invalidate all invoice list queries
     * Called after creating, updating, or deleting invoices
     */
    invalidateAllLists: () => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeyUtils.getAllInvoiceListKeys() 
      })
    },

    /**
     * Invalidate specific invoice detail query
     */
    invalidateDetail: (invoiceId: string) => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoice(invoiceId) 
      })
    },

    /**
     * Invalidate both lists and specific invoice detail
     */
    invalidateInvoice: (invoiceId: string) => {
      this.invoices.invalidateAllLists()
      this.invoices.invalidateDetail(invoiceId)
    },

    /**
     * Remove invoice from cache (after deletion)
     */
    removeInvoice: (invoiceId: string) => {
      this.queryClient.removeQueries({ 
        queryKey: queryKeys.invoice(invoiceId) 
      })
      this.invoices.invalidateAllLists()
    },

    /**
     * Update invoice in cache (optimistic update)
     */
    updateInvoice: (invoiceId: string, invoiceData: any) => {
      this.queryClient.setQueryData(queryKeys.invoice(invoiceId), invoiceData)
    },

    /**
     * Add new invoice to cache
     */
    addInvoice: (invoiceData: any) => {
      this.queryClient.setQueryData(queryKeys.invoice(invoiceData.id), invoiceData)
      this.invoices.invalidateAllLists()
    },

    /**
     * Update invoice status optimistically across all queries
     */
    updateInvoiceStatus: (invoiceId: string, status: 'DRAFT' | 'SENT' | 'PAID') => {
      // Update detail query
      this.queryClient.setQueryData(queryKeys.invoice(invoiceId), (old: any) => {
        if (!old) return old
        return { ...old, status, updatedAt: new Date() }
      })

      // Update all list queries that might contain this invoice
      this.queryClient.setQueriesData(
        { queryKey: queryKeyUtils.getAllInvoiceListKeys() },
        (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((invoice: any) => 
              invoice.id === invoiceId 
                ? { ...invoice, status, updatedAt: new Date() }
                : invoice
            ),
          }
        }
      )
    },

    /**
     * Invalidate invoices by customer (when customer is updated/deleted)
     */
    invalidateByCustomer: (customerId: string) => {
      // Invalidate all invoice lists as they might contain invoices for this customer
      this.invoices.invalidateAllLists()
      
      // Also invalidate any customer-specific invoice queries
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoicesByCustomer(customerId) 
      })
    },
  }

  /**
   * Company profile-related cache invalidation
   */
  company = {
    /**
     * Invalidate company profile query
     */
    invalidateProfile: () => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.companyProfile() 
      })
    },

    /**
     * Update company profile in cache
     */
    updateProfile: (profileData: any) => {
      this.queryClient.setQueryData(queryKeys.companyProfile(), profileData)
    },

    /**
     * Remove company profile from cache
     */
    removeProfile: () => {
      this.queryClient.removeQueries({ 
        queryKey: queryKeys.companyProfile() 
      })
    },

    /**
     * Update logo URL in company profile
     */
    updateLogo: (logoUrl: string | null | undefined) => {
      this.queryClient.setQueryData(queryKeys.companyProfile(), (old: any) => {
        if (!old) return old
        return { ...old, logoUrl: logoUrl || null, updatedAt: new Date() }
      })
    },
  }

  /**
   * Dashboard-related cache invalidation
   */
  dashboard = {
    /**
     * Invalidate dashboard statistics query
     */
    invalidateStatistics: () => {
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.dashboardStatistics() 
      })
    },

    /**
     * Update dashboard statistics in cache (optimistic update)
     */
    updateStatistics: (statsData: any) => {
      this.queryClient.setQueryData(queryKeys.dashboardStatistics(), statsData)
    },

    /**
     * Remove dashboard statistics from cache
     */
    removeStatistics: () => {
      this.queryClient.removeQueries({ 
        queryKey: queryKeys.dashboardStatistics() 
      })
    },
  }

  /**
   * Cross-entity invalidation strategies
   */
  crossEntity = {
    /**
     * Invalidate related data when a customer is deleted
     * This affects invoices that belong to the customer
     */
    onCustomerDeleted: (customerId: string) => {
      this.customers.removeCustomer(customerId)
      this.invoices.invalidateByCustomer(customerId)
    },

    /**
     * Invalidate related data when user logs out
     */
    onLogout: () => {
      this.auth.clearAll()
    },

    /**
     * Invalidate related data when user logs in
     */
    onLogin: () => {
      // Invalidate all queries to refetch with new auth context
      this.queryClient.invalidateQueries()
    },

    /**
     * Refresh all stale data (called on window focus or network reconnect)
     */
    refreshStaleData: () => {
      // This is handled automatically by TanStack Query's refetchOnWindowFocus
      // and refetchOnReconnect settings, but can be called manually if needed
      this.queryClient.invalidateQueries({
        refetchType: 'active', // Only refetch currently active queries
      })
    },
  }

  /**
   * Background refetch strategies
   */
  backgroundRefetch = {
    /**
     * Enable background refetch on window focus
     * This is configured globally in queryClient but can be controlled per query
     */
    enableWindowFocusRefetch: () => {
      // This is already enabled globally in queryClient configuration
      // Individual queries can override this behavior
    },

    /**
     * Enable background refetch on network reconnect
     */
    enableNetworkReconnectRefetch: () => {
      // This is already enabled globally in queryClient configuration
    },

    /**
     * Manually trigger background refetch for critical data
     */
    refetchCriticalData: () => {
      // Refetch user profile
      this.queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
      
      // Refetch company profile
      this.queryClient.invalidateQueries({ queryKey: queryKeys.companyProfile() })
      
      // Refetch recent data (first page of lists)
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.customersList({ page: 1, limit: 10 })
      })
      this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.invoicesList({ page: 1, limit: 10 })
      })
    },

    /**
     * Set up periodic background refresh for specific queries
     */
    setupPeriodicRefresh: (intervalMs: number = 5 * 60 * 1000) => {
      // This would typically be handled by TanStack Query's refetchInterval option
      // on individual queries rather than globally
      console.log(`Periodic refresh would be set up with interval: ${intervalMs}ms`)
    },
  }

  /**
   * Utility methods for cache management
   */
  utils = {
    /**
     * Get cache statistics
     */
    getCacheStats: () => {
      const cache = this.queryClient.getQueryCache()
      const queries = cache.getAll()
      
      return {
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
        staleQueries: queries.filter(q => q.isStale()).length,
        errorQueries: queries.filter(q => q.state.status === 'error').length,
      }
    },

    /**
     * Clear all error queries
     */
    clearErrorQueries: () => {
      const cache = this.queryClient.getQueryCache()
      const errorQueries = cache.getAll().filter(q => q.state.status === 'error')
      
      errorQueries.forEach(query => {
        this.queryClient.removeQueries({ queryKey: query.queryKey })
      })
    },

    /**
     * Prefetch related data
     */
    prefetchRelatedData: async (entityType: 'customer' | 'invoice', entityId: string) => {
      if (entityType === 'customer') {
        // Prefetch customer's invoices
        await this.queryClient.prefetchQuery({
          queryKey: queryKeys.invoicesByCustomer(entityId),
          queryFn: () => {
            // This would need to be imported from the appropriate API service
            // For now, we'll just return a promise that resolves
            return Promise.resolve([])
          },
        })
      }
    },

    /**
     * Validate cache consistency
     */
    validateCacheConsistency: () => {
      // This could implement checks to ensure cache data is consistent
      // For example, checking that customer data in lists matches detail data
      const stats = this.utils.getCacheStats()
      console.log('Cache consistency check:', stats)
      return stats
    },
  }
}

/**
 * Create a cache invalidation service instance
 */
export const createCacheInvalidationService = (queryClient: QueryClient) => {
  return new CacheInvalidationService(queryClient)
}

/**
 * Default cache invalidation service instance
 * This will be initialized with the main query client
 */
let defaultCacheService: CacheInvalidationService | null = null

export const getCacheInvalidationService = (queryClient?: QueryClient): CacheInvalidationService => {
  if (!defaultCacheService && queryClient) {
    defaultCacheService = new CacheInvalidationService(queryClient)
  }
  
  if (!defaultCacheService) {
    throw new Error('Cache invalidation service not initialized. Please provide a QueryClient instance.')
  }
  
  return defaultCacheService
}

/**
 * Initialize the default cache invalidation service
 */
export const initializeCacheService = (queryClient: QueryClient) => {
  defaultCacheService = new CacheInvalidationService(queryClient)
  return defaultCacheService
}