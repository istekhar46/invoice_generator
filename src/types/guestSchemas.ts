/**
 * Zod validation schemas for guest invoice forms
 */

import { z } from 'zod'

// Regex patterns from existing forms.ts
const PHONE_REGEX = /^\+?[\d\s().\-]{7,20}$/
const POSTAL_CODE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s\-]{1,9}$/

/**
 * Guest line item schema (without invoiceId since it's not saved)
 */
export const guestLineItemSchema = z.object({
  id: z.string(),
  type: z.literal('material'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit must be less than 50 characters'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0').max(10000, 'Quantity cannot exceed 10,000'),
  rate: z.number().min(0, 'Rate must be positive').max(100000, 'Rate cannot exceed $100,000'),
  amount: z.number(),
})

/**
 * Guest company details schema (all fields optional)
 */
export const guestCompanyDetailsSchema = z.object({
  businessName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(50, 'Too long').optional(),
  zipCode: z.string().regex(POSTAL_CODE_REGEX, 'Invalid postal code').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number (include country code for international, e.g. +44 20 7946 0958)').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  taxNumber: z.string().optional(),
})

/**
 * Guest customer details schema (name required, rest optional)
 */
export const guestCustomerDetailsSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number (include country code for international, e.g. +44 20 7946 0958)').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(50, 'Too long').optional(),
  zipCode: z.string().regex(POSTAL_CODE_REGEX, 'Invalid postal code').optional().or(z.literal('')),
})

/**
 * Guest invoice details schema
 */
export const guestInvoiceDetailsSchema = z.object({
  serviceDate: z.date(),
  dueDate: z.date(),
  taxRate: z.number().min(0, 'Tax rate must be 0 or more').max(1, 'Tax rate must be between 0 and 1'),
}).refine((data) => {
  return data.dueDate >= data.serviceDate
}, {
  message: 'Due date must be on or after the service date',
  path: ['dueDate'],
})

/**
 * Complete guest invoice data schema
 */
export const guestInvoiceDataSchema = z.object({
  company: guestCompanyDetailsSchema.nullable(),
  customer: guestCustomerDetailsSchema,
  invoiceDetails: guestInvoiceDetailsSchema,
  lineItems: z.array(guestLineItemSchema).min(1, 'At least one line item is required'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  createdAt: z.date(),
  lastModified: z.date(),
})

/**
 * Type inference from schemas
 */
export type GuestCompanyDetailsFormData = z.infer<typeof guestCompanyDetailsSchema>
export type GuestCustomerDetailsFormData = z.infer<typeof guestCustomerDetailsSchema>
export type GuestInvoiceDetailsFormData = z.infer<typeof guestInvoiceDetailsSchema>
export type GuestInvoiceDataFormData = z.infer<typeof guestInvoiceDataSchema>
