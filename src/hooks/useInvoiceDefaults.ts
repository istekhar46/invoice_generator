import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { companyApi } from '../services/api/companyApi'
import { invoiceDefaultsApi } from '../services/api/invoiceDefaultsApi'
import { companyLogoSnapshot } from '../utils/companyLogoSnapshot'
import {
  defaultInvoiceSettings,
  type InvoiceDefaults,
  type NewInvoiceDefaults,
} from '../types/invoiceDefaults'

export const invoiceDefaultsKey = (userId?: string) =>
  ['invoice-defaults', userId] as const

export function useNewInvoiceDefaults(enabled: boolean, includeLogo: boolean) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...invoiceDefaultsKey(user?.id), 'initial', includeLogo],
    enabled: enabled && !!user?.id,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<NewInvoiceDefaults> => {
      const [settings, profile] = await Promise.all([
        invoiceDefaultsApi.get(),
        companyApi.getProfile(),
      ])
      const result: NewInvoiceDefaults = {
        settings:
          settings ?? defaultInvoiceSettings(profile?.defaultTaxRate ?? 0),
        company: profile
          ? {
              ...profile,
              createdAt: new Date(profile.createdAt),
              updatedAt: new Date(profile.updatedAt),
            }
          : null,
        logoDataUrl: '',
      }
      if (includeLogo && profile?.logoUrl) {
        try {
          result.logoDataUrl = await companyLogoSnapshot(profile.logoUrl)
        } catch (error) {
          result.logoError =
            error instanceof Error
              ? error.message
              : 'Company logo could not be loaded.'
        }
      }
      return result
    },
  })
}

export function useSaveInvoiceDefaults() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    mutationFn: (settings: InvoiceDefaults) =>
      invoiceDefaultsApi.save(settings),
    onSuccess: settings => {
      client.setQueriesData<NewInvoiceDefaults>(
        { queryKey: invoiceDefaultsKey(user?.id) },
        old => (old ? { ...old, settings } : old)
      )
    },
  })
}
