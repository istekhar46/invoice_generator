import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query client configuration optimized for business applications with enhanced offline support.
 * 
 * Configuration details:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - Cached data is garbage collected after 10 minutes of inactivity
 * - retry: Enhanced retry logic with exponential backoff and offline awareness
 * - refetchOnWindowFocus: true - Refetch data when window regains focus
 * - refetchOnReconnect: true - Refetch data when network reconnects
 * - networkMode: 'offlineFirst' - Use cached data when offline
 * 
 * Requirements: 1.1, 1.2, 1.4, 8.4, 8.6 - TanStack Query setup, optimized cache configuration, retry policies, offline support, retry mechanisms
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cached data is garbage collected after 10 minutes of inactivity
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Enhanced retry logic with offline awareness and exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry if offline (let offline handling take over)
        if (!navigator.onLine) {
          return false
        }
        
        // Don't retry on authentication/authorization errors
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        
        // Don't retry on client errors (400-499) except for specific cases
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 408 && error?.status !== 429) {
          return false
        }
        
        // Retry up to 3 times for network errors and server errors
        return failureCount < 3
      },
      
      // Enhanced retry delay with exponential backoff and jitter
      retryDelay: (attemptIndex) => {
        const baseDelay = 1000 // 1 second
        const maxDelay = 30000 // 30 seconds
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay)
        // Add jitter to prevent thundering herd problem
        const jitter = Math.random() * 1000
        return exponentialDelay + jitter
      },
      
      // Refetch data when window regains focus for data freshness
      refetchOnWindowFocus: true,
      
      // Refetch data when network reconnects (enhanced offline support)
      refetchOnReconnect: true,
      
      // Always refetch on mount to ensure data freshness
      refetchOnMount: 'always',
      
      // Use cached data when offline (offline-first approach)
      networkMode: 'offlineFirst',
      
      // Enhanced error handling for offline scenarios
      throwOnError: (error: any) => {
        // Don't throw on network errors when offline - use cached data instead
        if (!navigator.onLine && (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR')) {
          return false
        }
        // Throw on authentication errors to trigger proper handling
        if (error?.status === 401 || error?.status === 403) {
          return true
        }
        // Don't throw on other errors - let components handle them gracefully
        return false
      },
    },
    mutations: {
      // Enhanced retry logic for mutations with offline awareness
      retry: (failureCount, error: any) => {
        // Don't retry if offline (queue mutations instead)
        if (!navigator.onLine) {
          return false
        }
        
        // Don't retry on authentication/authorization errors
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        
        // Don't retry on validation errors (400, 422)
        if (error?.status === 400 || error?.status === 422) {
          return false
        }
        
        // Don't retry on not found errors (404)
        if (error?.status === 404) {
          return false
        }
        
        // Retry once for network errors and server errors
        return failureCount < 1
      },
      
      // Enhanced retry delay for mutations
      retryDelay: (attemptIndex) => {
        const baseDelay = 2000 // 2 seconds for mutations
        const maxDelay = 10000 // 10 seconds max
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay)
        // Add jitter
        const jitter = Math.random() * 500
        return exponentialDelay + jitter
      },
      
      // Use online-only mode for mutations to prevent data corruption
      networkMode: 'online',
    },
  },
})