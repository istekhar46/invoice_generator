import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { queryKeys } from '../lib'
import { useOnlineStatus } from './useOnlineStatus'
import { useAutoRetryOnReconnect } from './useRetry'

/**
 * Hook for fetching dashboard statistics
 * Provides aggregated invoice data for dashboard display
 * Integrates offline support and retry mechanisms
 * Requirements: 10.1 - dashboard statistics
 */
export function useDashboardStats() {
  const { isOnline } = useOnlineStatus()
  
  const query = useQuery({
    queryKey: queryKeys.dashboardStatistics(),
    queryFn: () => dashboardApi.getStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on auth errors
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on not found errors
      if (error?.status === 404) return false
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}
