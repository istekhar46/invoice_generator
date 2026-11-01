import { z } from 'zod'
import { SUPPORTED_CURRENCIES } from '../../backend/src/invoice/invoice-calculation'

export const invoiceOptionFields = {
  invoiceNumber: z.string().trim().max(80).optional(),
  currency: z
    .string()
    .refine(
      value => SUPPORTED_CURRENCIES.includes(value),
      'Choose a supported currency'
    )
    .optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  shippingAmount: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
  paymentTerms: z.string().max(200).optional(),
  terms: z.string().max(2000).optional(),
  purchaseOrderNumber: z.string().max(100).optional(),
  shippingAddress: z.string().max(1000).optional(),
  logoDataUrl: z
    .string()
    .max(349552)
    .regex(
      /^$|^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/,
      'Use a PNG or JPEG logo'
    )
    .optional(),
}
