import { AxiosError } from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import { TokenManager } from '../auth/tokenManager'

const instance = apiClient.getAxiosInstance()
const originalAdapter = instance.defaults.adapter
afterEach(() => {
  instance.defaults.adapter = originalAdapter
  TokenManager.clearAccessToken()
  vi.restoreAllMocks()
})
it('retries an invoice save with the access token from the actual wrapped refresh response', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  TokenManager.setAccessToken('expired-token')
  const calls: string[] = []
  instance.defaults.adapter = async config => {
    calls.push(config.url || '')
    if (config.url === '/auth/refresh')
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true, data: { accessToken: 'renewed-token' } },
      }
    if (config.headers.Authorization !== 'Bearer renewed-token') {
      throw new AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          config,
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          data: { message: 'Unauthorized' },
        }
      )
    }
    return {
      config,
      status: 201,
      statusText: 'Created',
      headers: {},
      data: { success: true, data: { id: 'saved-invoice' } },
    }
  }
  await expect(apiClient.post('/invoices/quick', {})).resolves.toEqual({
    id: 'saved-invoice',
  })
  expect(TokenManager.getAccessToken()).toBe('renewed-token')
  expect(calls).toEqual(['/invoices/quick', '/auth/refresh', '/invoices/quick'])
})
it('does not refresh recursively after a failed anonymous session probe', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  let requests = 0
  instance.defaults.adapter = async config => {
    requests++
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      config,
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      data: { message: 'Unauthorized' },
    })
  }
  await expect(
    apiClient.post('/auth/refresh', {}, { skipAuth: true })
  ).rejects.toMatchObject({ status: 401 })
  expect(requests).toBe(1)
})
