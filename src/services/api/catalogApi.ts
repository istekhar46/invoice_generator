import { apiClient } from './apiClient'
import type {
  CatalogItem,
  CatalogItemInput,
  CatalogPage,
  CatalogQuery,
} from '../../types/catalog'

type CatalogDto = Omit<CatalogItem, 'type'> & { type: 'PRODUCT' | 'SERVICE' }
const fromDto = (item: CatalogDto): CatalogItem => ({
  ...item,
  type: item.type === 'SERVICE' ? 'service' : 'product',
})
const toDto = (data: Partial<CatalogItemInput> & { isArchived?: boolean }) => ({
  ...data,
  ...(data.type && { type: data.type === 'service' ? 'SERVICE' : 'PRODUCT' }),
})

export const catalogApi = {
  async list(query: CatalogQuery = {}): Promise<CatalogPage> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '')
        params.set(
          key,
          key === 'type' ? String(value).toUpperCase() : String(value)
        )
    }
    const result = await apiClient.get<
      Omit<CatalogPage, 'data'> & { data: CatalogDto[] }
    >(`/catalog?${params}`)
    return { ...result, data: result.data.map(fromDto) }
  },
  async create(data: CatalogItemInput): Promise<CatalogItem> {
    return fromDto(await apiClient.post<CatalogDto>('/catalog', toDto(data)))
  },
  async update(
    id: string,
    data: Partial<CatalogItemInput> & { isArchived?: boolean }
  ): Promise<CatalogItem> {
    return fromDto(
      await apiClient.put<CatalogDto>(`/catalog/${id}`, toDto(data))
    )
  },
}
