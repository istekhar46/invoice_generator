export const stockActionLabels = {
  OPENING: 'Opening stock',
  ADJUSTMENT: 'Adjustment',
  INVOICE_ISSUE: 'Invoice issued',
  INVOICE_EDIT: 'Invoice edited',
  INVOICE_VOID: 'Invoice voided',
} as const
export type StockActionKind = keyof typeof stockActionLabels

export interface StockProduct {
  id: string
  name: string
  sku: string | null
  unit: string
  isArchived: boolean
  stockTrackingStartedAt: string | null
}
export interface StockBalance {
  product: StockProduct
  quantity: string
}
export interface StockMovement {
  catalogItemId: string
  quantityDelta: string
  product: StockProduct
}
export interface StockAction {
  id: string
  sequence: string
  requestId: string
  kind: StockActionKind
  invoiceId: string | null
  reversalOfId: string | null
  reversedById: string | null
  reason: string
  effectiveDate: string
  createdAt: string
  movements: StockMovement[]
}
export interface InventoryPage<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
export interface BalanceQuery {
  search?: string
  status?: 'active' | 'archived' | 'all'
  page?: number
  limit?: number
}
export interface HistoryQuery {
  catalogItemId?: string
  kind?: StockActionKind
  page?: number
  limit?: number
}
export interface StockRequest {
  requestId: string
  reason: string
  effectiveDate: string
}
export interface OpeningStock extends StockRequest {
  quantity: string
  unit: string
}
export interface AdjustStock extends OpeningStock {
  direction: 'IN' | 'OUT'
}
export type StockCommand =
  | { type: 'opening'; productId: string; data: OpeningStock }
  | { type: 'adjustment'; productId: string; data: AdjustStock }
  | { type: 'reversal'; actionId: string; data: StockRequest }
export interface StockResult {
  replayed: boolean
  action: StockAction
}

/** Group digits without converting exact stock decimals to floating point. */
export function formatStockQuantity(value: string) {
  const [whole, fraction] = value.split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`
}
