import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const invoiceIdParam = searchParams.get('id')

  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(
    searchParams.get('create') === 'true'
  )
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  const { data: companyProfile } = useCompanyProfile()
  const { data: directInvoiceDto } = useInvoice(invoiceIdParam || '')
  const { downloadInvoicePDFDirect, isGenerating } = usePDFGeneration()
  const { data: activeCustomer } = useCustomer(
    selectedInvoice?.customerId || editingInvoice?.customerId || ''
  )

  // Auto-open invoice preview when navigated with ?id=
  useEffect(() => {
    if (
      directInvoiceDto &&
      (!selectedInvoice || selectedInvoice.id !== directInvoiceDto.id)
    ) {
      setSelectedInvoice(transformInvoiceResponse(directInvoiceDto))
      setShowInvoicePreview(true)
    }
  }, [directInvoiceDto])

  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true'
    if (shouldCreate && !showInvoiceBuilder) {
      setEditingInvoice(null)
      setShowInvoiceBuilder(true)
    } else if (!shouldCreate && showInvoiceBuilder && !editingInvoice) {
      setShowInvoiceBuilder(false)
    }
  }, [editingInvoice, searchParams, showInvoiceBuilder])

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowInvoiceBuilder(true)
    setSearchParams({ create: 'true' }, { replace: true })
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowInvoiceBuilder(true)
  }

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowInvoicePreview(true)
  }

  const handleInvoiceSave = (invoice: Invoice) => {
    closeInvoiceBuilder()
    // Optionally show the newly created/updated invoice
    setSelectedInvoice(invoice)
    setShowInvoicePreview(true)
  }

  const closeInvoiceBuilder = () => {
    setShowInvoiceBuilder(false)
    setEditingInvoice(null)
    if (searchParams.has('create')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('create')
      setSearchParams(nextParams, { replace: true })
    }
  }

  const handlePreviewClose = () => {
    setShowInvoicePreview(false)
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
    if (!selectedInvoice || !activeCustomer || !companyProfile) return
    try {
      await downloadInvoicePDFDirect(selectedInvoice, activeCustomer, companyProfile)
    } catch {
      window.print()
    }
  }

  // Get customer data for the selected invoice

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
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
              <InvoiceBuilder
                invoice={editingInvoice}
                initialCustomer={editingInvoice ? activeCustomer : null}
                onSave={handleInvoiceSave}
              />
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
                  disabled={isGenerating || !activeCustomer || !companyProfile}
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
