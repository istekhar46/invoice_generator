import React, { useState } from 'react'
import { QuickInvoiceBuilder } from '../components/features/invoices/QuickInvoiceBuilder'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { Modal } from '../components/ui/Modal'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import type { Invoice } from '../types/entities'

/**
 * QuickInvoicePage component for creating invoices without saving company or customer details
 */
export const QuickInvoicePage: React.FC = () => {
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [previewCompany, setPreviewCompany] = useState<any>(null)
  const [previewCustomer, setPreviewCustomer] = useState<any>(null)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <div className="animate-fade-in">
          <QuickInvoiceBuilder onSave={handleInvoiceSave} />
        </div>

        {/* Invoice Preview Modal */}
        <Modal
          open={showInvoicePreview}
          onClose={handlePreviewClose}
          title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
          size="large"
        >
          {selectedInvoice && (
            <InvoicePreview
              invoice={selectedInvoice}
              company={previewCompany}
              customer={previewCustomer}
            />
          )}
        </Modal>
      </ResponsiveContainer>
    </div>
  )
}
