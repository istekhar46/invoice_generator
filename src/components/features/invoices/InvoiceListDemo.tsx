/**
 * Invoice List Demo Component
 * Demonstrates the enhanced invoice list with PDF actions
 */

import React from 'react'
import { InvoiceList } from './InvoiceList'
import type { Invoice } from '../../../types/entities'

/**
 * Demo component showing the enhanced invoice list
 */
export const InvoiceListDemo: React.FC = () => {
  const handleInvoiceSelect = (invoice: Invoice) => {
    console.log('Selected invoice:', invoice.invoiceNumber)
  }

  const handleInvoiceEdit = (invoice: Invoice) => {
    console.log('Edit invoice:', invoice.invoiceNumber)
  }

  const handleCreateInvoice = () => {
    console.log('Create new invoice')
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced Invoice List
        </h1>
        <p className="text-gray-600">
          The invoice list now includes comprehensive actions in the three-dots menu:
        </p>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li>• <strong>PDF Actions:</strong> Preview and download invoice PDFs</li>
          <li>• <strong>Invoice Actions:</strong> Edit invoice details</li>
          <li>• <strong>Status Changes:</strong> Mark as draft, sent, or paid</li>
          <li>• <strong>Delete:</strong> Remove invoice (with confirmation)</li>
        </ul>
      </div>

      <InvoiceList
        onInvoiceSelect={handleInvoiceSelect}
        onInvoiceEdit={handleInvoiceEdit}
        onCreateInvoice={handleCreateInvoice}
      />
    </div>
  )
}