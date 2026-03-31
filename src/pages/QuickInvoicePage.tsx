import React, { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { QuickInvoiceBuilder } from '../components/features/invoices/QuickInvoiceBuilder'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { Modal, ModalFooter } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { Download, FilePlus } from 'lucide-react'
import type { Invoice } from '../types/entities'
import type { GuestInvoiceData } from '../types/guest'
import { loadFromLocalStorage } from '../utils/guestInvoiceStorage'

/**
 * QuickInvoicePage component for creating invoices without saving company or customer details
 */
export const QuickInvoicePage: React.FC = () => {
  const location = useLocation()
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [previewCompany, setPreviewCompany] = useState<any>(null)
  const [previewCustomer, setPreviewCustomer] = useState<any>(null)
  const [builderKey, setBuilderKey] = useState(0) // forces QuickInvoiceBuilder remount on reset
  const printRef = useRef<HTMLDivElement>(null)
  const [initialGuestData] = useState<GuestInvoiceData | null>(() => {
    const shouldImportGuestDraft = Boolean((location.state as { importGuestDraft?: boolean } | null)?.importGuestDraft)
    return shouldImportGuestDraft ? loadFromLocalStorage() : null
  })

  const handleInvoiceSave = (invoice: Invoice, company: any, customer: any) => {
    setSelectedInvoice(invoice)
    setPreviewCompany(company)
    setPreviewCustomer(customer)
    setShowInvoicePreview(true)
  }

  const handlePreviewClose = () => {
    setShowInvoicePreview(false)
    setSelectedInvoice(null)
    setPreviewCompany(null)
    setPreviewCustomer(null)
  }

  const handleCreateNew = () => {
    handlePreviewClose()
    setBuilderKey((k) => k + 1) // remount builder to reset all form state
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <div className="animate-fade-in">
          <QuickInvoiceBuilder
            key={builderKey}
            onSave={handleInvoiceSave}
            initialGuestData={initialGuestData}
          />
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
              {/* Printable invoice area */}
              <div ref={printRef} id="printable-invoice">
                <InvoicePreview
                  invoice={selectedInvoice}
                  company={previewCompany}
                  customer={previewCustomer}
                />
              </div>

              {/* Action buttons — hidden from print via CSS */}
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
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </ResponsiveContainer>
    </div>
  )
}
