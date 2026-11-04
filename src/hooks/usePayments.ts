import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { queryKeys } from '../lib/queryKeys'
import { paymentApi } from '../services/api/paymentApi'
import type { PaymentQuery } from '../types/payments'

export function usePaymentHistory(query: PaymentQuery) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.payments, user?.id, 'history', query],
    enabled: !!user?.id,
    queryFn: ({ signal }) => paymentApi.history(query, signal),
    retry: false,
    staleTime: 30_000,
  })
}
export function usePaymentInvoice(id: string) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.payments, user?.id, 'invoice', id],
    enabled: !!user?.id && !!id,
    queryFn: ({ signal }) => paymentApi.invoice(id, signal),
    retry: false,
    staleTime: 0,
  })
}
export function usePayableInvoices(
  query: Pick<PaymentQuery, 'search' | 'page' | 'limit'>
) {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.payments, user?.id, 'payable', query],
    enabled: !!user?.id,
    queryFn: ({ signal }) => paymentApi.payable(query, signal),
    retry: false,
    staleTime: 0,
  })
}
export function useRecordPayment() {
  const client = useQueryClient()
  const { data: user } = useUserProfile()
  return useMutation({
    mutationFn: paymentApi.record,
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: [...queryKeys.payments, user?.id],
        }),
        client.invalidateQueries({ queryKey: queryKeys.invoices }),
        client.invalidateQueries({ queryKey: [...queryKeys.gateway, user?.id] }),
        client.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]),
  })
}
