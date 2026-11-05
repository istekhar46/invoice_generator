import { afterEach, expect, it, vi } from 'vitest'
import { readPublicInvoice } from './invoiceSharingApi'
afterEach(() => vi.unstubAllGlobals())
it('transports a public capability only in its header, without account cookies, URL secrets or caching', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { documentId: 'public' } }),
  })
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  expect(
    await readPublicInvoice('fictional.capability.signature', signal)
  ).toEqual({ documentId: 'public' })
  expect(fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/public\/invoice$/),
    {
      headers: { Authorization: 'Bearer fictional.capability.signature' },
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal,
    }
  )
  expect(fetch.mock.calls[0][0]).not.toContain('fictional.capability')
})
it.each([404, 429, 500, 503])(
  'does not display backend response details for HTTP%s',
  async status => {
    const json = vi.fn().mockResolvedValue({ message: 'private internal data' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status, json })
    )
    await expect(readPublicInvoice('fictional')).rejects.toMatchObject({
      status,
    })
    expect(json).not.toHaveBeenCalled()
  }
)
