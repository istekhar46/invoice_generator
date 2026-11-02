import { z } from 'zod'
import { invoiceOptionFields } from './invoiceOptions'
import type { CompanyProfile } from './entities'

export const invoiceDefaultsSchema = z.object({
  currency: invoiceOptionFields.currency.unwrap(),
  taxRate: z.number().min(0).max(1),
  paymentTerms: z.string().max(200),
  notes: z.string().max(1000),
  terms: z.string().max(2000),
})

export type InvoiceDefaults = z.infer<typeof invoiceDefaultsSchema>
export interface NewInvoiceDefaults {
  settings: InvoiceDefaults
  company: CompanyProfile | null
  logoDataUrl: string
  logoError?: string
}

export function defaultInvoiceSettings(taxRate = 0): InvoiceDefaults {
  return { currency: 'USD', taxRate, paymentTerms: '', notes: '', terms: '' }
}

export function pickInvoiceDefaults(
  data: Partial<InvoiceDefaults>
): InvoiceDefaults {
  return invoiceDefaultsSchema.parse({
    currency: data.currency ?? 'USD',
    taxRate: data.taxRate ?? 0,
    paymentTerms: data.paymentTerms ?? '',
    notes: data.notes ?? '',
    terms: data.terms ?? '',
  })
}
