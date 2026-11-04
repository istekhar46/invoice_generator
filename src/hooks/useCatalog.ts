import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { catalogApi } from '../services/api/catalogApi'
import type { CatalogItemInput, CatalogQuery } from '../types/catalog'
import { queryKeys } from '../lib/queryKeys'

function refreshCatalog(
  client: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['catalog', userId] }),
    client.invalidateQueries({ queryKey: [...queryKeys.inventory, userId] }),
  ])
}

export function useCatalog(query: CatalogQuery = {}) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: ['catalog', user?.id, query],
    enabled: !!user?.id,
    queryFn: () => catalogApi.list(query),
    retry: false,
    staleTime: 30_000,
  })
}

export function useSaveCatalogItem() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    retry: false,
    mutationFn: ({ id, data }: { id?: string; data: CatalogItemInput }) =>
      id ? catalogApi.update(id, data) : catalogApi.create(data),
    onSuccess: () => refreshCatalog(client, user?.id),
  })
}

export function useArchiveCatalogItem() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    retry: false,
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      catalogApi.update(id, { isArchived }),
    onSuccess: () => refreshCatalog(client, user?.id),
  })
}
