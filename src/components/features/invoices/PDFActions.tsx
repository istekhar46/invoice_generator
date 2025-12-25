/**
 * PDF Actions Component
 * Buttons for downloading and previewing invoice PDFs
 */

import React from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { usePDFGeneration } from '../../../hooks/usePDFGeneration'
import { useCompanyProfile } from '../../../hooks/useCompany'
import { transformCustomerResponse } from '../../../utils/apiTransformers'
import type { Invoice } from '../../../types/entities'

interface PDFActionsProps {
  invoice?: Invoice | any
  variant?: 'default' | 'compact'
  className?: string
  onError?: (error: string) => void
}

/**
 * PDF Actions Component
 */
export const PDFActions: React.FC<PDFActionsProps> = ({
  invoice,
  variant = 'default',
  className,
  onError,
}) => {
  const {
    isGenerating,
    error,
    downloadInvoicePDFDirect,
    previewInvoicePDFDirect,
    clearError,
  } = usePDFGeneration()

  // Get company profile
  const { data: companyProfile } = useCompanyProfile()
  
  // Extract customer from invoice response (API already includes it)
  // The customer is embedded in the invoice response from the API
  const customer = invoice?.customer 
    ? transformCustomerResponse(invoice.customer) 
    : null

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError?.(error)
      clearError()
    }
  }, [error, onError, clearError])

  const handleDownload = async () => {
    if (!invoice || !customer || !companyProfile) {
      onError?.('Missing required data for PDF generation')
      return
    }

    try {
      await downloadInvoicePDFDirect(invoice, customer, companyProfile)
    } catch (err) {
      // Error is handled by the hook and passed to onError
      console.error('PDF download failed:', err)
    }
  }

  const handlePreview = async () => {
    if (!invoice || !customer || !companyProfile) {
      onError?.('Missing required data for PDF generation')
      return
    }

    try {
      await previewInvoicePDFDirect(invoice, customer, companyProfile)
    } catch (err) {
      // Error is handled by the hook and passed to onError
      console.error('PDF preview failed:', err)
    }
  }

  const isDisabled = isGenerating || !invoice || !customer || !companyProfile

  if (variant === 'compact') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        <button
          onClick={handlePreview}
          disabled={isDisabled}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span>Preview PDF</span>
        </button>
        <button
          onClick={handleDownload}
          disabled={isDisabled}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Download PDF</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`flex space-x-3 ${className}`}>
      <Button
        variant="outline"
        onClick={handlePreview}
        disabled={isDisabled}
        className="flex items-center space-x-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        <span>Preview PDF</span>
      </Button>
      <Button
        onClick={handleDownload}
        disabled={isDisabled}
        className="flex items-center space-x-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>Download PDF</span>
      </Button>
    </div>
  )
}