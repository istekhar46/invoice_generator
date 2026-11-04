import { apiClient } from './apiClient'
import type {
  RazorpayConnection,
  RazorpayCredentials,
  RazorpayMode,
  RazorpaySetup,
} from '../../types/razorpay'

export const razorpayApi = {
  list: (signal?: AbortSignal) =>
    apiClient.get<RazorpaySetup>('/razorpay/connections', { signal }),
  save: (mode: RazorpayMode, credentials: RazorpayCredentials) =>
    apiClient.put<RazorpayConnection>(
      `/razorpay/connections/${mode}`,
      credentials,
      { sensitive: true }
    ),
  verify: (mode: RazorpayMode) =>
    apiClient.post<RazorpayConnection>(`/razorpay/connections/${mode}/verify`),
  disable: (mode: RazorpayMode) =>
    apiClient.delete<{ disabled: boolean }>(`/razorpay/connections/${mode}`),
  webhook: (mode: RazorpayMode, secret: string) =>
    apiClient.post<RazorpayConnection>(
      `/razorpay/connections/${mode}/webhook`,
      { secret },
      { sensitive: true }
    ),
}
