import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import {
  useNewInvoiceDefaults,
  useSaveInvoiceDefaults,
} from './useInvoiceDefaults'

const mocks = vi.hoisted(() => ({
  user: { id: 'one' } as { id: string } | undefined,
  get: vi.fn(),
  save: vi.fn(),
  profile: vi.fn(),
  logo: vi.fn(),
}))
vi.mock('./useAuth', () => ({ useUserProfile: () => ({ data: mocks.user }) }))
vi.mock('../services/api/invoiceDefaultsApi', () => ({
  invoiceDefaultsApi: { get: mocks.get, save: mocks.save },
}))
vi.mock('../services/api/companyApi', () => ({
  companyApi: { getProfile: mocks.profile },
}))
vi.mock('../utils/companyLogoSnapshot', () => ({
  companyLogoSnapshot: mocks.logo,
}))
const settings = {
  currency: 'INR',
  taxRate: 0,
  paymentTerms: 'Net 30',
  notes: '',
  terms: '',
}
const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('Account invoice defaults', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.user = { id: 'one' }
    mocks.get.mockResolvedValue(settings)
    mocks.profile.mockResolvedValue(null)
  })
  it('does not fetch preferences/profile for guests, existing invoices or imported drafts', async () => {
    const view = renderHook(() => useNewInvoiceDefaults(false, true), {
      wrapper: wrapper(),
    })
    expect(view.result.current.fetchStatus).toBe('idle')
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.profile).not.toHaveBeenCalled()
    mocks.user = undefined
    view.rerender()
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it('uses profile tax only when there are no saved preferences, preserving a saved zero tax', async () => {
    mocks.get.mockResolvedValueOnce(null)
    mocks.profile.mockResolvedValue({
      defaultTaxRate: 0.12,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const first = renderHook(() => useNewInvoiceDefaults(true, false), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(first.result.current.data?.settings.taxRate).toBe(0.12)
    const second = renderHook(() => useNewInvoiceDefaults(true, false), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(second.result.current.data?.settings.taxRate).toBe(0)
  })
  it('uses separate cache entries when the account changes', async () => {
    const view = renderHook(() => useNewInvoiceDefaults(true, false), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true))
    mocks.user = { id: 'two' }
    mocks.get.mockResolvedValueOnce({ ...settings, currency: 'JPY' })
    view.rerender()
    await waitFor(() =>
      expect(view.result.current.data?.settings.currency).toBe('JPY')
    )
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })
  it('fetches fresh preferences and company details for a new editor instance', async () => {
    const shared = wrapper()
    const first = renderHook(() => useNewInvoiceDefaults(true, false), {
      wrapper: shared,
    })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()
    mocks.get.mockResolvedValueOnce({ ...settings, currency: 'JPY' })
    const second = renderHook(() => useNewInvoiceDefaults(true, false), {
      wrapper: shared,
    })
    await waitFor(() =>
      expect(second.result.current.data?.settings.currency).toBe('JPY')
    )
    expect(mocks.profile).toHaveBeenCalledTimes(2)
  })
  it('exposes a logo error while retaining the other loaded settings', async () => {
    mocks.profile.mockResolvedValue({
      logoUrl: 'https://example.test/logo.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mocks.logo.mockRejectedValue(new Error('Logo unavailable'))
    const view = renderHook(() => useNewInvoiceDefaults(true, true), {
      wrapper: wrapper(),
    })
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true))
    expect(view.result.current.data).toMatchObject({
      settings,
      logoError: 'Logo unavailable',
      logoDataUrl: '',
    })
  })
  it('updates settings cache after saving without fetching or resetting active forms', async () => {
    const view = renderHook(
      () => ({
        initial: useNewInvoiceDefaults(true, false),
        save: useSaveInvoiceDefaults(),
      }),
      { wrapper: wrapper() }
    )
    await waitFor(() =>
      expect(view.result.current.initial.isSuccess).toBe(true)
    )
    const changed = { ...settings, currency: 'KWD' }
    mocks.save.mockResolvedValue(changed)
    await act(() => view.result.current.save.mutateAsync(changed))
    await waitFor(() =>
      expect(view.result.current.initial.data?.settings).toEqual(changed)
    )
    expect(mocks.get).toHaveBeenCalledOnce()
  })
})
