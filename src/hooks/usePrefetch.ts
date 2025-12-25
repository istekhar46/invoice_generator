/**
 * Prefetching Hooks
 * Provides hooks for data prefetching on hover and other interactions
 * Requirements: 9.4 - prefetch related data when appropriate
 */

import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getPrefetchService } from '../services/prefetch'

/**
 * Hook for prefetching data on hover with debouncing
 */
export function usePrefetchOnHover() {
  const queryClient = useQueryClient()
  const prefetchService = getPrefetchService(queryClient)
  const timeoutRef = useRef<number | null>(null)

  const prefetchCustomer = useCallback((customerId: string, delay: number = 300) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      prefetchService.prefetchCustomer(customerId)
    }, delay) as unknown as number
  }, [prefetchService])

  const prefetchInvoice = useCallback((invoiceId: string, delay: number = 300) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      prefetchService.prefetchInvoice(invoiceId)
    }, delay) as unknown as number
  }, [prefetchService])

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return {
    prefetchCustomer,
    prefetchInvoice,
    cancelPrefetch,
  }
}

/**
 * Hook for prefetching related data based on context
 */
export function usePrefetchRelated() {
  const queryClient = useQueryClient()
  const prefetchService = getPrefetchService(queryClient)

  const prefetchCustomerInvoices = useCallback((customerId: string) => {
    return prefetchService.prefetchCustomerInvoices(customerId)
  }, [prefetchService])

  const prefetchInvoiceRelatedData = useCallback(() => {
    return prefetchService.prefetchInvoiceRelatedData()
  }, [prefetchService])

  const prefetchCompanyProfile = useCallback(() => {
    return prefetchService.prefetchCompanyProfile()
  }, [prefetchService])

  const smartPrefetch = useCallback((context: 'customer-list' | 'invoice-list' | 'dashboard' | 'invoice-form') => {
    return prefetchService.smartPrefetch(context)
  }, [prefetchService])

  return {
    prefetchCustomerInvoices,
    prefetchInvoiceRelatedData,
    prefetchCompanyProfile,
    smartPrefetch,
  }
}

/**
 * Hook for prefetching next page in pagination
 */
export function usePrefetchNextPage() {
  const queryClient = useQueryClient()
  const prefetchService = getPrefetchService(queryClient)

  const prefetchNextPage = useCallback(<T>(
    queryKey: any[],
    queryFn: () => Promise<T>,
    currentPage: number,
    hasNext: boolean
  ) => {
    return prefetchService.prefetchNextPage(queryKey, queryFn, currentPage, hasNext)
  }, [prefetchService])

  return { prefetchNextPage }
}

/**
 * Hook for automatic prefetching based on user interactions
 */
export function useAutoPrefetch() {
  const { smartPrefetch } = usePrefetchRelated()
  const { prefetchNextPage } = usePrefetchNextPage()

  // Auto-prefetch next page when user is near the end of current page
  const handleScroll = useCallback((
    queryKey: any[],
    queryFn: () => Promise<any>,
    currentPage: number,
    hasNext: boolean
  ) => {
    const scrollPosition = window.scrollY + window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const threshold = 0.8 // Prefetch when 80% scrolled

    if (scrollPosition >= documentHeight * threshold && hasNext) {
      prefetchNextPage(queryKey, queryFn, currentPage, hasNext)
    }
  }, [prefetchNextPage])

  return {
    smartPrefetch,
    handleScroll,
  }
}