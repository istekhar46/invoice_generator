import type { Invoice } from '../../types/entities'
import type { GuestInvoiceData } from '../../types/guest'
import type {
  InvoiceCompany,
  InvoiceCustomer,
} from '../../utils/invoiceDocument'

// Fictional, deterministic export fixtures; never loaded by the application.
export const pdfCompany: InvoiceCompany = {
  businessName: 'Fabric Studio',
  address: '12 Example Road',
  city: 'Kolkata',
  state: 'West Bengal',
  zipCode: '700001',
  email: 'studio@example.test',
  phone: '+91 90000 00000',
  taxNumber: 'DEMO-TAX-ID',
}
export const pdfCustomer: InvoiceCustomer = {
  name: 'Example Interiors',
  address: '45 Sample Avenue',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
  email: 'buyer@example.test',
  phone: '+91 90000 00001',
}
const date = new Date('2026-11-03T00:00:00Z')
const base: Invoice = {
  id: 'pdf-fixture',
  userId: 'fictional-owner',
  customerId: 'fictional-customer',
  invoiceNumber: 'STOCK-SENT-001',
  serviceDate: date,
  dueDate: new Date('2026-12-03T00:00:00Z'),
  createdAt: date,
  updatedAt: date,
  issuedAt: date,
  status: 'sent',
  currency: 'INR',
  discountType: 'percentage',
  discountValue: 10,
  shippingAmount: 12.5,
  amountPaid: 100,
  paymentTerms: 'Net 30',
  purchaseOrderNumber: 'PO-EXAMPLE-2026',
  shippingAddress: 'Receiving desk\n45 Sample Avenue\nMumbai 400001',
  notes: 'Stock quantities are deducted when this invoice is issued.',
  terms:
    'Pay the balance by the due date. Quote the invoice number with your payment.',
  lineItems: [
    {
      id: 'fabric',
      invoiceId: 'pdf-fixture',
      catalogItemId: 'catalog-fabric',
      type: 'product',
      description: 'Cotton fabric - catalog snapshot',
      unit: 'm',
      quantity: 1.25,
      rate: 120,
      amount: 150,
    },
    {
      id: 'design',
      invoiceId: 'pdf-fixture',
      catalogItemId: 'catalog-design',
      type: 'service',
      description: 'Design consultation',
      unit: 'hour',
      quantity: 2,
      rate: 50,
      amount: 100,
    },
  ],
  subtotal: 250,
  taxRate: 0.18,
  taxAmount: 40.5,
  total: 278,
}
const legacy: Invoice = {
  ...base,
  invoiceNumber: 'LEGACY-SENT-001',
  customerId: null,
  isQuickInvoice: true,
  quickCompanyName: 'Saved Sender Snapshot',
  quickCompanyEmail: 'saved-sender@example.test',
  quickCustomerName: 'Saved Customer Snapshot',
  quickCustomerEmail: 'saved-buyer@example.test',
  currency: 'USD',
  discountValue: 0,
  shippingAmount: 0,
  amountPaid: 0,
  taxRate: 0,
  taxAmount: 0,
  subtotal: 0.67,
  total: 0.67,
  lineItems: [0, 1].map(index => ({
    id: `legacy-${index}`,
    invoiceId: 'pdf-fixture',
    type: index ? 'service' : 'product',
    description: `Preserved historical row ${index + 1}`,
    unit: 'each',
    quantity: 1,
    rate: 0.335,
    amount: 0.335,
  })),
  notes:
    'Historical total is 0.67. Saved amounts are retained; displayed rows round to currency precision.',
}
const longRows = Array.from({ length: 48 }, (_, index) => ({
  id: `long-${index + 1}`,
  invoiceId: 'pdf-fixture',
  type: 'product' as const,
  description: `Stock item ${String(index + 1).padStart(2, '0')} - ${'Industrial fabric supplied to the approved specification. '.repeat(5)}`,
  unit: 'm',
  quantity: 1.125,
  rate: 10,
  amount: 11.25,
}))
export const invoicePdfFixtures: { name: string; invoice: Invoice }[] = [
  { name: 'sent-partial-inr', invoice: base },
  {
    name: 'voided-inr',
    invoice: {
      ...base,
      invoiceNumber: 'STOCK-VOID-001',
      status: 'voided',
      amountPaid: 0,
    },
  },
  { name: 'legacy-sent-usd', invoice: legacy },
  {
    name: 'legacy-voided-usd',
    invoice: { ...legacy, invoiceNumber: 'LEGACY-VOID-001', status: 'voided' },
  },
  {
    name: 'paid-jpy',
    invoice: {
      ...base,
      invoiceNumber: 'PAID-JPY-001',
      currency: 'JPY',
      status: 'paid',
      discountType: 'fixed',
      discountValue: 100,
      shippingAmount: 30,
      lineItems: [
        { ...base.lineItems[0], quantity: 10, rate: 100, amount: 1000 },
      ],
      subtotal: 1000,
      taxRate: 0.1,
      taxAmount: 90,
      total: 1020,
      amountPaid: 1020,
    },
  },
  {
    name: 'voided-multipage',
    invoice: {
      ...legacy,
      invoiceNumber: 'LONG-VOID-001',
      status: 'voided',
      currency: 'INR',
      lineItems: longRows,
      subtotal: 540,
      taxRate: 0.18,
      taxAmount: 97.2,
      total: 647.2,
      shippingAmount: 10,
      notes: 'Preserved delivery details. '.repeat(45),
      terms:
        'Cancelled document retained for records; no payment is due. '.repeat(
          30
        ),
    },
  },
  {
    name: 'gateway-live-inr',
    invoice: {
      ...base,
      invoiceNumber: 'GATEWAY-SENT-001',
      paymentUrl: 'https://rzp.io/i/fictional-live',
    },
  },
]
invoicePdfFixtures.push({
  name: 'gateway-live-multipage',
  invoice: {
    ...invoicePdfFixtures.find(fixture => fixture.name === 'voided-multipage')!
      .invoice,
    invoiceNumber: 'GATEWAY-LONG-001',
    status: 'sent',
    notes:
      'Issued invoice retained with its saved line amounts and financial totals.',
    terms:
      'Pay the outstanding balance by the due date and quote the invoice number. '.repeat(
        30
      ),
    paymentUrl: 'https://rzp.io/i/fictional-live-long',
  },
})

export const guestPdfFixture: GuestInvoiceData = {
  draftId: 'guest-pdf-fixture',
  company: pdfCompany,
  customer: pdfCustomer,
  invoiceDetails: {
    invoiceNumber: 'GUEST-001',
    serviceDate: date,
    dueDate: base.dueDate,
    taxRate: base.taxRate,
    currency: 'INR',
    discountType: 'percentage',
    discountValue: 10,
    shippingAmount: 12.5,
    amountPaid: 100,
  },
  lineItems: base.lineItems,
  notes: 'Guest draft using the same export template.',
  createdAt: date,
  lastModified: date,
}
