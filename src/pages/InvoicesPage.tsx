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
  const { data: directInvoiceDto } = useInvoice(invoiceIdParam || '')
  const selectedInvoice = invoiceIdParam
    ? directInvoiceDto
      ? transformInvoiceResponse(directInvoiceDto)
      : null
    : localSelection
  const showInvoicePreview = !!selectedInvoice
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
    if (!selectedInvoice) return
    try {
      await downloadInvoicePDFDirect(
        selectedInvoice,
        activeCustomer,
        companyProfile
      )
    } catch {
      // The PDF hook exposes the error below; keep the invoice open for retry.
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
          {selectedInvoice && (
            <>
              <div id="printable-invoice">
                <InvoicePreview
                  invoice={selectedInvoice}
                  company={companyProfile}
                  customer={activeCustomer}
                />
              </div>
              {pdfError && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                  {pdfError}
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
                    isGenerating ||
                    (!selectedInvoice.isQuickInvoice &&
                      (!activeCustomer || !companyProfile))
                  }
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </ResponsiveContainer>
    </div>
  )
}
