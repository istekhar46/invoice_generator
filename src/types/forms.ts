/**
 * Form data types and Zod validation schemas
 * These types are used for form handling and validation
 */

import { z } from 'zod'
import type { LineItemType, InvoiceStatus } from './entities'

// Shared API constraints for international phone and postal formats.
const PHONE_REGEX = /^\+?[\d\s().-]{7,30}$/
const POSTAL_CODE_REGEX = /^[a-zA-Z0-9][\w\s-]{1,19}$/
const customerPhoneSchema = z
  .string()
  .max(30, 'Phone number cannot exceed 30 characters')
  .regex(
    PHONE_REGEX,
    'Invalid phone number (include country code for international, e.g. +44 20 7946 0958)'
  )
  .refine(value => {
    const digitCount = value.replace(/\D/g, '').length
    return digitCount >= 7 && digitCount <= 15
  }, 'Phone number must contain between 7 and 15 digits')

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
  state: z
    .string()
    .min(1, 'State / Province / Region is required')
    .max(50, 'Too long'),
  zipCode: z.string().regex(POSTAL_CODE_REGEX, 'Invalid postal code'),
  phone: z
    .string()
    .regex(
      PHONE_REGEX,
      'Invalid phone number (include country code for international, e.g. +44 20 7946 0958)'
    ),
  email: z.string().email('Invalid email address'),
  taxNumber: z.string().optional(),
  defaultTaxRate: z
    .number()
    .min(0, 'Tax rate must be 0 or more')
    .max(100, 'Tax rate cannot exceed 100%'),
})

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>

/**
 * Customer form schema and type
 */
export const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'Customer name is required')
    .max(200, 'Customer name cannot exceed 200 characters'),
  email: z.string().email('Invalid email address'),
  phone: customerPhoneSchema,
  address: z
    .string()
    .min(1, 'Address is required')
    .max(300, 'Address cannot exceed 300 characters'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string()
    .min(2, 'State / Province / Region must be at least 2 characters')
    .max(100, 'State / Province / Region cannot exceed 100 characters'),
  zipCode: z.string().regex(POSTAL_CODE_REGEX, 'Invalid postal code'),
})

export type CustomerFormData = z.infer<typeof customerSchema>

/**
 * Line item form schema and type
 */
export const lineItemSchema = z.object({
  id: z.string(),
  type: z.literal('material'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  unit: z
    .string()
    .min(1, 'Unit is required')
    .max(50, 'Unit must be less than 50 characters'),
  quantity: z
    .number()
    .min(0.01, 'Quantity must be greater than 0')
    .max(10000, 'Quantity cannot exceed 10,000'),
  rate: z
    .number()
    .min(0, 'Rate must be positive')
    .max(100000, 'Rate cannot exceed $100,000'),
  amount: z.number(),
})

export type LineItemFormData = z.infer<typeof lineItemSchema>

const invoiceFields = {
  serviceDate: z.date(),
  dueDate: z.date(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  taxRate: z
    .number()
    .min(0, 'Tax rate must be positive')
    .max(1, 'Tax rate must be between 0 and 1'),
}

const hasValidInvoiceDateRange = (data: { serviceDate: Date; dueDate: Date }) =>
  data.dueDate >= data.serviceDate

/**
 * Invoice form schema and type
 */
export const invoiceSchema = z
  .object({
    customerId: z.string().min(1, 'Customer is required'),
    ...invoiceFields,
  })
  .refine(
    hasValidInvoiceDateRange,
    {
      message: 'Due date must be on or after the service date',
      path: ['dueDate'],
    }
  )

export type InvoiceFormData = z.infer<typeof invoiceSchema>

/**
 * Quick invoice form schema and type
 * For creating invoices without saving company or customer details
 */
export const quickInvoiceSchema = z
  .object({
    // Optional customer ID - if provided, uses saved customer
    customerId: z.string().optional(),

    // Inline company details (all optional)
    quickCompanyName: z.string().optional(),
    quickCompanyAddress: z.string().optional(),
    quickCompanyCity: z.string().optional(),
    quickCompanyState: z.string().max(50, 'Too long').optional(),
    quickCompanyZipCode: z
      .string()
      .regex(POSTAL_CODE_REGEX, 'Invalid postal code')
      .optional()
      .or(z.literal('')),
    quickCompanyPhone: z
      .string()
      .regex(PHONE_REGEX, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    quickCompanyEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    quickCompanyTaxNumber: z.string().optional(),

    // Inline customer details (all optional)
    quickCustomerName: z.string().optional(),
    quickCustomerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    quickCustomerPhone: z
      .string()
      .regex(PHONE_REGEX, 'Invalid phone number')
      .optional()
      .or(z.literal('')),
    quickCustomerAddress: z.string().optional(),
    quickCustomerCity: z.string().optional(),
    quickCustomerState: z.string().max(50, 'Too long').optional(),
    quickCustomerZipCode: z
      .string()
      .regex(POSTAL_CODE_REGEX, 'Invalid postal code')
      .optional()
      .or(z.literal('')),

    ...invoiceFields,
  })
  .refine(
    hasValidInvoiceDateRange,
    {
      message: 'Due date must be on or after the service date',
      path: ['dueDate'],
    }
  )
  .refine(
    data => {
      // Either customerId OR quick customer details must be provided
      return !!data.customerId || !!data.quickCustomerName
    },
    {
      message: 'Either select a customer or provide customer details',
      path: ['quickCustomerName'],
    }
  )

export type QuickInvoiceFormData = z.infer<typeof quickInvoiceSchema>

/**
 * Additional form types for specific use cases
 */
export interface LineItemInput {
  type: LineItemType
  description: string
  unit: string
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
