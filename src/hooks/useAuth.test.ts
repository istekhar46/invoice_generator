import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useLogin, useRegister } from './useAuth'
import { TokenManager } from '../services/auth/tokenManager'
import { authApi } from '../services/api'
import type { AuthResponseDto } from '../services/api'

// Mock dependencies
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api')
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
    },
  }
})

vi.mock('./useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('./useOnlineStatus', () => ({
  useOnlineStatus: () => ({
    isOnline: true,
  }),
}))

describe('Login Flow - Cookie-based Refresh Tokens', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    TokenManager.clearAccessToken()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  describe('useLogin', () => {
    it('should store only access token in memory on successful login', async () => {
      // Arrange
      const mockResponse: AuthResponseDto = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'mock-access-token',
      }

      vi.mocked(authApi.login).mockResolvedValue(mockResponse)

      // Act
      const { result } = renderHook(() => useLogin(), { wrapper })
      
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify only access token is stored in memory
      expect(TokenManager.getAccessToken()).toBe('mock-access-token')
      
      // Verify localStorage is NOT used (should remain empty)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should not store refresh token in localStorage', async () => {
      // Arrange
      const mockResponse: AuthResponseDto = {
        user: {
          id: '1',
          email: 'test@example.com',
          displayName: 'Test User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'mock-access-token',
      }

      vi.mocked(authApi.login).mockResolvedValue(mockResponse)

      // Act
      const { result } = renderHook(() => useLogin(), { wrapper })
      
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify only access token is stored
      expect(TokenManager.getAccessToken()).toBe('mock-access-token')
      
      // Verify no manual refresh token handling in localStorage
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringContaining('refresh'),
        expect.anything()
      )
    })
  })

  describe('useRegister', () => {
    it('should store only access token in memory on successful registration', async () => {
      // Arrange
      const mockResponse: AuthResponseDto = {
        user: {
          id: '2',
          email: 'newuser@example.com',
          displayName: 'New User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'mock-access-token-register',
      }

      vi.mocked(authApi.register).mockResolvedValue(mockResponse)

      // Act
      const { result } = renderHook(() => useRegister(), { wrapper })
      
      result.current.mutate({
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
      })

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify only access token is stored in memory
      expect(TokenManager.getAccessToken()).toBe('mock-access-token-register')
      
      // Verify localStorage is NOT used
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })
})
