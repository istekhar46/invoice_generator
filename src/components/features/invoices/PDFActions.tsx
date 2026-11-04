/**
 * PDF Actions Component
 * Buttons for downloading and previewing invoice PDFs
 */

import React from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { usePDFGeneration } from '../../../hooks/usePDFGeneration'
import { useCompanyProfile } from '../../../hooks/useCompany'
import type { Invoice } from '../../../types/entities'
import { invoiceApi } from '../../../services/api/invoiceApi'
import { transformInvoiceResponse } from '../../../utils/apiTransformers'

interface PDFActionsProps {
  invoice?: Invoice
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
  const [isFetching, setIsFetching] = React.useState(false)
  const {
    isGenerating,
    error,
    downloadInvoicePDFDirect,
    previewInvoicePDFDirect,
    clearError,
  } = usePDFGeneration()

  // Get company profile
  const { data: companyProfile } = useCompanyProfile()

  const customer = invoice?.customer || null
  const hasDocumentData =
    !!invoice && (invoice.isQuickInvoice || (!!customer && !!companyProfile))

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError?.(error)
      clearError()
    }
  }, [error, onError, clearError])

  const handleDownload = async () => {
    if (!invoice || !hasDocumentData) {
      onError?.('Missing required data for PDF generation')
      return
    }

    try {
      setIsFetching(true)
      const current = transformInvoiceResponse(
        await invoiceApi.getInvoice(invoice.id)
      )
      await downloadInvoicePDFDirect(
        current,
        current.customer || customer,
        companyProfile
      )
    } catch (err) {
      onError?.(
        err instanceof Error
          ? err.message
          : 'Could not load the current invoice.'
      )
    } finally {
      setIsFetching(false)
    }
  }

  const handlePreview = async () => {
    if (!invoice || !hasDocumentData) {
      onError?.('Missing required data for PDF generation')
      return
    }

    try {
      setIsFetching(true)
      const current = transformInvoiceResponse(
        await invoiceApi.getInvoice(invoice.id)
      )
      await previewInvoicePDFDirect(
        current,
        current.customer || customer,
        companyProfile
      )
    } catch (err) {
      onError?.(
        err instanceof Error
          ? err.message
          : 'Could not load the current invoice.'
      )
    } finally {
      setIsFetching(false)
    }
  }

  const isDisabled = isFetching || isGenerating || !invoice || !hasDocumentData

  if (variant === 'compact') {
    return (
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={event => {
            event.stopPropagation()
            void handleDownload()
          }}
          disabled={isDisabled}
          className={`text-primary-600 hover:text-primary-700 ${className || ''}`}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          <span>Download PDF</span>
        </Button>
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
