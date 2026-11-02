import { describe, it, expect, vi, afterEach } from 'vitest'
import { companyLogoSnapshot } from './companyLogoSnapshot'

afterEach(() => vi.unstubAllGlobals())
describe('Company logo snapshots', () => {
  it('embeds a small PNG instead of persisting the mutable profile URL', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['logo'], { type: 'image/png' }),
      })
    vi.stubGlobal('fetch', fetcher)
    expect(await companyLogoSnapshot('https://example.test/logo.png')).toBe(
      'data:image/png;base64,bG9nbw=='
    )
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.test/logo.png',
      expect.objectContaining({ credentials: 'omit' })
    )
  })
  it('reports a failed download rather than silently dropping branding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(
      companyLogoSnapshot('https://example.test/logo.png')
    ).rejects.toThrow('could not be downloaded')
  })
  it.each([
    new Blob(['svg'], { type: 'image/svg+xml' }),
    new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
  ])('rejects unsupported or oversized source images', async blob => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: async () => blob })
    )
    await expect(
      companyLogoSnapshot('https://example.test/logo')
    ).rejects.toThrow('up to 5 MB')
  })
})
