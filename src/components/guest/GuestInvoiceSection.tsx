/**
 * Guest Invoice Section Component
 * Landing page section for guest invoice creation feature
 * Displays CTA and toggles the invoice builder
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QuickInvoiceBuilder } from '../features/invoices/QuickInvoiceBuilder'
import { Button } from '../ui/Button'
import { FileText, Zap, Download, Shield, X } from 'lucide-react'
import { loadFromLocalStorage } from '../../utils/guestInvoiceStorage'
import type { GuestInvoiceData } from '../../types/guest'

interface GuestInvoiceSectionProps {
  className?: string
}

export const GuestInvoiceSection: React.FC<GuestInvoiceSectionProps> = ({
  className = '',
}) => {
  const navigate = useNavigate()
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<GuestInvoiceData | null>(null)

  const handleOpenBuilder = () => {
    setInitialDraft(loadFromLocalStorage())
    setIsBuilderOpen(true)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
  }

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false)
    // Restore body scroll when modal is closed
    document.body.style.overflow = 'unset'
  }

  const handleSignUp = () => {
    handleCloseBuilder()
    navigate('/signup')
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBuilderOpen) {
        handleCloseBuilder()
      }
    }

    if (isBuilderOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isBuilderOpen])

  const features = [
    {
      icon: Zap,
      title: 'Instant Creation',
      description: 'Create professional invoices in minutes without signing up',
    },
    {
      icon: Download,
      title: 'Download PDF',
      description: 'Get a beautifully formatted PDF ready to send',
    },
    {
      icon: Shield,
      title: 'Auto-Save Draft',
      description: 'Your work is automatically saved as you go',
    },
  ]

  return (
    <>
      <section className={`bg-linear-to-br from-blue-50 to-indigo-50 py-10 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8 ${className}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-12">
            {/* <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div> */}
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Try It For Free
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create a professional invoice right now. No account needed. Just fill in the details and download your PDF.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-8 mb-6 sm:mb-12">
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <div key={feature.title} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start space-x-4">
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleOpenBuilder}
              className="hover:scale-105 transition-transform"
            >
              <FileText className="w-5 h-5 mr-2" />
              Create Free Invoice Now
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              No sign-up required • Takes less than 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Modal Overlay */}
      {isBuilderOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-9999 flex items-start justify-center p-4 overflow-y-auto animate-fade-in"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              handleCloseBuilder()
            }
          }}
        >
          <div className="w-full max-w-6xl my-2 sm:my-8 relative animate-slide-up bg-white rounded-2xl shadow-xl p-4 sm:p-8">
            <button
              type="button"
              onClick={handleCloseBuilder}
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close invoice builder"
            >
              <X className="h-5 w-5" />
            </button>
            <QuickInvoiceBuilder
              mode="guest"
              initialGuestData={initialDraft}
              onSignUp={handleSignUp}
              className="pt-8 sm:pt-4"
            />
          </div>
        </div>
      )}
    </>
  )
}
