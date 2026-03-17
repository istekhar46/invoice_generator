/**
 * Guest Invoice Preview Component
 * Read-only preview of the invoice for guest users
 * Displays formatted invoice matching PDF output
 */

import React from 'react'
import type { GuestInvoiceData } from '../../types/guest'
import { InvoiceCalculationService } from '../../services/invoiceCalculation.service'
import { Package, Wrench } from 'lucide-react'

interface GuestInvoicePreviewProps {
  data: GuestInvoiceData
  className?: string
}

export const GuestInvoicePreview: React.FC<GuestInvoicePreviewProps> = ({
  data,
  className = '',
}) => {
  const totals = InvoiceCalculationService.calculateInvoiceTotals(
    data.lineItems,
    data.invoiceDetails.taxRate
  )

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const generateInvoiceNumber = () => {
    const timestamp = Date.now()
    return `INV-${timestamp.toString().slice(-8)}`
  }

  return (
    <div className={`bg-white rounded-xl border-2 border-gray-200 overflow-hidden print:border-0 print:shadow-none ${className}`}>
      {/* Company Header */}
      {data.company?.businessName && (
        <div className="p-8 border-b border-gray-200 bg-gray-50 print:bg-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {data.company.businessName}
            </h1>
            <div className="text-sm text-gray-600 space-y-1">
              {data.company.address && <p>{data.company.address}</p>}
              {(data.company.city || data.company.state || data.company.zipCode) && (
                <p>
                  {[data.company.city, data.company.state, data.company.zipCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-2">
                {data.company.phone && <p>Phone: {data.company.phone}</p>}
                {data.company.email && <p>Email: {data.company.email}</p>}
              </div>
              {data.company.taxNumber && (
                <p className="mt-2">Tax ID: {data.company.taxNumber}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Metadata and Customer */}
      <div className="p-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Invoice Metadata */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">INVOICE</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-semibold text-gray-900">
                    {generateInvoiceNumber()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Date:</span>
                  <span className="font-semibold text-gray-900">
                    {formatDate(data.invoiceDetails.serviceDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-semibold text-gray-900">
                    {formatDate(data.invoiceDetails.dueDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                Bill To
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-gray-900 text-base">
                  {data.customer.name}
                </p>
                {data.customer.address && (
                  <p className="text-gray-600">{data.customer.address}</p>
                )}
                {(data.customer.city || data.customer.state || data.customer.zipCode) && (
                  <p className="text-gray-600">
                    {[data.customer.city, data.customer.state, data.customer.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {data.customer.phone && (
                  <p className="text-gray-600">Phone: {data.customer.phone}</p>
                )}
                {data.customer.email && (
                  <p className="text-gray-600">Email: {data.customer.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="p-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">
            Items
          </h3>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 uppercase">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 uppercase">
                    Description
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">
                    Quantity
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">
                    Rate
                  </th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-200">
                    <td className="py-3 px-2">
                      <div className="flex items-center">
                        {item.type === 'material' ? (
                          <Package className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Wrench className="w-4 h-4 text-green-600" />
                        )}
                        <span className="ml-2 text-sm text-gray-600 capitalize">
                          {item.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-4">
            {data.lineItems.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    {item.type === 'material' ? (
                      <Package className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Wrench className="w-4 h-4 text-green-600" />
                    )}
                    <span className="ml-2 text-xs text-gray-600 capitalize">
                      {item.type}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {item.description}
                </p>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Qty: {item.quantity}</span>
                  <span>Rate: {formatCurrency(item.rate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals Section */}
      <div className="p-8 bg-gray-50 print:bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  Tax ({(data.invoiceDetails.taxRate * 100).toFixed(2)}%):
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totals.taxAmount)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-300">
                <span className="text-gray-900">Total:</span>
                <span className="text-blue-600">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {data.notes && (
        <div className="p-8 border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
              Notes
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {data.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
