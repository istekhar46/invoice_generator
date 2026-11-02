import { apiClient } from './apiClient'
import type { InvoiceDefaults } from '../../types/invoiceDefaults'

export const invoiceDefaultsApi = {
  get: () => apiClient.get<InvoiceDefaults | null>('/invoice-defaults'),
  save: (data: InvoiceDefaults) =>
    apiClient.put<InvoiceDefaults>('/invoice-defaults', data),
}
