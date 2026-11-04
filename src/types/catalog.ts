import type { LineItemType } from './entities'

export interface CatalogItem {
  id: string
  type: LineItemType
  name: string
  description: string
  sku: string | null
  unit: string
  rate: number
  currency: string
  isArchived: boolean
  usedAt: string | null
  stockTrackingStartedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CatalogItemInput = Pick<
  CatalogItem,
  'type' | 'name' | 'description' | 'sku' | 'unit' | 'rate' | 'currency'
>
export interface CatalogQuery {
  search?: string
  type?: LineItemType
  status?: 'active' | 'archived' | 'all'
  tracking?: 'tracked' | 'untracked'
  page?: number
  limit?: number
}

export interface CatalogPage {
  data: CatalogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface CatalogSelection {
  catalogItemId: string
  type: LineItemType
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

export function catalogDescription(
  item: Pick<CatalogItem, 'name' | 'description'>
) {
  return item.description ? `${item.name} — ${item.description}` : item.name
}
