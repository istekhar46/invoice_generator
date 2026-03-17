/**
 * Guest Invoice Section Component
 * Landing page section for guest invoice creation feature
 * Displays CTA and toggles the invoice builder
 */

import React, { useState } from 'react'
import { GuestInvoiceBuilder } from './GuestInvoiceBuilder'
import { Button } from '../ui/Button'
import { FileText, Zap, Download, Shield } from 'lucide-react'

interface GuestInvoiceSectionProps {
  className?: string
}

export const GuestInvoiceSection: React.FC<GuestInvoiceSectionProps> = ({
  className = '',
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  const handleOpenBuilder = () => {
    setIsBuilderOpen(true)
  }

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false)
  }

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
      <section className={`bg-gradient-to-br from-blue-50 to-indigo-50 py-20 px-6 ${className}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Try It Free - No Sign Up Required
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create a professional invoice right now. No account needed. Just fill in the details and download your PDF.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {features.map((feature) => {
              const IconComponent = feature.icon
              return (
                <div key={feature.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
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
              No credit card required • Takes less than 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Modal Overlay */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <GuestInvoiceBuilder onClose={handleCloseBuilder} />
          </div>
        </div>
      )}
    </>
  )
}
