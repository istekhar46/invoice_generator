import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { catalogApi } from '../services/api/catalogApi'
import type { CatalogItemInput, CatalogQuery } from '../types/catalog'

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
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['catalog', user?.id] }),
  })
}

export function useArchiveCatalogItem() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    retry: false,
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      catalogApi.update(id, { isArchived }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['catalog', user?.id] }),
  })
}
