import { apiClient } from './apiClient'
import type {
  PayableInvoice,
  PaymentCommand,
  PaymentEntry,
  PaymentInvoice,
  PaymentPage,
  PaymentQuery,
  PaymentResult,
} from '../../types/payments'
function params(query: object) {
  return new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])
  ).toString()
}
export const paymentApi = {
  history: (query: PaymentQuery, signal?: AbortSignal) =>
    apiClient.get<PaymentPage<PaymentEntry>>(`/payments?${params(query)}`, {
      signal,
    }),
  invoice: (id: string, signal?: AbortSignal) =>
    apiClient.get<PaymentInvoice>(
      `/payments/invoices/${encodeURIComponent(id)}`,
      { signal }
    ),
  payable: (
    query: Pick<PaymentQuery, 'search' | 'page' | 'limit'>,
    signal?: AbortSignal
  ) =>
    apiClient.get<PaymentPage<PayableInvoice>>(
      `/payments/invoices?${params(query)}`,
      { signal }
    ),
  record: (command: PaymentCommand) =>
    apiClient.post<PaymentResult>(
      command.type === 'record'
        ? `/payments/invoices/${encodeURIComponent(command.invoiceId)}/receipts`
        : `/payments/${encodeURIComponent(command.entryId)}/reversal`,
      command.data
    ),
}
