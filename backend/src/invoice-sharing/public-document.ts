import { Prisma } from '@prisma/client';
import { invoicePaymentUrl } from '../razorpay/gateway-policy';
import { invoiceUpiDetails } from '../payments/direct-upi-policy';

const party = {
  name: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  email: true,
  phone: true,
} as const;
export const publicInvoiceSelect = {
  invoiceNumber: true,
  serviceDate: true,
  dueDate: true,
  status: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  total: true,
  currency: true,
  discountType: true,
  discountValue: true,
  shippingAmount: true,
  amountPaid: true,
  directUpiId: true,
  directUpiPayeeName: true,
  directUpiReference: true,
  notes: true,
  terms: true,
  paymentTerms: true,
  purchaseOrderNumber: true,
  shippingAddress: true,
  logoDataUrl: true,
  createdAt: true,
  updatedAt: true,
  isQuickInvoice: true,
  customerId: true,
  quickCompanyName: true,
  quickCompanyAddress: true,
  quickCompanyCity: true,
  quickCompanyState: true,
  quickCompanyZipCode: true,
  quickCompanyEmail: true,
  quickCompanyPhone: true,
  quickCompanyTaxNumber: true,
  quickCustomerName: true,
  quickCustomerAddress: true,
  quickCustomerCity: true,
  quickCustomerState: true,
  quickCustomerZipCode: true,
  quickCustomerEmail: true,
  quickCustomerPhone: true,
  customer: { select: party },
  user: {
    select: {
      companyProfile: {
        select: {
          businessName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          email: true,
          phone: true,
          taxNumber: true,
          logoUrl: true,
        },
      },
    },
  },
  lineItems: {
    select: { type: true, description: true, unit: true, quantity: true, rate: true, amount: true },
  },
  gatewayLinks: {
    where: { mode: 'LIVE', state: 'ACTIVE', connection: { enabled: true } },
    select: { url: true, amountMinor: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.InvoiceSelect;

export type PublicInvoiceSource = Prisma.InvoiceGetPayload<{ select: typeof publicInvoiceSelect }>;

/** Explicit allowlist: no owner DTO spread, invoice/customer/catalog IDs or ledger/provider data. */
export function publicDocument(documentId: string, invoice: PublicInvoiceSource) {
  const company = invoice.isQuickInvoice
    ? {
        businessName: invoice.quickCompanyName ?? '',
        address: invoice.quickCompanyAddress ?? '',
        city: invoice.quickCompanyCity ?? '',
        state: invoice.quickCompanyState ?? '',
        zipCode: invoice.quickCompanyZipCode ?? '',
        email: invoice.quickCompanyEmail ?? '',
        phone: invoice.quickCompanyPhone ?? '',
        taxNumber: invoice.quickCompanyTaxNumber ?? '',
        logoUrl: invoice.logoDataUrl ?? '',
      }
    : invoice.user.companyProfile;
  const customer =
    invoice.isQuickInvoice && (invoice.quickCustomerName || !invoice.customerId)
      ? {
          name: invoice.quickCustomerName ?? '',
          address: invoice.quickCustomerAddress ?? '',
          city: invoice.quickCustomerCity ?? '',
          state: invoice.quickCustomerState ?? '',
          zipCode: invoice.quickCustomerZipCode ?? '',
          email: invoice.quickCustomerEmail ?? '',
          phone: invoice.quickCustomerPhone ?? '',
        }
      : invoice.customer;
  return {
    documentId,
    invoiceNumber: invoice.invoiceNumber,
    serviceDate: invoice.serviceDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    shippingAmount: invoice.shippingAmount,
    amountPaid: invoice.amountPaid,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentTerms: invoice.paymentTerms,
    purchaseOrderNumber: invoice.purchaseOrderNumber,
    shippingAddress: invoice.shippingAddress,
    logoDataUrl: invoice.logoDataUrl,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    company: company ? { ...company, logoUrl: company.logoUrl ?? '' } : null,
    customer,
    lineItems: invoice.lineItems.map((item) => ({
      type: item.type,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })),
    paymentUrl: invoicePaymentUrl(invoice),
    directUpi:
      invoice.status === 'SENT' && invoice.currency === 'INR' && invoice.total > invoice.amountPaid
        ? invoiceUpiDetails(invoice)
        : null,
  };
}
