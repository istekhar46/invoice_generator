import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { quoteApi } from '../services/api/quoteApi'
import { getCacheInvalidationService } from '../services'
import type { QuoteQuery } from '../types/quotes'

export function useQuotes(query: QuoteQuery) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: ['quotes', user?.id, 'list', query],
    enabled: !!user?.id,
    queryFn: ({ signal }) => quoteApi.list(query, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function useQuote(id: string) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: ['quotes', user?.id, 'detail', id],
    enabled: !!user?.id && !!id,
    queryFn: ({ signal }) => quoteApi.detail(id, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function useQuoteActions() {
  const client = useQueryClient(),
    { data: user } = useUserProfile()
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['quotes', user?.id] }),
      client.invalidateQueries({ queryKey: ['catalog', user?.id] }),
    ])
  }
  const save = useMutation({
    mutationFn: quoteApi.save,
    retry: false,
    onSettled: refresh,
  })
  const status = useMutation({
    mutationFn: quoteApi.status,
    retry: false,
    onSettled: refresh,
  })
  const convert = useMutation({
    mutationFn: quoteApi.convert,
    retry: false,
    onSettled: async () => {
      const cache = getCacheInvalidationService(client)
      cache.invoices.invalidateAllLists()
      cache.dashboard.invalidateStatistics()
      await refresh()
    },
  })
  return { save, status, convert }
}
