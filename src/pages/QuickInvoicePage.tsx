import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AccountQuickInvoiceBuilder } from '../components/features/invoices/AccountQuickInvoiceBuilder'
import { loadFromLocalStorage } from '../utils/guestInvoiceStorage'

export const QuickInvoicePage: React.FC = () => {
  const location = useLocation()
  const [restored] = useState(() => {
    try {
      return {
        draft: (location.state as { importGuestDraft?: boolean } | null)
          ?.importGuestDraft
          ? loadFromLocalStorage()
          : null,
        error: '',
      }
    } catch (error) {
      return {
        draft: null,
        error:
          error instanceof Error
            ? error.message
            : 'Your saved draft could not be loaded.',
      }
    }
  })
  return (
    <div className="mx-auto max-w-7xl bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {restored.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {restored.error}{' '}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline"
          >
            Retry
          </button>
        </p>
      ) : (
        <AccountQuickInvoiceBuilder
          initialGuestData={restored.draft}
          autoSaveImportedDraft={restored.draft !== null}
        />
      )}
    </div>
  )
}
