/**
 * Guest invoice type definitions
 * Types for anonymous users creating invoices without authentication
 */

/**
 * Line item type for guest invoices (without invoiceId)
 */
export interface GuestLineItem {
  id: string
  type: 'material'
  description: string
  unit: string
  quantity: number
  rate: number
  amount: number
}

/**
 * Company details for guest invoices (all optional)
 */
export interface GuestCompanyDetails {
  businessName?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phone?: string
  email?: string
  taxNumber?: string
}

/**
 * Customer details for guest invoices
 */
export interface GuestCustomerDetails {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

/**
 * Invoice details for guest invoices
 */
export interface GuestInvoiceDetails {
  serviceDate: Date
  dueDate: Date
  taxRate: number
}

/**
 * Complete guest invoice data structure
 */
export interface GuestInvoiceData {
  company: GuestCompanyDetails | null
  customer: GuestCustomerDetails
  invoiceDetails: GuestInvoiceDetails
  lineItems: GuestLineItem[]
  notes?: string
  createdAt: Date
  lastModified: Date
}

/**
 * Validation result for guest invoice data
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validation errors by field
 */
export interface ValidationErrors {
  [field: string]: string[]
}

/**
 * Invoice totals calculation result
 */
export interface InvoiceTotals {
  subtotal: number
  taxAmount: number
  total: number
}
