import { AccountQuickInvoiceBuilder } from '../components/features/invoices/AccountQuickInvoiceBuilder'
import { CompanySetupGuard } from '../components/guards/CompanySetupGuard'
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InvoiceList } from '../components/features/invoices/InvoiceList'
import { InvoiceBuilder } from '../components/features/invoices/InvoiceBuilder'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { Modal, ModalFooter } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { useCompanyProfile } from '../hooks/useCompany'
import { useCustomer } from '../hooks/useCustomers'
import { useInvoice } from '../hooks/useInvoices'
import { invoiceApi } from '../services/api/invoiceApi'
import { InvoicePaymentPanel } from '../components/features/payments/InvoicePaymentPanel'
import { InvoiceSharePanel } from '../components/features/invoices/InvoiceSharePanel'
import { usePDFGeneration } from '../hooks/usePDFGeneration'
import { transformInvoiceResponse } from '../utils/apiTransformers'
import type { Invoice } from '../types/entities'
import { ArrowLeft, Download, FilePlus } from 'lucide-react'

/**
 * InvoicesPage component for managing invoices with modern design.
 *
 * Requirements: 4.9 - WHEN a user views the invoice list, THE System SHALL display all invoices sorted by creation date
 */
export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const invoiceIdParam = searchParams.get('id')

  const [localSelection, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceToEdit, setEditingInvoice] = useState<Invoice | null>(null)
  const shouldCreate = searchParams.get('create') === 'true'
  const editingInvoice = shouldCreate ? null : invoiceToEdit
  const showInvoiceBuilder = shouldCreate || !!editingInvoice

  const { data: companyProfile } = useCompanyProfile()
  const selectedId = invoiceIdParam || localSelection?.id || ''
  const detail = useInvoice(selectedId, { staleTime: 0 })
  const selectedInvoice = detail.data
    ? transformInvoiceResponse(detail.data)
    : localSelection?.id === selectedId
      ? localSelection
      : null
  const showInvoicePreview = !!selectedId
  const refreshingInvoice = detail.isPending || detail.isFetching
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<{
    id: string
    message: string
  } | null>(null)
  const {
    downloadInvoicePDFDirect,
    isGenerating,
    error: pdfError,
  } = usePDFGeneration()
  const { data: activeCustomer } = useCustomer(
    selectedInvoice?.customerId || editingInvoice?.customerId || ''
  )

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setSearchParams({ create: 'true' }, { replace: true })
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
  }

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handleInvoiceSave = (invoice: Invoice) => {
    closeInvoiceBuilder()
    // Optionally show the newly created/updated invoice
    setSelectedInvoice(invoice)
  }

  const closeInvoiceBuilder = () => {
    setEditingInvoice(null)
    if (searchParams.has('create')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('create')
      setSearchParams(nextParams, { replace: true })
    }
  }

  const handlePreviewClose = () => {
    setSelectedInvoice(null)
    if (searchParams.has('id')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('id')
      setSearchParams(nextParams, { replace: true })
    }
  }

  const handleCreateNew = () => {
    handlePreviewClose()
    handleCreateInvoice()
  }

  const handleDownloadPdf = async () => {
    if (!selectedInvoice || isDownloading) return
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const current = transformInvoiceResponse(
        await invoiceApi.getInvoice(selectedInvoice.id)
      )
      await downloadInvoicePDFDirect(
        current,
        current.customer || activeCustomer,
        companyProfile
      )
    } catch (error) {
      setDownloadError({
        id: selectedInvoice.id,
        message:
          error instanceof Error
            ? error.message
            : 'Could not load the current invoice.',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Get customer data for the selected invoice

  return (
    <div className="min-w-0 bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md">
        <div className="animate-fade-in">
          {showInvoiceBuilder ? (
            <div className="space-y-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeInvoiceBuilder}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
              {editingInvoice?.isQuickInvoice ? (
                <AccountQuickInvoiceBuilder
                  key={editingInvoice.id}
                  invoice={editingInvoice}
                  onSave={handleInvoiceSave}
                />
              ) : (
                <CompanySetupGuard>
                  <InvoiceBuilder
                    invoice={editingInvoice}
                    initialCustomer={editingInvoice ? activeCustomer : null}
                    onSave={handleInvoiceSave}
                    onAddCustomer={() => navigate('/customers')}
                  />
                </CompanySetupGuard>
              )}
            </div>
          ) : (
            <InvoiceList
              onCreateInvoice={handleCreateInvoice}
              onInvoiceEdit={handleEditInvoice}
              onInvoiceSelect={handleInvoiceSelect}
            />
          )}
        </div>

        {/* Invoice Preview Modal */}
        <Modal
          open={showInvoicePreview}
          onClose={handlePreviewClose}
          title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
          size="large"
        >
          {refreshingInvoice && (
            <p role="status" className="mb-4 text-sm text-slate-500">
              Updating invoice details…
            </p>
          )}
          {detail.error && (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {detail.error.message}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void detail.refetch()}
              >
                Retry invoice
              </button>
            </p>
          )}
          {selectedInvoice && !detail.error && (
            <>
              <InvoiceSharePanel
                key={selectedInvoice.id}
                invoice={selectedInvoice}
                refreshing={!!refreshingInvoice}
              />
              <InvoicePaymentPanel
                invoice={selectedInvoice}
                refreshing={!!refreshingInvoice}
              />
              <div id="printable-invoice">
                <InvoicePreview
                  invoice={
                    refreshingInvoice
                      ? {
                          ...selectedInvoice,
                          paymentUrl: null,
                          directUpi: null,
                        }
                      : selectedInvoice
                  }
                  company={companyProfile}
                  customer={activeCustomer}
                />
              </div>
              {(pdfError || downloadError?.id === selectedId) && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                  {downloadError?.id === selectedId
                    ? downloadError.message
                    : pdfError}
                </p>
              )}
              <ModalFooter className="no-print mt-6 flex-wrap gap-3 justify-between sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateNew}
                  className="flex items-center gap-2"
                >
                  <FilePlus className="h-4 w-4" />
                  Create New Invoice
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={
                    isDownloading ||
                    isGenerating ||
                    refreshingInvoice ||
                    (!selectedInvoice.isQuickInvoice &&
                      (!activeCustomer || !companyProfile))
                  }
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating || isDownloading
                    ? 'Generating PDF...'
                    : 'Download PDF'}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </ResponsiveContainer>
    </div>
  )
}
