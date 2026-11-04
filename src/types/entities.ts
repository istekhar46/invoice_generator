/**
 * Core entity type definitions for the Electrician Invoice Generation Web App
 * These types match the backend Prisma schema and API response shapes.
 */

/**
 * User entity representing an authenticated electrician/contractor
 */
export interface User {
  id: string
  email: string
  displayName: string
  passwordHash?: string
  photoURL?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Company profile containing business information
 */
export interface CompanyProfile {
  id: string
  userId: string
  businessName: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  taxNumber?: string
  defaultTaxRate: number
  /** Historical company field; catalog item prices do not use this value. */
  defaultLaborRate?: number
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Customer entity representing a client
 */
export interface Customer {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Line item type for invoice entries
 */
export type LineItemType = 'product' | 'service'

/**
 * Line item entity representing a single charge on an invoice
 */
export interface LineItem {
  id: string
  invoiceId: string
  type: LineItemType
  catalogItemId?: string | null
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

/**
 * Invoice status types
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'voided'

/**
 * Invoice entity representing a billing document
 */
export interface Invoice extends InvoiceOptions {
  customer?: Customer | null
  id: string
  userId: string
  customerId: string | null
  invoiceNumber: string
  serviceDate: Date
  dueDate: Date
  lineItems: LineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  status: InvoiceStatus
  issuedAt?: Date | null
  hasPaymentHistory?: boolean
  paymentUrl?: string | null
  createdAt: Date
  updatedAt: Date
  // Quick invoice fields
  isQuickInvoice?: boolean
  quickCompanyName?: string | null
  quickCompanyAddress?: string | null
  quickCompanyCity?: string | null
  quickCompanyState?: string | null
  quickCompanyZipCode?: string | null
  quickCompanyPhone?: string | null
  quickCompanyEmail?: string | null
  quickCompanyTaxNumber?: string | null
  quickCustomerName?: string | null
  quickCustomerEmail?: string | null
  quickCustomerPhone?: string | null
  quickCustomerAddress?: string | null
  quickCustomerCity?: string | null
  quickCustomerState?: string | null
  quickCustomerZipCode?: string | null
}

/** Optional on existing invoices; API defaults are USD with no adjustments. */
export interface InvoiceOptions {
  currency?: string
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  shippingAmount?: number
  amountPaid?: number
  paymentTerms?: string
  terms?: string
  purchaseOrderNumber?: string
  shippingAddress?: string
  logoDataUrl?: string
}

/**
 * Calculated totals for an invoice
 */
export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  total: number
}
