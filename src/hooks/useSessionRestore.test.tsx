import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { useAuthStatus } from './useAuth'
import { authApi } from '../services/api/authApi'
import { TokenManager } from '../services/auth/tokenManager'
import { initializeCacheService } from '../services/cache/cacheInvalidation.service'

afterEach(() => {
  vi.restoreAllMocks()
  TokenManager.clearAccessToken()
})
it('finishes the anonymous session probe even when failure cleanup clears the query/mutation cache', async () => {
  TokenManager.clearAccessToken()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(authApi, 'refreshToken').mockRejectedValue(new Error('No session'))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  initializeCacheService(client)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
  const { result, unmount } = renderHook(() => useAuthStatus(), { wrapper })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  expect(result.current.isAuthenticated).toBe(false)
  expect(authApi.refreshToken).toHaveBeenCalledOnce()
  unmount()
  client.clear()
})
