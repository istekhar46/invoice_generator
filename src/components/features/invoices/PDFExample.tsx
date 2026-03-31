/**
 * PDF Example Component
 * Example component demonstrating PDF generation functionality
 */

import React, { useState } from 'react'
import { PDFActions } from './PDFActions'
import { ErrorAlert } from '../../ui/ErrorAlert'
import type { Invoice } from '../../../types/entities'

/**
 * Example invoice data for demonstration
 */
const exampleInvoice: Invoice = {
  id: 'example-invoice',
  userId: 'example-user',
  customerId: 'example-customer',
  invoiceNumber: 'INV-2024-001',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  lineItems: [
    {
      id: 'item-1',
      invoiceId: 'example-invoice',
      type: 'material',
      description: 'Copper wire',
      unit: 'mtr',
      quantity: 1,
      rate: 500,
      amount: 500
    },
    {
      id: 'item-2',
      invoiceId: 'example-invoice',
      type: 'material',
      description: 'Circuit breaker panel',
      unit: 'bundle',
      quantity: 1,
      rate: 200,
      amount: 200
    }
  ],
  subtotal: 700,
  taxRate: 0.08,
  taxAmount: 56,
  total: 756,
  notes: 'Installation includes 2-year warranty on all parts and labor.',
  status: 'sent',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15')
}

/**
 * PDF Example Component
 */
export const PDFExample: React.FC = () => {
  const [error, setError] = useState<string | null>(null)

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          PDF Generation Example
        </h2>
        <p className="text-gray-600">
          This example demonstrates the PDF generation functionality for invoices.
        </p>
      </div>

      {error && (
        <ErrorAlert
          message={error}
          onDismiss={clearError}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sample Invoice: {exampleInvoice.invoiceNumber}
        </h3>
        
        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <div className="flex justify-between">
            <span>Service Date:</span>
            <span>{exampleInvoice.serviceDate.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Due Date:</span>
            <span>{exampleInvoice.dueDate.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="capitalize">{exampleInvoice.status}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total:</span>
            <span>${exampleInvoice.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 mb-4">
            Use the buttons below to preview or download the PDF for this sample invoice.
            Note: You'll need to set up your company profile first for the PDF to generate properly.
          </p>
          
          <PDFActions
            invoice={exampleInvoice}
            onError={handleError}
            className="justify-center"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Integration Notes:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• PDF generation requires company profile to be set up</li>
          <li>• Customer information must exist for the invoice</li>
          <li>• Line items are required for PDF generation</li>
          <li>• PDFs include company branding, customer details, and professional formatting</li>
        </ul>
      </div>
    </div>
  )
}
