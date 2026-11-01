import React from 'react'
import type { GuestInvoiceData } from '../../types/guest'
import { guestDocument } from '../../utils/invoiceDocument'
import { InvoicePDFTemplate } from '../../services/pdf/InvoicePDFTemplate'

/** Guest and saved invoices share the same PDF layout and calculation contract. */
export const GuestInvoicePDFTemplate: React.FC<{
  data: GuestInvoiceData
  invoiceNumber: string
}> = ({ data, invoiceNumber }) => (
  <InvoicePDFTemplate invoice={guestDocument(data, invoiceNumber)} />
)
