export type PaymentKind = 'OPENING' | 'UPI' | 'REVERSAL' | 'RAZORPAY' | 'REFUND'
export interface PaymentInvoice {
  id: string
  invoiceNumber: string
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOIDED'
  currency: string
  total: string
  amountPaid: string
  balance: string
  hasPaymentHistory: boolean
}
export interface PayableInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  currency: string
  balance: string
}
export interface PaymentEntry {
  id: string
  sequence: string
  requestId: string
  kind: PaymentKind
  amountMinor: string
  amount: string
  currency: string
  openingSource: 'MIGRATION' | 'GUEST_IMPORT' | null
  paymentDate: string | null
  reference: string | null
  notes: string
  createdAt: string
  reversalOfId: string | null
  reversalOfSequence: string | null
  reversedById: string | null
  invoice: Pick<PaymentInvoice, 'id' | 'invoiceNumber' | 'status'> & {
    customerName: string
  }
}
export interface PaymentPage<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
export interface PaymentQuery {
  search?: string
  invoiceId?: string
  kind?: PaymentKind
  status?: 'all' | 'active' | 'reversed'
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}
export interface PaymentRequest {
  requestId: string
  paymentDate: string
}
export type PaymentCommand =
  | {
      type: 'record'
      invoiceId: string
      data: PaymentRequest & {
        amount: string
        reference?: string
        notes?: string
      }
    }
  | {
      type: 'reversal'
      entryId: string
      data: PaymentRequest & { reason: string }
    }
export interface PaymentResult {
  replayed: boolean
  entry: PaymentEntry
}
export function formatPayment(amount: string, currency: string) {
  const [whole, fraction] = amount.split('.')
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`
}
export function canRecordPayment(invoice: PaymentInvoice) {
  return (
    invoice.status === 'SENT' &&
    invoice.currency === 'INR' &&
    /[1-9]/.test(invoice.balance)
  )
}
