import type { InvoiceOptions, LineItemType } from './entities'

/**
 * Guest invoice type definitions
 * Types for anonymous users creating invoices without authentication
 */

/**
 * Line item type for guest invoices (without invoiceId)
 */
export interface GuestLineItem {
  id: string
  type: LineItemType
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
export interface GuestInvoiceDetails extends InvoiceOptions {
  invoiceNumber?: string
  serviceDate: Date
  dueDate: Date
  taxRate: number
}

/**
 * Complete guest invoice data structure
 */
export interface GuestInvoiceData {
  draftId?: string
  company: GuestCompanyDetails | null
  customer: GuestCustomerDetails
  invoiceDetails: GuestInvoiceDetails
  lineItems: GuestLineItem[]
  notes?: string
  createdAt: Date
  lastModified: Date
}
