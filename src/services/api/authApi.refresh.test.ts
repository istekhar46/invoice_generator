import { afterEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './authApi'
import { apiClient } from './apiClient'
import type { AuthResponseDto } from './authApi'

afterEach(() => vi.restoreAllMocks())
describe('session restoration', () => {
  it('shares concurrent refresh requests, then allows the next refresh', async () => {
    let resolve!: (value: AuthResponseDto) => void
    const response = {
      accessToken: 'test-token',
      user: {
        id: 'one',
        email: 'one@example.test',
        displayName: 'One',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    const post = vi
      .spyOn(apiClient, 'post')
      .mockImplementationOnce(
        () =>
          new Promise(done => {
            resolve = done
          })
      )
      .mockResolvedValue(response)
    const first = authApi.refreshToken()
    const second = authApi.refreshToken()
    expect(first).toBe(second)
    expect(post).toHaveBeenCalledTimes(1)
    resolve(response)
    await Promise.all([first, second])
    await authApi.refreshToken()
    expect(post).toHaveBeenCalledTimes(2)
  })
  it('releases a failed request so a later session can be restored', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockRejectedValue(new Error('No session'))
    await expect(authApi.refreshToken()).rejects.toThrow('No session')
    await expect(authApi.refreshToken()).rejects.toThrow('No session')
    expect(post).toHaveBeenCalledTimes(2)
  })
})
