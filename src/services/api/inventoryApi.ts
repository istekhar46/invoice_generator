import { apiClient } from './apiClient'
import type {
  BalanceQuery,
  HistoryQuery,
  InventoryPage,
  StockAction,
  StockBalance,
  StockCommand,
  StockResult,
} from '../../types/inventory'

function queryString(query: object) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const inventoryApi = {
  balances: (query: BalanceQuery, signal?: AbortSignal) =>
    apiClient.get<InventoryPage<StockBalance>>(
      `/inventory/products?${queryString(query)}`,
      { signal }
    ),
  balance: (id: string, signal?: AbortSignal) =>
    apiClient.get<StockBalance>(
      `/inventory/products/${encodeURIComponent(id)}/balance`,
      { signal }
    ),
  history: (query: HistoryQuery, signal?: AbortSignal) =>
    apiClient.get<InventoryPage<StockAction>>(
      `/inventory/history?${queryString(query)}`,
      { signal }
    ),
  record: (command: StockCommand) => {
    const path =
      command.type === 'reversal'
        ? `/inventory/adjustments/${encodeURIComponent(command.actionId)}/reversal`
        : `/inventory/products/${encodeURIComponent(command.productId)}/${command.type === 'opening' ? 'opening' : 'adjustments'}`
    return apiClient.post<StockResult>(path, command.data)
  },
}
