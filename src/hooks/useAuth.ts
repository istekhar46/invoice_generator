import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, TokenManager } from '../services/api'
import { getCacheInvalidationService } from '../services'
import { queryKeys } from '../lib'
import { useToast } from './useToast'
import { useOnlineStatus } from './useOnlineStatus'
import { useAutoRetryOnReconnect } from './useRetry'
import type { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto 
} from '../services/api'

// Query keys for authentication (legacy - use queryKeys from lib instead)
export const authQueryKeys = {
  auth: queryKeys.auth,
  profile: queryKeys.profile,
}

/**
 * Hook for user profile query
 * Fetches current user profile data from the server
 * Integrates offline support and retry mechanisms
 * Requirements: 3.5 - fetch user profile data via GET /auth/me, 8.4 - offline support, 8.6 - retry mechanisms
 */
export function useUserProfile() {
  const { isOnline } = useOnlineStatus()
  
  const query = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => authApi.getProfile(),
    enabled: TokenManager.isAuthenticated(), // Only fetch if user has token
    staleTime: 10 * 60 * 1000, // Profile data is fresh for 10 minutes
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on auth errors - user needs to login again
      if (error?.status === 401 || error?.status === 403) return false
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  // Auto-retry when coming back online
  useAutoRetryOnReconnect(() => query.refetch(), { enabled: !!query.error })

  return query
}

/**
 * Hook for user login mutation
 * Handles user authentication and token storage
 * Integrates offline support and retry mechanisms
 * Requirements: 3.1 - authenticate via POST /auth/login, 3.4 - token management, 8.4 - offline support, 8.6 - retry mechanisms
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const { isOnline } = useOnlineStatus()

  return useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    // Enhanced retry logic for offline support
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!isOnline) return false
      // Don't retry on authentication errors (invalid credentials)
      if (error?.status === 401 || error?.status === 403) return false
      // Don't retry on validation errors
      if (error?.status === 400 || error?.status === 422) return false
      // Retry once for other errors (network issues, server errors)
      return failureCount < 1
    },
    // Retry delay
    retryDelay: 2000,
    onSuccess: (data: AuthResponseDto) => {
      // Store tokens securely
      TokenManager.setTokens(data.accessToken, data.refreshToken)
      
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
      cacheService.crossEntity.onLogin()
      
      success('Welcome back!', `Logged in as ${data.user.displayName || data.user.email}`)
    },
    onError: (err: any) => {
      // Clear any existing tokens on login failure
      TokenManager.clearTokens()
      
      console.error('Login failed:', err)
      
      // Show different error messages based on network status and error type
      if (!isOnline) {
        error('Cannot login while offline', 'Please check your internet connection and try again')
      } else if (err?.status === 401) {
        error('Invalid credentials', 'Please check your email and password')
      } else if (err?.status === 400 || err?.status === 422) {
        error('Invalid login data', err?.data?.message || 'Please check your input and try again')
      } else {
        error('Login failed', 'Please check your credentials and try again')
      }
    },
  })
}

/**
 * Hook for user registration mutation
 * Handles user registration and automatic login
 * Requirements: 3.2 - create account via POST /auth/register, 3.4 - token management
 */
export function useRegister() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (userData: RegisterDto) => authApi.register(userData),
    onSuccess: (data: AuthResponseDto) => {
      // Store tokens after successful registration
      TokenManager.setTokens(data.accessToken, data.refreshToken)
      
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
      cacheService.crossEntity.onLogin()
      
      success('Account created!', `Welcome ${data.user.displayName || data.user.email}`)
    },
    onError: (err) => {
      console.error('Registration failed:', err)
      error('Registration failed', 'Please check your information and try again')
    },
  })
}

/**
 * Hook for user logout mutation
 * Handles server-side session invalidation and local cleanup
 * Requirements: 3.3 - invalidate session via POST /auth/logout, 3.4 - token management
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { success } = useToast()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear tokens from storage
      TokenManager.clearTokens()
      
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.crossEntity.onLogout()
      
      success('Logged out', 'You have been logged out successfully')
      
      // Navigate to login page using React Router
      navigate('/login', { replace: true })
    },
    onError: (err) => {
      // Even if server logout fails, clear local state
      console.warn('Server logout failed, clearing local state:', err)
      TokenManager.clearTokens()
      
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.crossEntity.onLogout()
      
      // Navigate to login page using React Router
      navigate('/login', { replace: true })
    },
    // Always attempt logout even if offline
    retry: false,
  })
}

/**
 * Hook for token refresh mutation
 * Handles automatic token refresh when tokens expire
 * Requirements: 3.4 - token management and refresh
 */
export function useRefreshToken() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (refreshToken: string) => authApi.refreshToken(refreshToken),
    onSuccess: (data: AuthResponseDto) => {
      // Update tokens with new values
      TokenManager.setTokens(data.accessToken, data.refreshToken)
      
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
    },
    onError: (error) => {
      console.error('Token refresh failed:', error)
      // Clear tokens and redirect to login
      TokenManager.clearTokens()
      
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.crossEntity.onLogout()
      
      // Navigate to login page using React Router
      navigate('/login', { replace: true })
    },
    retry: false, // Don't retry token refresh
  })
}

/**
 * Hook to check authentication status
 * Provides reactive authentication state
 * Requirements: 3.6 - authentication state reactivity
 */
export function useAuthStatus() {
  const { data: user, isLoading, error } = useUserProfile()
  const refreshMutation = useRefreshToken()
  
  // Use a ref to track proactive refresh attempts per hook instance
  const hasAttemptedProactiveRefresh = useRef(false)

  const isAuthenticated = TokenManager.isAuthenticated() && !!user && !error

  // Validate refresh token on mount and clear invalid auth.
  // Also attempt a proactive refresh if we have a refresh token but no access token.
  useEffect(() => {
    // If there's a 401 error or missing refresh token, logout
    if (error?.status === 401 || (error && !TokenManager.getRefreshToken())) {
      TokenManager.clearTokens()
      hasAttemptedProactiveRefresh.current = false
      return
    }

    // If access token missing but refresh token exists, attempt refresh once on mount
    const access = TokenManager.getAccessToken()
    const refreshToken = TokenManager.getRefreshToken()

    if (!access && refreshToken && !refreshMutation.isPending && !refreshMutation.isError && !hasAttemptedProactiveRefresh.current) {
      // Mark attempted so we only try once per hook instance — prevents multiple concurrent refreshes
      hasAttemptedProactiveRefresh.current = true
      // Use mutate to trigger onSuccess/onError handlers defined in useRefreshToken
      refreshMutation.mutate(refreshToken)
    }
  }, [error, refreshMutation])

  // Reset the flag when tokens are successfully refreshed
  useEffect(() => {
    if (refreshMutation.isSuccess) {
      hasAttemptedProactiveRefresh.current = false
    }
  }, [refreshMutation.isSuccess])

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
  }
}

/**
 * Hook for Google OAuth login
 * Handles Google authentication flow
 */
export function useGoogleLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => authApi.googleLogin(code),
    onSuccess: (data: AuthResponseDto) => {
      // Store tokens after successful Google login
      TokenManager.setTokens(data.accessToken, data.refreshToken)
      
      // Use centralized cache invalidation service
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
      cacheService.crossEntity.onLogin()
    },
    onError: (error) => {
      console.error('Google login failed:', error)
    },
  })
}