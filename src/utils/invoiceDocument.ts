import type {
  CompanyProfile,
  Customer,
  Invoice,
  InvoiceOptions,
} from '../types/entities'
import type { GuestInvoiceData } from '../types/guest'
import type { QuickInvoiceFormData } from '../types/forms'
import {
  calculateInvoiceForEdit,
  invoicePricingChanged,
  paymentBalance,
  money,
  type InvoiceSnapshot,
} from '../services/invoiceCalculation.service'

export type InvoiceCompany = Pick<
  CompanyProfile,
  | 'businessName'
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'phone'
  | 'email'
  | 'taxNumber'
  | 'logoUrl'
>
export type InvoiceCustomer = Pick<
  Customer,
  'name' | 'address' | 'city' | 'state' | 'zipCode' | 'phone' | 'email'
>

export function documentTotals(invoice: Partial<Invoice>) {
  const currency = invoice.currency || 'USD'
  const discount = invoice.discountValue || 0
  return {
    discountAmount:
      invoice.discountType === 'fixed'
        ? money(discount, currency)
        : money(((invoice.subtotal || 0) * discount) / 100, currency),
    balanceDue: paymentBalance(
      invoice.total || 0,
      invoice.amountPaid || 0,
      currency
    ),
  }
}

export function invoiceOptions(data: InvoiceOptions): InvoiceOptions {
  return {
    currency: data.currency ?? 'USD',
    discountType: data.discountType ?? 'percentage',
    discountValue: data.discountValue ?? 0,
    shippingAmount: data.shippingAmount ?? 0,
    amountPaid: data.amountPaid ?? 0,
    paymentTerms: data.paymentTerms ?? '',
    terms: data.terms ?? '',
    purchaseOrderNumber: data.purchaseOrderNumber ?? '',
    shippingAddress: data.shippingAddress ?? '',
    logoDataUrl: data.logoDataUrl ?? '',
  }
}

export function invoiceParties(
  invoice: Partial<Invoice>,
  company?: InvoiceCompany | null,
  customer?: InvoiceCustomer | null
) {
  return {
    company: invoice.isQuickInvoice
      ? {
          businessName: invoice.quickCompanyName || '',
          address: invoice.quickCompanyAddress || '',
          city: invoice.quickCompanyCity || '',
          state: invoice.quickCompanyState || '',
          zipCode: invoice.quickCompanyZipCode || '',
          phone: invoice.quickCompanyPhone || '',
          email: invoice.quickCompanyEmail || '',
          taxNumber: invoice.quickCompanyTaxNumber || '',
          logoUrl: invoice.logoDataUrl || '',
        }
      : company,
    customer:
      invoice.isQuickInvoice &&
      (invoice.quickCustomerName || !invoice.customerId)
        ? {
            name: invoice.quickCustomerName || '',
            address: invoice.quickCustomerAddress || '',
            city: invoice.quickCustomerCity || '',
            state: invoice.quickCustomerState || '',
            zipCode: invoice.quickCustomerZipCode || '',
            phone: invoice.quickCustomerPhone || '',
            email: invoice.quickCustomerEmail || '',
          }
        : customer,
  }
}

export function toGuestInvoiceData(
  data: QuickInvoiceFormData,
  draftId: string,
  createdAt: Date
): GuestInvoiceData {
  return {
    draftId,
    company: {
      businessName: data.quickCompanyName,
      address: data.quickCompanyAddress,
      city: data.quickCompanyCity,
      state: data.quickCompanyState,
      zipCode: data.quickCompanyZipCode,
      phone: data.quickCompanyPhone,
      email: data.quickCompanyEmail,
      taxNumber: data.quickCompanyTaxNumber,
    },
    customer: {
      name: data.quickCustomerName || '',
      address: data.quickCustomerAddress,
      city: data.quickCustomerCity,
      state: data.quickCustomerState,
      zipCode: data.quickCustomerZipCode,
      phone: data.quickCustomerPhone,
      email: data.quickCustomerEmail,
    },
    invoiceDetails: {
      ...invoiceOptions(data),
      invoiceNumber: data.invoiceNumber || '',
      serviceDate: data.serviceDate,
      dueDate: data.dueDate,
      taxRate: data.taxRate,
    },
    lineItems: data.lineItems.map(item => ({
      ...item,
      amount: Number.isFinite(item.quantity * item.rate)
        ? money(item.quantity * item.rate, data.currency)
        : 0,
    })),
    notes: data.notes,
    createdAt,
    lastModified: new Date(),
  }
}

export function guestDocument(
  data: GuestInvoiceData,
  invoiceNumber: string,
  original?: InvoiceSnapshot
): Invoice {
  const { invoiceDetails: details, company, customer } = data
  const preserveAmounts =
    original &&
    !invoicePricingChanged(data.lineItems, details.taxRate, details, original)
  return {
    ...invoiceOptions(details),
    id: data.draftId || '',
    userId: '',
    customerId: null,
    invoiceNumber,
    serviceDate: details.serviceDate,
    dueDate: details.dueDate,
    isQuickInvoice: true,
    quickCompanyName: company?.businessName,
    quickCompanyAddress: company?.address,
    quickCompanyCity: company?.city,
    quickCompanyState: company?.state,
    quickCompanyZipCode: company?.zipCode,
    quickCompanyPhone: company?.phone,
    quickCompanyEmail: company?.email,
    quickCompanyTaxNumber: company?.taxNumber,
    quickCustomerName: customer.name,
    quickCustomerAddress: customer.address,
    quickCustomerCity: customer.city,
    quickCustomerState: customer.state,
    quickCustomerZipCode: customer.zipCode,
    quickCustomerPhone: customer.phone,
    quickCustomerEmail: customer.email,
    taxRate: details.taxRate,
    ...calculateInvoiceForEdit(
      data.lineItems,
      details.taxRate,
      details,
      original
    ),
    lineItems: data.lineItems.map((item, index) => ({
      ...item,
      invoiceId: '',
      amount: preserveAmounts
        ? original.lineItems[index].amount
        : money(item.quantity * item.rate, details.currency),
    })),
    notes: data.notes,
    status: 'draft',
    createdAt: data.createdAt,
    updatedAt: data.lastModified,
  }
}
