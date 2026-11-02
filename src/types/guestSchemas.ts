/**
 * Structural validation for persisted guest invoice drafts.
 */

import { z } from 'zod'
import { SUPPORTED_CURRENCIES } from '../services/invoiceCalculation.service'

export const guestInvoiceDraftSchema = z.object({
  draftId: z.string().optional(),
  company: z
    .object({
      businessName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      taxNumber: z.string().optional(),
    })
    .nullable(),
  customer: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }),
  invoiceDetails: z.object({
    invoiceNumber: z.string().optional(),
    currency: z
      .string()
      .refine(value => SUPPORTED_CURRENCIES.includes(value))
      .optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().optional(),
    shippingAmount: z.number().optional(),
    amountPaid: z.number().optional(),
    paymentTerms: z.string().optional(),
    terms: z.string().optional(),
    purchaseOrderNumber: z.string().optional(),
    shippingAddress: z.string().optional(),
    logoDataUrl: z.string().optional(),
    serviceDate: z.date(),
    dueDate: z.date(),
    taxRate: z.number(),
  }),
  lineItems: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['product', 'service']),
      description: z.string(),
      unit: z.string(),
      quantity: z.number(),
      rate: z.number(),
      amount: z.number(),
    })
  ),
  notes: z.string().optional(),
  createdAt: z.date(),
  lastModified: z.date(),
})
