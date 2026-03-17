/**
 * Review Step Component
 * Final step in guest invoice wizard - review and download
 */

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FormActions } from '../ui/FormField'
import type { GuestInvoiceData } from '../../types/guest'
import { InvoiceCalculationService } from '../../services/invoiceCalculation.service'
import { generateAndDownloadPDF, generateAndPreviewPDF } from '../../utils/guestPDFGeneration'
import { Download, Eye, Edit, UserPlus, Package, Wrench } from 'lucide-react'

interface ReviewStepProps {
  data: GuestInvoiceData
  onBack: () => void
  onEdit: (step: number) => void
  onSignUp: () => void
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  data,
  onBack,
  onEdit,
  onSignUp,
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totals = InvoiceCalculationService.calculateInvoiceTotals(
    data.lineItems,
    data.invoiceDetails.taxRate
  )

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      await generateAndDownloadPDF(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      await generateAndPreviewPDF(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card padding='none'>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Review & Save</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Review the invoice and save
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Invoice Preview */}
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            {/* Company Section */}
            {data.company?.businessName && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{data.company.businessName}</h3>
                    {data.company.address && <p className="text-sm text-gray-600">{data.company.address}</p>}
                    {(data.company.city || data.company.state || data.company.zipCode) && (
                      <p className="text-sm text-gray-600">
                        {[data.company.city, data.company.state, data.company.zipCode].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {data.company.phone && <p className="text-sm text-gray-600">Phone: {data.company.phone}</p>}
                    {data.company.email && <p className="text-sm text-gray-600">Email: {data.company.email}</p>}
                  </div>
                  <button
                    onClick={() => onEdit(0)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Customer and Invoice Details */}
            <div className="p-6 grid md:grid-cols-2 gap-6 border-b border-gray-200">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase">Bill To</h4>
                  <button
                    onClick={() => onEdit(1)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>
                <p className="font-semibold text-gray-900">{data.customer.name}</p>
                {data.customer.address && <p className="text-sm text-gray-600">{data.customer.address}</p>}
                {(data.customer.city || data.customer.state || data.customer.zipCode) && (
                  <p className="text-sm text-gray-600">
                    {[data.customer.city, data.customer.state, data.customer.zipCode].filter(Boolean).join(', ')}
                  </p>
                )}
                {data.customer.phone && <p className="text-sm text-gray-600">Phone: {data.customer.phone}</p>}
                {data.customer.email && <p className="text-sm text-gray-600">Email: {data.customer.email}</p>}
              </div>

              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase">Invoice Details</h4>
                  <button
                    onClick={() => onEdit(2)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>
                <p className="text-sm text-gray-600">Service Date: {formatDate(data.invoiceDetails.serviceDate)}</p>
                <p className="text-sm text-gray-600">Due Date: {formatDate(data.invoiceDetails.dueDate)}</p>
                <p className="text-sm text-gray-600">Tax Rate: {(data.invoiceDetails.taxRate * 100).toFixed(2)}%</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase">Line Items</h4>
                <button
                  onClick={() => onEdit(3)}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                {data.lineItems.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {item.type === 'material' ? (
                          <Package className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Wrench className="w-4 h-4 text-green-600" />
                        )}
                        <span className="font-medium text-gray-900">{item.description}</span>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">
                        {item.quantity} × {formatCurrency(item.rate)}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="p-6 bg-gray-50">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Tax ({(data.invoiceDetails.taxRate * 100).toFixed(2)}%):</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-300">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-blue-600">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="p-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleDownload}
                loading={isGenerating}
                fullWidth
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePreview}
                loading={isGenerating}
                fullWidth
              >
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </Button>
            </div>

            {/* Sign Up CTA */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Want to save this invoice?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Sign up to save your invoices, track payments, and manage customers
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={onSignUp}
                fullWidth
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Sign Up to Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <FormActions align="left" responsive={false}>
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
        >
          Back to Edit
        </Button>
      </FormActions>
    </div>
  )
}
