import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import { directUpiApi } from '../services/api/directUpiApi'
import type { DirectUpiDetails } from '../types/directUpi'

export function useUpiPreferences(enabled = true) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.payments, user?.id, 'upi-preferences'],
    enabled: !!user?.id && enabled,
    queryFn: ({ signal }) => directUpiApi.preferences(signal),
    retry: false,
    staleTime: 0,
  })
}

export function useInvoiceUpi() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (command: {
      invoiceId: string
      details: DirectUpiDetails | null
    }) => {
      if (command.details)
        await directUpiApi.enable(command.invoiceId, command.details)
      else await directUpiApi.remove(command.invoiceId)
    },
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.invoices }),
        client.invalidateQueries({ queryKey: queryKeys.payments }),
        client.invalidateQueries({ queryKey: queryKeys.gateway }),
      ]),
  })
}
