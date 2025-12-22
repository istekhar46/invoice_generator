/**
 * Invoice Builder Usage Example
 * Demonstrates how to use the InvoiceBuilder component
 */

import React, { useState } from 'react'
import { InvoiceBuilder } from './InvoiceBuilder'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import type { Invoice } from '../../../types/entities'

export const InvoiceBuilderExample: React.FC = () => {
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  const handleCreateInvoice = () => {
    setEditingInvoice(null)
    setShowBuilder(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowBuilder(true)
  }

  const handleSaveInvoice = (invoice: Invoice) => {
    console.log('Invoice saved:', invoice)
    setShowBuilder(false)
    setEditingInvoice(null)
    // Here you would typically update your invoice list or navigate to the invoice view
  }

  const handleCancelBuilder = () => {
    setShowBuilder(false)
    setEditingInvoice(null)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Invoice Builder Example
        </h1>
        <p className="text-gray-600 mb-6">
          This example demonstrates how to use the InvoiceBuilder component for creating and editing invoices.
        </p>
        
        <div className="space-x-4">
          <Button onClick={handleCreateInvoice}>
            Create New Invoice
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              // Example: Edit an existing invoice
              // In a real app, this would come from your invoice list
              const exampleInvoice: Partial<Invoice> = {
                id: 'example-invoice-1',
                invoiceNumber: 'INV-2024-001',
                customerId: 'customer-1',
                serviceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                lineItems: [],
                subtotal: 0,
                taxRate: 0.08,
                taxAmount: 0,
                total: 0,
                status: 'draft',
              }
              handleEditInvoice(exampleInvoice as Invoice)
            }}
          >
            Edit Example Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Builder Modal */}
      <Modal
        open={showBuilder}
        onClose={handleCancelBuilder}
        title={editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
        size="large"
      >
        <InvoiceBuilder
          invoice={editingInvoice}
          onSave={handleSaveInvoice}
          onCancel={handleCancelBuilder}
        />
      </Modal>

      {/* Usage Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          How to Use the Invoice Builder
        </h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-medium text-gray-900">Step 1: Select Customer</h3>
            <p>Choose the customer for this invoice from your customer list. You can search and filter customers.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Step 2: Invoice Details</h3>
            <p>Set the service date, due date, tax rate, and any additional notes for the invoice.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Step 3: Line Items</h3>
            <p>Add materials and labor charges. The totals will be calculated automatically as you add items.</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Step 4: Review & Save</h3>
            <p>Review the complete invoice preview and save when everything looks correct.</p>
          </div>
        </div>
      </div>
    </div>
  )
}