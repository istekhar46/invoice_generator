import { apiClient } from './apiClient'
import type {
  GatewayCommand,
  GatewayLink,
  GatewayQuery,
} from '../../types/razorpay'
import type { PaymentPage } from '../../types/payments'

export const gatewayApi = {
  list: (query: GatewayQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    return apiClient.get<PaymentPage<GatewayLink>>(
      `/razorpay/links?${params}`,
      { signal }
    )
  },
  command: (command: GatewayCommand) =>
    command.type === 'create'
      ? apiClient.post<GatewayLink>(
          '/razorpay/links',
          {
            invoiceId: command.invoiceId,
            mode: command.mode,
            requestId: command.requestId,
          },
          { timeout: 30000 }
        )
      : apiClient.post<GatewayLink>(
          `/razorpay/links/${command.id}/${command.type}`,
          undefined,
          { timeout: 30000 }
        ),
}
