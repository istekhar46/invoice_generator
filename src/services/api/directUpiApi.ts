import { apiClient } from './apiClient'
import type { DirectUpiDetails, DirectUpiSnapshot } from '../../types/directUpi'

export const directUpiApi = {
  preferences: (signal?: AbortSignal) =>
    apiClient.get<DirectUpiDetails | null>('/payments/upi/preferences', {
      signal,
    }),
  savePreferences: (details: DirectUpiDetails) =>
    apiClient.put<DirectUpiDetails>('/payments/upi/preferences', details),
  removePreferences: () =>
    apiClient.delete<{ removed: true }>('/payments/upi/preferences'),
  enable: (invoiceId: string, details: DirectUpiDetails) =>
    apiClient.put<DirectUpiSnapshot>(
      `/payments/upi/invoices/${encodeURIComponent(invoiceId)}`,
      details
    ),
  remove: (invoiceId: string) =>
    apiClient.delete<{ removed: true }>(
      `/payments/upi/invoices/${encodeURIComponent(invoiceId)}`
    ),
}
