/**
 * Guest invoice type definitions
 * Types for anonymous users creating invoices without authentication
 */

import type { LineItem } from './entities'

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
  lineItems: LineItem[]
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
