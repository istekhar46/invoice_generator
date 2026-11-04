import React from 'react'
import type { Invoice } from '../../../types/entities'
import {
  invoiceParties,
  documentTotals,
  documentPaymentUrl,
} from '../../../utils/invoiceDocument'
import type {
  InvoiceCompany,
  InvoiceCustomer,
} from '../../../utils/invoiceDocument'
import { formatCurrency, formatDate } from '../../../utils/formatters'

interface InvoicePreviewProps {
  invoice: Partial<Invoice>
  company?: InvoiceCompany | null
  customer?: InvoiceCustomer | null
  className?: string
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  company,
  customer,
  className = '',
}) => {
  const parties = invoiceParties(invoice, company, customer || invoice.customer)
  const currency = invoice.currency || 'USD'
  const amount = (value = 0) => formatCurrency(value, currency)
  const totals = documentTotals(invoice)
  const paymentUrl = documentPaymentUrl(invoice)
  const address = (party?: InvoiceCompany | InvoiceCustomer | null) =>
    party && (
      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-500">
        <p>{party.address}</p>
        <p>
          {[party.city, party.state, party.zipCode].filter(Boolean).join(', ')}
        </p>
        <p>{party.email}</p>
        <p>{party.phone}</p>
      </div>
    )
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span>{amount(value)}</span>
    </div>
  )
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-8 ${className}`}
      aria-label="Invoice preview"
    >
      <div className="mb-8 flex flex-wrap justify-between gap-6">
        <div>
          {parties.company?.logoUrl && (
            <img
              src={parties.company.logoUrl}
              alt="Company logo"
              className="mb-4 h-16 max-w-48 object-contain"
            />
          )}
          <h2 className="text-xl font-bold text-slate-900">
            {parties.company?.businessName}
          </h2>
          {address(parties.company)}
          {parties.company?.taxNumber && (
            <p className="text-sm text-slate-500">
              Tax / VAT / GST ID: {parties.company.taxNumber}
            </p>
          )}
        </div>
        <div className="space-y-1 text-sm sm:text-right">
          <h1 className="mb-3 text-3xl font-bold text-slate-900">
            {invoice.status === 'voided' ? 'VOIDED INVOICE' : 'INVOICE'}
          </h1>
          <p>{invoice.invoiceNumber || 'Preview'}</p>
          {invoice.serviceDate && (
            <p>Invoice date: {formatDate(invoice.serviceDate)}</p>
          )}
          {invoice.dueDate && <p>Due date: {formatDate(invoice.dueDate)}</p>}
          {invoice.paymentTerms && <p>Payment terms: {invoice.paymentTerms}</p>}
          {invoice.purchaseOrderNumber && (
            <p>PO number: {invoice.purchaseOrderNumber}</p>
          )}
          <p>Currency: {currency}</p>
        </div>
      </div>
      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bill to
          </h3>
          <p className="font-semibold">{parties.customer?.name}</p>
          {address(parties.customer)}
        </div>
        {invoice.shippingAddress && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ship to
            </h3>
            <p className="whitespace-pre-line text-sm">
              {invoice.shippingAddress}
            </p>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-3 text-left">Item / service</th>
              <th className="p-3 text-right">Quantity</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems?.map(item => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="whitespace-pre-line p-3">{item.description}</td>
                <td className="p-3 text-right">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-3 text-right">{amount(item.rate)}</td>
                <td className="p-3 text-right font-medium">
                  {amount(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="space-y-5">
          {invoice.notes && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Notes
              </h3>
              <p className="whitespace-pre-line text-sm">{invoice.notes}</p>
            </section>
          )}
          {invoice.terms && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Terms & payment instructions
              </h3>
              <p className="whitespace-pre-line text-sm">{invoice.terms}</p>
            </section>
          )}
          {paymentUrl && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">
                Pay by UPI
              </h3>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-primary-700 underline"
              >
                {paymentUrl}
              </a>
            </section>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {row('Subtotal', invoice.subtotal || 0)}
          {totals.discountAmount > 0 && row('Discount', -totals.discountAmount)}
          {row(
            `Tax (${Number(((invoice.taxRate || 0) * 100).toFixed(4))}%)`,
            invoice.taxAmount || 0
          )}
          {row('Shipping', invoice.shippingAmount || 0)}
          <div className="border-t pt-3 font-bold">
            {row('Total', invoice.total || 0)}
          </div>
          {row('Amount paid', invoice.amountPaid || 0)}
          <div className="rounded-lg bg-blue-50 p-3 font-bold">
            {row('Balance due', totals.balanceDue)}
          </div>
        </div>
      </div>
    </article>
  )
}
