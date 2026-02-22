/**
 * PDF Test Component
 * Simple component to test PDF generation functionality
 */

import React, { useState } from 'react'
import { Button } from '../../ui/Button'
import { ErrorAlert } from '../../ui/ErrorAlert'
import { pdfGeneratorService } from '../../../services/pdf'
import type { Invoice, CompanyProfile, Customer } from '../../../types/entities'

/**
 * Test data for PDF generation
 */
const testCompany: CompanyProfile = {
  id: 'test-company',
  userId: 'test-user',
  businessName: 'Test Electric Co.',
  address: '123 Main Street',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  phone: '(555) 123-4567',
  email: 'test@electric.com',
  taxNumber: 'TAX123456',
  defaultTaxRate: 0.08,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const testCustomer: Customer = {
  id: 'test-customer',
  userId: 'test-user',
  name: 'Test Customer',
  email: 'customer@test.com',
  phone: '(555) 987-6543',
  address: '456 Oak Avenue',
  city: 'Customer City',
  state: 'CS',
  zipCode: '67890',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const testInvoice: Invoice = {
  id: 'test-invoice',
  userId: 'test-user',
  customerId: 'test-customer',
  invoiceNumber: 'INV-2024-TEST',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  lineItems: [
    {
      id: 'item-1',
      invoiceId: 'test-invoice',
      type: 'labor',
      description: 'Electrical panel installation',
      quantity: 1,
      rate: 500,
      amount: 500,
    },
    {
      id: 'item-2',
      invoiceId: 'test-invoice',
      type: 'material',
      description: 'Circuit breaker panel',
      quantity: 1,
      rate: 200,
      amount: 200,
    },
  ],
  subtotal: 700,
  taxRate: 0.08,
  taxAmount: 56,
  total: 756,
  notes: 'Test invoice for PDF generation',
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
}

/**
 * PDF Test Component
 */
export const PDFTestComponent: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  const handleTestPDF = async (action: 'download' | 'preview') => {
    setIsGenerating(true)
    clearMessages()

    try {
      const pdfBlob = await pdfGeneratorService.generateInvoicePDF(
        testInvoice,
        testCompany,
        testCustomer
      )

      if (action === 'download') {
        pdfGeneratorService.downloadPDF(pdfBlob, 'test-invoice.pdf')
        setSuccess('PDF downloaded successfully!')
      } else {
        pdfGeneratorService.previewPDF(pdfBlob)
        setSuccess('PDF opened in new tab!')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PDF generation failed'
      setError(errorMessage)
      console.error('PDF generation error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          PDF Generation Test
        </h2>
        <p className="text-gray-600">
          Test the PDF generation functionality with sample data.
        </p>
      </div>

      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex justify-between items-start">
            <p className="text-sm text-green-600">
              {success}
            </p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600"
            >
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Test Invoice: {testInvoice.invoiceNumber}
        </h3>
        
        <div className="space-y-3 text-sm text-gray-600 mb-6">
          <div className="flex justify-between">
            <span>Company:</span>
            <span>{testCompany.businessName}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{testCustomer.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Line Items:</span>
            <span>{testInvoice.lineItems.length} items</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total:</span>
            <span>${testInvoice.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex space-x-3 justify-center">
          <Button
            variant="outline"
            onClick={() => handleTestPDF('preview')}
            disabled={isGenerating}
            loading={isGenerating}
          >
            Preview PDF
          </Button>
          <Button
            onClick={() => handleTestPDF('download')}
            disabled={isGenerating}
            loading={isGenerating}
          >
            Download PDF
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Test Notes:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• This test uses sample data and doesn't require a company profile</li>
          <li>• Uses built-in fonts to avoid browser compatibility issues</li>
          <li>• Tests the core PDF generation functionality</li>
          <li>• Check browser console for any errors</li>
        </ul>
      </div>
    </div>
  )
}