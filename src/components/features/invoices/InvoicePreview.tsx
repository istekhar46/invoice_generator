/**
 * Invoice Preview Component
 * Real-time preview of invoice with company and customer information
 */

import React from 'react'
import type { Invoice, CompanyProfile, Customer } from '../../../types/entities'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { formatCurrency, formatDate } from '../../../utils/formatters'

interface InvoicePreviewProps {
  invoice: Partial<Invoice>
  company?: CompanyProfile | null
  customer?: Customer | null
  className?: string
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  company,
  customer,
  className,
}) => {
  // Early return if essential data is missing
  if (!invoice) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No invoice data available for preview.</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null

    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Invoice Preview</CardTitle>
          {invoice.status && getStatusBadge(invoice.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex justify-between items-start">
            {/* Company Information */}
            <div className="space-y-2">
              {company?.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={`${company.businessName} logo`}
                  className="h-16 w-auto object-contain"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {company?.businessName || 'Your Company Name'}
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{company?.address || 'Company Address'}</p>
                  <p>
                    {company?.city || 'City'}, {company?.state || 'ST'} {company?.zipCode || '00000'}
                  </p>
                  <p>{company?.phone || 'Phone Number'}</p>
                  <p>{company?.email || 'email@company.com'}</p>
                  {company?.taxNumber && <p>Tax ID: {company.taxNumber}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Information */}
            <div className="text-right space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Invoice #:</span>{' '}
                  {invoice.invoiceNumber || 'INV-XXXX-XXXXXX'}
                </p>
                <p>
                  <span className="font-medium">Service Date:</span>{' '}
                  {invoice.serviceDate ? formatDate(invoice.serviceDate) : 'MM/DD/YYYY'}
                </p>
                <p>
                  <span className="font-medium">Due Date:</span>{' '}
                  {invoice.dueDate ? formatDate(invoice.dueDate) : 'MM/DD/YYYY'}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-900 space-y-1">
                <p className="font-medium text-base">
                  {customer?.name || 'Customer Name'}
                </p>
                <p>{customer?.address || 'Customer Address'}</p>
                <p>
                  {customer?.city || 'City'}, {customer?.state || 'ST'} {customer?.zipCode || '00000'}
                </p>
                <p>{customer?.email || 'customer@email.com'}</p>
                <p>{customer?.phone || 'Phone Number'}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Services & Materials:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.lineItems && invoice.lineItems.length > 0 ? (
                    invoice.lineItems.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.type === 'labor' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No line items added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(invoice.subtotal || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Tax ({((invoice.taxRate || 0) * 100).toFixed(1)}%):
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(invoice.taxAmount || 0)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">
                    {formatCurrency(invoice.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            {invoice.dueDate && (
              <p className="mt-1">
                Payment is due by {formatDate(invoice.dueDate)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}