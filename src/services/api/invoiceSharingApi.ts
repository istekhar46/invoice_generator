import { apiClient } from './apiClient'
import { ENV } from '../../utils/env'
import type { Invoice } from '../../types/entities'
import type {
  InvoiceCompany,
  InvoiceCustomer,
} from '../../utils/invoiceDocument'

export interface InvoiceShareStatus {
  available: boolean
  active: boolean
  canCreate: boolean
  createdAt: string | null
}
export interface PublicInvoiceDocument {
  documentId: string
  invoiceNumber: string
  serviceDate: string
  dueDate: string
  createdAt: string
  updatedAt: string
  status: 'SENT' | 'PAID' | 'VOIDED'
  company: InvoiceCompany | null
  customer: InvoiceCustomer | null
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
  shippingAmount: number
  notes: string | null
  terms: string | null
  paymentTerms: string | null
  purchaseOrderNumber: string | null
  shippingAddress: string | null
  logoDataUrl: string | null
  paymentUrl: string | null
  lineItems: {
    type: 'PRODUCT' | 'SERVICE'
    description: string
    unit: string
    quantity: number
    rate: number
    amount: number
  }[]
}
export const invoiceSharingApi = {
  status: (id: string, signal?: AbortSignal) =>
    apiClient.get<InvoiceShareStatus>(
      `/invoices/${encodeURIComponent(id)}/share`,
      { sensitive: true, signal }
    ),
  create: (id: string, createIfMissing: boolean) =>
    apiClient.post<{ token: string; createdAt: string }>(
      `/invoices/${encodeURIComponent(id)}/share`,
      { createIfMissing },
      { sensitive: true }
    ),
  revoke: (id: string) =>
    apiClient.delete<void>(`/invoices/${encodeURIComponent(id)}/share`, {
      sensitive: true,
    }),
}

export class PublicInvoiceError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** No account client, cookies, refresh, logging or persistent query cache. */
export async function readPublicInvoice(
  token: string,
  signal?: AbortSignal
): Promise<PublicInvoiceDocument> {
  const response = await fetch(`${ENV.API_BASE_URL}/public/invoice`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal,
  })
  if (!response.ok)
    throw new PublicInvoiceError(
      response.status,
      response.status === 404
        ? 'This invoice link is unavailable. Ask the sender for a new link.'
        : response.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : 'The invoice could not be loaded. Please try again.'
    )
  const json = (await response.json()) as { data: PublicInvoiceDocument }
  return json.data
}

/** Presentation IDs are the public share ID, never owner invoice/customer/catalog IDs. */
export function publicInvoiceModel(document: PublicInvoiceDocument): Invoice {
  return {
    id: document.documentId,
    userId: '',
    customerId: null,
    invoiceNumber: document.invoiceNumber,
    status: document.status.toLowerCase() as Invoice['status'],
    serviceDate: new Date(document.serviceDate),
    dueDate: new Date(document.dueDate),
    createdAt: new Date(document.createdAt),
    updatedAt: new Date(document.updatedAt),
    currency: document.currency,
    subtotal: document.subtotal,
    taxRate: document.taxRate,
    taxAmount: document.taxAmount,
    total: document.total,
    amountPaid: document.amountPaid,
    discountType: document.discountType,
    discountValue: document.discountValue,
    shippingAmount: document.shippingAmount,
    notes: document.notes ?? '',
    terms: document.terms ?? '',
    paymentTerms: document.paymentTerms ?? '',
    purchaseOrderNumber: document.purchaseOrderNumber ?? '',
    shippingAddress: document.shippingAddress ?? '',
    logoDataUrl: document.logoDataUrl ?? '',
    paymentUrl: document.paymentUrl,
    lineItems: document.lineItems.map((item, index) => ({
      ...item,
      id: `${document.documentId}:${index}`,
      invoiceId: document.documentId,
      type: item.type === 'PRODUCT' ? 'product' : 'service',
    })),
  }
}
