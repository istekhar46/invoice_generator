import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuickInvoiceBuilder } from '../features/invoices/QuickInvoiceBuilder'
import { loadFromLocalStorage } from '../../utils/guestInvoiceStorage'

export const GuestInvoiceSection: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const navigate = useNavigate()
  const [initialDraft] = useState(loadFromLocalStorage)
  return (
    <section
      id="invoice-editor"
      className={`scroll-mt-24 bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}
      aria-label="Free invoice generator"
    >
      <div className="mx-auto max-w-7xl">
        <QuickInvoiceBuilder
          mode="guest"
          initialGuestData={initialDraft}
          onSignUp={() => navigate('/signup')}
        />
      </div>
    </section>
  )
}
