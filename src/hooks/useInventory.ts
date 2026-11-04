import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { inventoryApi } from '../services/api/inventoryApi'
import { queryKeys } from '../lib/queryKeys'
import type { BalanceQuery, HistoryQuery } from '../types/inventory'

export function useStockBalances(query: BalanceQuery, enabled = true) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.inventory, user?.id, 'balances', query],
    enabled: !!user?.id && enabled,
    queryFn: ({ signal }) => inventoryApi.balances(query, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function useStockBalance(id: string) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.inventory, user?.id, 'balance', id],
    enabled: !!user?.id && !!id,
    queryFn: ({ signal }) => inventoryApi.balance(id, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function useStockHistory(query: HistoryQuery, enabled = true) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.inventory, user?.id, 'history', query],
    enabled: !!user?.id && enabled,
    queryFn: ({ signal }) => inventoryApi.history(query, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function useRecordStock() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    mutationFn: inventoryApi.record,
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: [...queryKeys.inventory, user?.id],
        }),
        client.invalidateQueries({ queryKey: ['catalog', user?.id] }),
      ]),
  })
}
