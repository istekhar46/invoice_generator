import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { QuickInvoiceBuilder } from '../components/features/invoices/QuickInvoiceBuilder'
import { loadFromLocalStorage } from '../utils/guestInvoiceStorage'

export const QuickInvoicePage: React.FC = () => {
  const location = useLocation()
  const [draft] = useState(() =>
    (location.state as { importGuestDraft?: boolean } | null)?.importGuestDraft
      ? loadFromLocalStorage()
      : null
  )
  return (
    <div className="mx-auto max-w-7xl bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <QuickInvoiceBuilder
        initialGuestData={draft}
        autoSaveImportedDraft={draft !== null}
      />
    </div>
  )
}
