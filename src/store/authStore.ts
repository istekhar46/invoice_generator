/**
 * Authentication Store (Legacy)
 * 
 * @deprecated This store is deprecated in favor of TanStack Query hooks.
 * Use useAuthStatus(), useLogin(), useRegister(), useLogout() from '../hooks/useAuth' instead.
 * 
 * This file is kept temporarily for backward compatibility during migration.
 * Authentication tokens are now managed by TokenManager in '../services/auth/tokenManager'.
 */

import { create } from 'zustand'
import { TokenManager } from '../services/auth/tokenManager'

/**
 * Minimal authentication store for backward compatibility
 * Most functionality has been moved to TanStack Query hooks
 */
interface AuthStore {
  // Deprecated - use useAuthStatus() hook instead
  isAuthenticated: boolean
  
  // Deprecated methods - use TanStack Query hooks instead
  checkAuthStatus: () => boolean
}

/**
 * @deprecated Use TanStack Query authentication hooks instead
 */
export const useAuthStore = create<AuthStore>(() => ({
  isAuthenticated: TokenManager.isAuthenticated(),
  
  checkAuthStatus: () => {
    return TokenManager.isAuthenticated()
  },
}))