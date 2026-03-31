/**
 * Core entity type definitions for the Electrician Invoice Generation Web App
 * These types represent the domain models stored in local storage
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
export type LineItemType = 'material'

/**
 * Line item entity representing a single charge on an invoice
 */
export interface LineItem {
  id: string
  invoiceId: string
  type: LineItemType
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

/**
 * Invoice status types
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

/**
 * Invoice entity representing a billing document
 */
export interface Invoice {
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
  createdAt: Date
  updatedAt: Date
  // Quick invoice fields
  isQuickInvoice?: boolean
  quickCompanyName?: string
  quickCompanyAddress?: string
  quickCompanyCity?: string
  quickCompanyState?: string
  quickCompanyZipCode?: string
  quickCompanyPhone?: string
  quickCompanyEmail?: string
  quickCompanyTaxNumber?: string
  quickCustomerName?: string
  quickCustomerEmail?: string
  quickCustomerPhone?: string
  quickCustomerAddress?: string
  quickCustomerCity?: string
  quickCustomerState?: string
  quickCustomerZipCode?: string
}

/**
 * Calculated totals for an invoice
 */
export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  total: number
}
