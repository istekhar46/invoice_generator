/**
 * Guest Invoice Builder Component
 * Main orchestrator for the guest invoice creation wizard
 * Manages step navigation, data flow, and user actions
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGuestInvoice } from '../../hooks/useGuestInvoice'
import { useWizardStep } from '../../hooks/useWizardStep'
import { StepIndicator } from './StepIndicator'
import { CompanyDetailsStep } from './CompanyDetailsStep'
import { CustomerDetailsStep } from './CustomerDetailsStep'
import { InvoiceDetailsStep } from './InvoiceDetailsStep'
import { LineItemsStep } from './LineItemsStep'
import { ReviewStep } from './ReviewStep'
import { Button } from '../ui/Button'
import { X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { GuestCompanyDetails, GuestCustomerDetails, GuestInvoiceDetails, GuestLineItem } from '../../types/guest'

interface GuestInvoiceBuilderProps {
  onClose?: () => void
  className?: string
}

export const GuestInvoiceBuilder: React.FC<GuestInvoiceBuilderProps> = ({
  onClose,
  className = '',
}) => {
  const navigate = useNavigate()
  const { data, updateData, clearData, isLoading: isLoadingData } = useGuestInvoice()
  const { currentStep, goToNextStep, goToPreviousStep, goToStep } = useWizardStep(data)
  
  const [showDraftNotification, setShowDraftNotification] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isGeneratingPDF] = useState(false)

  // Show draft restoration notification on mount if data exists
  useEffect(() => {
    if (data && !isLoadingData) {
      setShowDraftNotification(true)
      const timer = setTimeout(() => setShowDraftNotification(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [data, isLoadingData])

  // Handle company details step
  const handleCompanyNext = (companyData: GuestCompanyDetails | null) => {
    updateData({ company: companyData })
    goToNextStep()
  }

  const handleCompanySkip = () => {
    updateData({ company: null })
    goToNextStep()
  }

  // Handle customer details step
  const handleCustomerNext = (customerData: GuestCustomerDetails) => {
    updateData({ customer: customerData })
    goToNextStep()
  }

  // Handle invoice details step
  const handleInvoiceDetailsNext = (invoiceDetails: GuestInvoiceDetails) => {
    updateData({ invoiceDetails })
    goToNextStep()
  }

  // Handle line items step
  const handleLineItemsNext = (lineItems: GuestLineItem[]) => {
    updateData({ lineItems })
    goToNextStep()
  }

  // Handle edit action from review step
  const handleEdit = (stepIndex: number) => {
    const steps = ['company', 'customer', 'details', 'items', 'review'] as const
    if (stepIndex >= 0 && stepIndex < steps.length) {
      goToStep(steps[stepIndex])
    }
  }

  // Handle sign up action
  const handleSignUp = () => {
    // Navigate to signup page - draft data will be preserved in localStorage
    navigate('/signup')
  }

  // Handle clear draft
  const handleClearDraft = () => {
    if (window.confirm('Are you sure you want to clear your draft? This action cannot be undone.')) {
      clearData()
      goToStep('company')
      setShowDraftNotification(false)
      setShowSuccessMessage(false)
      setErrorMessage(null)
    }
  }

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  // Dismiss notifications
  const dismissSuccess = () => setShowSuccessMessage(false)
  const dismissError = () => setErrorMessage(null)

  // Render current step
  const renderStep = () => {
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )
    }

    switch (currentStep) {
      case 'company':
        return (
          <CompanyDetailsStep
            data={data?.company ?? null}
            onNext={handleCompanyNext}
            onSkip={handleCompanySkip}
          />
        )
      
      case 'customer':
        return (
          <CustomerDetailsStep
            data={data?.customer ?? null}
            onNext={handleCustomerNext}
            onBack={goToPreviousStep}
          />
        )
      
      case 'details':
        return (
          <InvoiceDetailsStep
            data={data?.invoiceDetails ?? null}
            onNext={handleInvoiceDetailsNext}
            onBack={goToPreviousStep}
          />
        )
      
      case 'items':
        return (
          <LineItemsStep
            data={data?.lineItems ?? []}
            taxRate={data?.invoiceDetails?.taxRate ?? 0}
            onNext={handleLineItemsNext}
            onBack={goToPreviousStep}
          />
        )
      
      case 'review':
        return (
          <ReviewStep
            data={data}
            onBack={goToPreviousStep}
            onEdit={handleEdit}
            onSignUp={handleSignUp}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create Free Invoice</h2>
          <div className="flex items-center space-x-2">
            {data && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDraft}
              >
                Clear Draft
              </Button>
            )}
            {onClose && (
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          completedSteps={[]}
        />
      </div>

      {/* Notifications */}
      <div className="px-6 pt-6 space-y-3">
        {/* Draft Restored Notification */}
        {showDraftNotification && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Draft Restored</p>
              <p className="text-sm text-blue-700">Your previous work has been restored.</p>
            </div>
            <button
              onClick={() => setShowDraftNotification(false)}
              className="text-blue-600 hover:text-blue-800"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Success!</p>
              <p className="text-sm text-green-700">Your invoice has been downloaded.</p>
            </div>
            <button
              onClick={dismissSuccess}
              className="text-green-600 hover:text-green-800"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <button
              onClick={dismissError}
              className="text-red-600 hover:text-red-800"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStep()}
      </div>

      {/* Loading Overlay */}
      {isGeneratingPDF && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-2xl z-50">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <p className="text-lg font-medium text-gray-900">Generating PDF...</p>
            <p className="text-sm text-gray-600">This will only take a moment</p>
          </div>
        </div>
      )}
    </div>
  )
}
