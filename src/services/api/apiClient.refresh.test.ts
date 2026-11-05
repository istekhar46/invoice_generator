import { AxiosError, CanceledError } from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import { TokenManager } from '../auth/tokenManager'

const instance = apiClient.getAxiosInstance()
const originalAdapter = instance.defaults.adapter
it('does not log successful sensitive responses containing share credentials', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  instance.defaults.adapter = async config => ({
    config,
    status: 201,
    statusText: 'Created',
    headers: {},
    data: { success: true, data: { token: 'fictional-share-capability' } },
  })
  await expect(
    apiClient.post('/invoices/fixture/share', undefined, { sensitive: true })
  ).resolves.toEqual({ token: 'fictional-share-capability' })
  expect(logs).not.toHaveBeenCalled()
})
it('retains development logging for ordinary non-sensitive requests', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  instance.defaults.adapter = async config => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: { success: true, data: { id: 'fixture' } },
  })
  await expect(apiClient.get('/invoices/fixture')).resolves.toEqual({ id: 'fixture' })
  expect(logs).toHaveBeenCalledWith('[API] GET /invoices/fixture')
  expect(logs).toHaveBeenCalledWith('[API] Response 200:', {
    success: true,
    data: { id: 'fixture' },
  })
})
it('retains normal error handling when Axios has no request configuration', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  instance.defaults.adapter = async () => { throw new AxiosError('Configuration failure', 'ERR_BAD_OPTION') }
  await expect(apiClient.get('/razorpay/connections')).rejects.toMatchObject({ status: 0, statusText: 'Unknown Error' })
})
it('does not log credential request data when a sensitive save fails', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  instance.defaults.adapter = async config => {
    throw new AxiosError('Network error', 'ERR_NETWORK', config, {})
  }
  await expect(apiClient.put('/razorpay/connections/TEST', { keySecret: 'private-key' }, { sensitive: true })).rejects.toMatchObject({ status: 0 })
  expect(errors).not.toHaveBeenCalled()
})
afterEach(() => {
  instance.defaults.adapter = originalAdapter
  TokenManager.clearAccessToken()
  vi.restoreAllMocks()
})
it('preserves cancelled inventory reads without reporting a network or authentication failure', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  TokenManager.setAccessToken('current-token')
  const cancelled = new CanceledError('Filter changed')
  const adapter = vi.fn().mockRejectedValue(cancelled)
  instance.defaults.adapter = adapter
  await expect(apiClient.get('/inventory/products')).rejects.toBe(cancelled)
  expect(adapter).toHaveBeenCalledTimes(1)
  expect(errors).not.toHaveBeenCalled()
  expect(TokenManager.getAccessToken()).toBe('current-token')
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
