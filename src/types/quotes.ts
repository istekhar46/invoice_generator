import type { Invoice, InvoiceOptions, LineItem } from './entities'

export type QuoteStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
export interface QuoteParty {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  taxNumber?: string
}
export interface Quote extends Omit<InvoiceOptions, 'amountPaid'> {
  id: string
  userId: string
  customerId: string
  quoteNumber: string
  status: QuoteStatus
  version: number
  quoteDate: string
  validUntil: string
  isExpired: boolean
  expiryTimezone: 'UTC'
  issuedAt: string | null
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
  companySnapshot: QuoteParty
  customerSnapshot: QuoteParty
  lineItems: LineItem[]
  currency: string
  taxRate: number
  notes: string
  subtotal: number
  taxAmount: number
  total: number
  convertedInvoice: { id: string; invoiceNumber: string; status: string } | null
}
export interface QuoteInput extends Omit<InvoiceOptions, 'amountPaid'> {
  customerId: string
  quoteDate: string
  validUntil: string
  lineItems: LineItem[]
  taxRate: number
  notes?: string
}
export interface QuoteQuery {
  search?: string
  status?: QuoteStatus
  expiry?: 'expired'
  page?: number
  limit?: number
}
export interface QuotePage {
  data: Quote[]
  total: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
export interface QuoteConversion {
  version: number
  invoiceNumber?: string
  serviceDate: string
  dueDate: string
}
export function quoteStatusLabel(
  quote: Pick<Quote, 'status' | 'isExpired' | 'convertedInvoice'>
) {
  if (quote.convertedInvoice) return 'Converted'
  if (quote.isExpired && ['DRAFT', 'ISSUED', 'ACCEPTED'].includes(quote.status))
    return 'Expired'
  return quote.status[0] + quote.status.slice(1).toLowerCase()
}
/** Presentation adapter for the existing shared billing-document layout; never saved as an invoice. */
export function quoteDocument(quote: Quote): Invoice {
  return {
    ...quote,
    id: quote.id,
    userId: quote.userId,
    customerId: quote.customerId,
    invoiceNumber: quote.quoteNumber,
    serviceDate: new Date(`${quote.quoteDate}T00:00:00Z`),
    dueDate: new Date(`${quote.validUntil}T00:00:00Z`),
    status: 'draft',
    amountPaid: 0,
    createdAt: new Date(quote.createdAt),
    updatedAt: new Date(quote.updatedAt),
    issuedAt: null,
  }
}
export function quoteParties(quote: Quote) {
  const { name, ...company } = quote.companySnapshot
  return {
    company: { ...company, businessName: name, logoUrl: quote.logoDataUrl },
    customer: quote.customerSnapshot,
  }
}
