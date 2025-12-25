import React, { useState } from 'react'
import { InvoiceList } from '../components/features/invoices/InvoiceList'
import { InvoiceBuilder } from '../components/features/invoices/InvoiceBuilder'
import { InvoicePreview } from '../components/features/invoices/InvoicePreview'
import { Modal } from '../components/ui/Modal'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'
import { useCompanyProfile } from '../hooks/useCompany'
import { useCustomer } from '../hooks/useCustomers'
import { transformCustomerResponse } from '../utils/apiTransformers'
import type { Invoice } from '../types/entities'

/**
 * InvoicesPage component for managing invoices with modern design.
 * 
 * Requirements: 4.9 - WHEN a user views the invoice list, THE System SHALL display all invoices sorted by creation date
 */
export const InvoicesPage: React.FC = () => {
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  const { data: companyProfile } = useCompanyProfile()
  const { data: customerDto } = useCustomer(selectedInvoice?.customerId || '')
  
  // Transform customer DTO to frontend Customer type
  const selectedCustomer = customerDto ? transformCustomerResponse(customerDto) : null

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowInvoiceBuilder(true)
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
    setShowInvoiceBuilder(false)
    setEditingInvoice(null)
    // Optionally show the newly created/updated invoice
    setSelectedInvoice(invoice)
    setShowInvoicePreview(true)
  }

  const handleInvoiceBuilderCancel = () => {
    setShowInvoiceBuilder(false)
    setEditingInvoice(null)
  }

  const handlePreviewClose = () => {
    setShowInvoicePreview(false)
    setSelectedInvoice(null)
  }

  // Get customer data for the selected invoice

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <div className="animate-fade-in">
          <InvoiceList
            onCreateInvoice={handleCreateInvoice}
            onInvoiceEdit={handleEditInvoice}
            onInvoiceSelect={handleInvoiceSelect}
          />
        </div>

        {/* Invoice Builder Modal */}
        <Modal
          open={showInvoiceBuilder}
          onClose={handleInvoiceBuilderCancel}
          title={editingInvoice ? `Edit Invoice ${editingInvoice.invoiceNumber}` : "Create New Invoice"}
          size="large"
        >
          <InvoiceBuilder
            invoice={editingInvoice}
            onSave={handleInvoiceSave}
            onCancel={handleInvoiceBuilderCancel}
          />
        </Modal>

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
              company={companyProfile}
              customer={selectedCustomer}
            />
          )}
        </Modal>
      </ResponsiveContainer>
    </div>
  )
}