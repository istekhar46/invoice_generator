export type RazorpayMode = 'TEST' | 'LIVE'
export interface RazorpayConnection {
  id: string
  mode: RazorpayMode
  maskedKeyId: string
  enabled: boolean
  validatedAt: string
  updatedAt: string
  hasWebhookSecret: boolean
  webhookPath: string | null
}
export interface RazorpaySetup {
  setupAvailable: boolean
  connections: RazorpayConnection[]
}
export interface RazorpayCredentials {
  keyId: string
  keySecret: string
}

export type GatewayLinkState =
  | 'PENDING'
  | 'ACTIVE'
  | 'UNKNOWN'
  | 'CANCELLING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
export interface GatewayRefund {
  id: string
  providerId: string
  status: 'pending' | 'processed' | 'failed'
  amount: string
  invoiceReduction: string
  recordedAt: string
}
export interface GatewayPayment {
  id: string
  providerId: string
  currency: string
  method: string
  received: string
  applied: string
  refunded: string
  unapplied: string
  exception: string | null
  providerCreatedAt: string
  recordedAt: string
  refunds: GatewayRefund[]
}
export interface GatewayLink {
  id: string
  invoiceId: string
  mode: RazorpayMode
  state: GatewayLinkState
  referenceId: string
  amount: string
  currency: string
  providerId: string | null
  url: string | null
  lastError: string | null
  synchronizedAt: string | null
  createdAt: string
  invoice: { id: string; invoiceNumber: string; status: string }
  payments: GatewayPayment[]
}
export interface GatewayQuery {
  mode: RazorpayMode
  invoiceId?: string
  search?: string
  state?: GatewayLinkState
  page?: number
  limit?: number
}
export type GatewayCommand =
  | { type: 'create'; invoiceId: string; mode: RazorpayMode; requestId: string }
  | { type: 'refresh' | 'cancel' | 'retry'; id: string }
