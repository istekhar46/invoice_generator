/**
 * Authentication Cleanup Service
 * 
 * Provides centralized authentication state cleanup that can be called
 * from anywhere in the application (hooks, interceptors, services, etc.)
 * 
 * This ensures consistent cleanup behavior across all logout/auth-failure scenarios.
 */

import type { QueryClient } from '@tanstack/react-query'
import { TokenManager } from './tokenManager'
import { queryKeys } from '../../lib/queryKeys'

class AuthCleanupService {
  private queryClient: QueryClient | null = null

  /**
   * Initialize the service with a query client instance
   * This should be called once during app initialization
   */
  initialize(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  /**
   * Clear all authentication state
   * This includes:
   * - Access token from memory
   * - Profile query cache
   * - All other cached queries (via cache invalidation service)
   */
  clearAuthState() {
    // Clear access token from memory
    TokenManager.clearAccessToken()

    // Clear profile query cache immediately if query client is available
    if (this.queryClient) {
      this.queryClient.removeQueries({ queryKey: queryKeys.profile() })
    } else {
      console.warn('AuthCleanupService: QueryClient not initialized, profile cache not cleared')
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.queryClient !== null
  }
}

// Export singleton instance
export const authCleanupService = new AuthCleanupService()
