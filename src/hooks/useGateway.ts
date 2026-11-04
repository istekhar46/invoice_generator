import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import { gatewayApi } from '../services/api/gatewayApi'
import type { GatewayQuery } from '../types/razorpay'

export function useGatewayLinks(query: GatewayQuery) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.gateway, user?.id, query],
    enabled: !!user?.id,
    queryFn: ({ signal }) => gatewayApi.list(query, signal),
    retry: false,
    staleTime: 0,
  })
}
export function useGatewayCommand() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    mutationFn: gatewayApi.command,
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: [...queryKeys.gateway, user?.id],
        }),
        client.invalidateQueries({
          queryKey: [...queryKeys.payments, user?.id],
        }),
        client.invalidateQueries({ queryKey: queryKeys.invoices }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]),
  })
}
