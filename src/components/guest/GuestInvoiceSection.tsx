import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuickInvoiceBuilder } from '../features/invoices/QuickInvoiceBuilder'
import { loadFromLocalStorage } from '../../utils/guestInvoiceStorage'

export const GuestInvoiceSection: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const navigate = useNavigate()
  const [restored] = useState(() => {
    try {
      return { draft: loadFromLocalStorage(), error: '' }
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
    <section
      id="invoice-editor"
      className={`scroll-mt-24 bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}
      aria-label="Free invoice generator"
    >
      <div className="mx-auto max-w-7xl">
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
          <QuickInvoiceBuilder
            mode="guest"
            initialGuestData={restored.draft}
            onSignUp={() => navigate('/signup')}
          />
        )}
      </div>
    </section>
  )
}
