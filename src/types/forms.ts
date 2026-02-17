/**
 * Form data types and Zod validation schemas
 * These types are used for form handling and validation
 */

import { z } from 'zod'
import type { LineItemType, InvoiceStatus } from './entities'

// Validation regex patterns
const PHONE_REGEX = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/
const ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/

/**
 * Authentication form schemas and types
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>

/**
 * Company profile form schema and type
 */
export const companyProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(ZIP_CODE_REGEX, 'Invalid zip code format'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format'),
  email: z.string().email('Invalid email address'),
  taxNumber: z.string().min(1, 'Tax number is required'),
  defaultLaborRate: z.number().min(0, 'Labor rate must be positive'),
  defaultTaxRate: z.number().min(0, 'Tax rate must be positive').max(1, 'Tax rate must be between 0 and 1'),
})

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>

/**
 * Customer form schema and type
 */
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number format'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(ZIP_CODE_REGEX, 'Invalid zip code format'),
})

export type CustomerFormData = z.infer<typeof customerSchema>

/**
 * Line item form schema and type
 */
export const lineItemSchema = z.object({
  id: z.string(),
  type: z.enum(['material', 'labor'] as const),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0').max(10000, 'Quantity cannot exceed 10,000'),
  rate: z.number().min(0, 'Rate must be positive').max(100000, 'Rate cannot exceed $100,000'),
  amount: z.number(),
})

export type LineItemFormData = z.infer<typeof lineItemSchema>

/**
 * Invoice form schema and type
 */
export const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  serviceDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  taxRate: z.number().min(0, 'Tax rate must be positive').max(1, 'Tax rate must be between 0 and 1'),
}).refine((data) => {
  // Ensure due date is after service date
  return data.dueDate >= data.serviceDate
}, {
  message: 'Due date must be on or after the service date',
  path: ['dueDate'],
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>

/**
 * Quick invoice form schema and type
 * For creating invoices without saving company or customer details
 */
export const quickInvoiceSchema = z.object({
  // Optional customer ID - if provided, uses saved customer
  customerId: z.string().optional(),

  // Inline company details (all optional)
  quickCompanyName: z.string().optional(),
  quickCompanyAddress: z.string().optional(),
  quickCompanyCity: z.string().optional(),
  quickCompanyState: z.string().length(2, 'State must be 2 characters').optional(),
  quickCompanyZipCode: z.string().regex(ZIP_CODE_REGEX, 'Invalid zip code format').optional(),
  quickCompanyPhone: z.string().regex(PHONE_REGEX, 'Invalid phone number format').optional(),
  quickCompanyEmail: z.string().email('Invalid email address').optional(),
  quickCompanyTaxNumber: z.string().optional(),

  // Inline customer details (all optional)
  quickCustomerName: z.string().optional(),
  quickCustomerEmail: z.string().email('Invalid email address').optional(),
  quickCustomerPhone: z.string().regex(PHONE_REGEX, 'Invalid phone number format').optional(),
  quickCustomerAddress: z.string().optional(),
  quickCustomerCity: z.string().optional(),
  quickCustomerState: z.string().length(2, 'State must be 2 characters').optional(),
  quickCustomerZipCode: z.string().regex(ZIP_CODE_REGEX, 'Invalid zip code format').optional(),

  // Standard invoice fields
  serviceDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  taxRate: z.number().min(0, 'Tax rate must be positive').max(1, 'Tax rate must be between 0 and 1'),
}).refine((data) => {
  // Ensure due date is after service date
  return data.dueDate >= data.serviceDate
}, {
  message: 'Due date must be on or after the service date',
  path: ['dueDate'],
}).refine((data) => {
  // Either customerId OR quick customer details must be provided
  return !!data.customerId || !!data.quickCustomerName
}, {
  message: 'Either select a customer or provide customer details',
  path: ['quickCustomerName'],
})

export type QuickInvoiceFormData = z.infer<typeof quickInvoiceSchema>

/**
 * Additional form types for specific use cases
 */
export interface LineItemInput {
  type: LineItemType
  description: string
  quantity: string // String for form input, converted to number during validation
  rate: string // String for form input, converted to number during validation
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  customerId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface CustomerFilters {
  search?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}