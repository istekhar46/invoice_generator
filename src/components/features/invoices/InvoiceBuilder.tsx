/**
 * Invoice Builder Component
 * Multi-step invoice creation form with customer selection, line items management,
 * and real-time calculation display
 */

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Invoice, Customer, LineItem } from '../../../types/entities'
import type { InvoiceFormData } from '../../../types/forms'
import { invoiceSchema } from '../../../types/forms'
import { useInvoiceStore } from '../../../store/invoiceStore'
import { useCustomerStore } from '../../../store/customerStore'
import { useCompanyStore } from '../../../store/companyStore'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { ErrorAlert } from '../../ui/ErrorAlert'
import { FormField, FormSection } from '../../ui/FormField'
import { LoadingOverlay } from '../../ui/LoadingSpinner'
import { CustomerList } from '../customers/CustomerList'
import { LineItemsTable } from './LineItemsTable'
import { InvoicePreview } from './InvoicePreview'
import { 
  FileText, 
  User, 
  Calendar, 
  Calculator, 
  Eye,
  Save,
  ArrowLeft,
  ArrowRight,
  Check
} from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'

interface InvoiceBuilderProps {
  invoice?: Invoice | null
  onSave?: (invoice: Invoice) => void
  onCancel?: () => void
  className?: string
}

type BuilderStep = 'customer' | 'details' | 'items' | 'review'

const stepConfig = {
  customer: {
    title: 'Select Customer',
    icon: User,
    description: 'Choose the customer for this invoice'
  },
  details: {
    title: 'Invoice Details',
    icon: Calendar,
    description: 'Set service date, due date, and tax rate'
  },
  items: {
    title: 'Line Items',
    icon: Calculator,
    description: 'Add materials and labor charges'
  },
  review: {
    title: 'Review & Save',
    icon: Eye,
    description: 'Review the invoice and save'
  }
}

export const InvoiceBuilder: React.FC<InvoiceBuilderProps> = ({
  invoice,
  onSave,
  onCancel,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const { createInvoice, updateInvoice, loading, error, clearError } = useInvoiceStore()
  const { loadCustomers, getCustomer } = useCustomerStore()
  const { profile: companyProfile, loadProfile } = useCompanyStore()

  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      serviceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lineItems: [],
      notes: '',
      taxRate: companyProfile?.defaultTaxRate || 0.08, // Default 8% tax rate
    },
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Load data on mount
  useEffect(() => {
    // Get user ID from auth store
    const authUser = JSON.parse(localStorage.getItem('user') || 'null')
    if (authUser?.id) {
      loadCustomers(authUser.id)
      loadProfile(authUser.id)
    }
  }, [loadCustomers, loadProfile])

  // Initialize form with existing invoice data
  useEffect(() => {
    if (invoice) {
      const customer = getCustomer(invoice.customerId)
      setSelectedCustomer(customer)
      setLineItems(invoice.lineItems)
      
      reset({
        customerId: invoice.customerId,
        serviceDate: new Date(invoice.serviceDate),
        dueDate: new Date(invoice.dueDate),
        lineItems: invoice.lineItems,
        notes: invoice.notes || '',
        taxRate: invoice.taxRate,
      })
      
      // Skip to details step if editing
      setCurrentStep('details')
    }
  }, [invoice, getCustomer, reset])

  // Update form when line items change
  useEffect(() => {
    setValue('lineItems', lineItems, { shouldValidate: true })
  }, [lineItems, setValue])

  // Calculate totals for real-time display
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = subtotal * (watchedValues.taxRate || 0)
    const total = subtotal + taxAmount
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }

  const totals = calculateTotals()

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setValue('customerId', customer.id, { shouldValidate: true })
    setShowCustomerModal(false)
  }

  const handleNextStep = () => {
    const steps: BuilderStep[] = ['customer', 'details', 'items', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrevStep = () => {
    const steps: BuilderStep[] = ['customer', 'details', 'items', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'customer':
        return selectedCustomer !== null && !errors.customerId
      case 'details':
        return watchedValues.serviceDate && 
               watchedValues.dueDate && 
               watchedValues.taxRate !== undefined &&
               !errors.serviceDate &&
               !errors.dueDate &&
               !errors.taxRate
      case 'items':
        return lineItems.length > 0 && !errors.lineItems
      case 'review':
        return isValid && lineItems.length > 0
      default:
        return false
    }
  }

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitError(null)
      setSubmitSuccess(false)
      clearError()
      
      // Additional validation
      if (!selectedCustomer) {
        setSubmitError('Please select a customer before saving the invoice.')
        return
      }
      
      if (lineItems.length === 0) {
        setSubmitError('Please add at least one line item before saving the invoice.')
        return
      }
      
      // Validate date logic
      if (data.dueDate < data.serviceDate) {
        setSubmitError('Due date cannot be before the service date.')
        return
      }
      
      if (invoice) {
        // Update existing invoice
        await updateInvoice(invoice.id, data)
        setSubmitSuccess(true)
        setTimeout(() => {
          onSave?.(invoice)
        }, 1500) // Show success message briefly before closing
      } else {
        // Create new invoice
        await createInvoice(data)
        setSubmitSuccess(true)
        setTimeout(() => {
          // The created invoice will be available in the store
          // For now, we'll call onSave with a placeholder
          onSave?.(invoice!)
        }, 1500) // Show success message briefly before closing
      }
    } catch (error) {
      console.error('Failed to save invoice:', error)
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while saving the invoice. Please try again.'
      )
    }
  }

  const renderStepIndicator = () => {
    const steps: BuilderStep[] = ['customer', 'details', 'items', 'review']
    
    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const isActive = step === currentStep
          const isCompleted = steps.indexOf(currentStep) > index
          const config = stepConfig[step]
          const Icon = config.icon
          
          return (
            <div key={step} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${isActive 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : isCompleted 
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {config.title}
                </p>
                <p className="text-xs text-gray-500">{config.description}</p>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-0.5 mx-4 transition-colors
                  ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                `} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderCustomerStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Select Customer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCustomer ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-blue-700">{selectedCustomer.email}</p>
                <p className="text-sm text-blue-700">{selectedCustomer.phone}</p>
                <p className="text-sm text-blue-700">
                  {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zipCode}
                </p>
              </div>
              <Button
                variant="outline"
                size="small"
                onClick={() => setShowCustomerModal(true)}
              >
                Change Customer
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Choose a Customer
            </h3>
            <p className="text-gray-500 mb-4">
              Select the customer who will receive this invoice.
            </p>
            <Button onClick={() => setShowCustomerModal(true)}>
              Select Customer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderDetailsStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Invoice Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormSection
          title="Date Information"
          description="Set the service date and payment due date for this invoice"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="serviceDate"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Service Date"
                  error={errors.serviceDate?.message}
                  required
                >
                  <Input
                    type="date"
                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      field.onChange(date)
                      // Clear submit error when user makes changes
                      if (submitError) setSubmitError(null)
                    }}
                    className={errors.serviceDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  />
                </FormField>
              )}
            />
            
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Due Date"
                  error={errors.dueDate?.message}
                  helpText="Payment due date (typically 30 days after service date)"
                  required
                >
                  <Input
                    type="date"
                    value={field.value ? field.value.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value)
                      field.onChange(date)
                      // Clear submit error when user makes changes
                      if (submitError) setSubmitError(null)
                    }}
                    className={errors.dueDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                  />
                </FormField>
              )}
            />
          </div>
        </FormSection>

        <FormSection
          title="Tax Information"
          description="Set the tax rate for this invoice"
        >
          <Controller
            name="taxRate"
            control={control}
            render={({ field }) => (
              <FormField
                label="Tax Rate (%)"
                error={errors.taxRate?.message}
                helpText="Enter tax rate as a percentage (e.g., 8.5 for 8.5%)"
                required
              >
                <Input
                  type="number"
                  value={field.value ? (field.value * 100).toString() : ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) / 100 || 0
                    field.onChange(value)
                    // Clear submit error when user makes changes
                    if (submitError) setSubmitError(null)
                  }}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="8.5"
                  className={errors.taxRate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
              </FormField>
            )}
          />
        </FormSection>

        <FormSection
          title="Additional Information"
          description="Add any notes or special terms for this invoice"
        >
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <FormField
                label="Notes (Optional)"
                helpText="Add any additional notes, terms, or special instructions"
              >
                <textarea
                  {...field}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add any additional notes or terms for this invoice..."
                  onChange={(e) => {
                    field.onChange(e)
                    // Clear submit error when user makes changes
                    if (submitError) setSubmitError(null)
                  }}
                />
              </FormField>
            )}
          />
        </FormSection>
      </CardContent>
    </Card>
  )

  const renderItemsStep = () => (
    <div className="space-y-6">
      <LineItemsTable
        lineItems={lineItems}
        onChange={setLineItems}
        disabled={loading}
      />
      
      {/* Real-time totals display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Invoice Totals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Tax ({((watchedValues.taxRate || 0) * 100).toFixed(1)}%):
              </span>
              <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderReviewStep = () => {
    // Only show preview if we have the minimum required data
    if (!selectedCustomer || lineItems.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Cannot Preview Invoice
            </h3>
            <p className="text-gray-500 mb-4">
              {!selectedCustomer && lineItems.length === 0
                ? 'Please go back and select a customer and add line items.'
                : !selectedCustomer 
                  ? 'Please go back and select a customer.'
                  : 'Please go back and add line items.'
              }
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </Button>
          </CardContent>
        </Card>
      )
    }

    const previewInvoice: Invoice = {
      id: invoice?.id || 'preview',
      userId: invoice?.userId || '',
      invoiceNumber: invoice?.invoiceNumber || 'INV-PREVIEW',
      customerId: watchedValues.customerId,
      serviceDate: watchedValues.serviceDate || new Date(),
      dueDate: watchedValues.dueDate || new Date(),
      lineItems: lineItems,
      subtotal: totals.subtotal,
      taxRate: watchedValues.taxRate || 0,
      taxAmount: totals.taxAmount,
      total: totals.total,
      notes: watchedValues.notes || '',
      status: invoice?.status || 'draft',
      createdAt: invoice?.createdAt || new Date(),
      updatedAt: invoice?.updatedAt || new Date(),
    }

    return (
      <div className="space-y-6">
        <InvoicePreview
          invoice={previewInvoice}
          company={companyProfile}
          customer={selectedCustomer}
        />
        
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setShowPreview(true)}
            variant="outline"
            disabled={!selectedCustomer || lineItems.length === 0}
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Full Screen Preview</span>
          </Button>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'customer':
        return renderCustomerStep()
      case 'details':
        return renderDetailsStep()
      case 'items':
        return renderItemsStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {invoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h1>
              <p className="text-gray-500">
                {invoice ? `Editing ${invoice.invoiceNumber}` : 'Build your invoice step by step'}
              </p>
            </div>
          </div>
          
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        
        {renderStepIndicator()}
      </div>

      {/* Error Display */}
      {(error || submitError) && (
        <ErrorAlert
          type="error"
          title="Error"
          message={submitError || error || 'An unexpected error occurred'}
          onDismiss={() => {
            if (submitError) setSubmitError(null)
            if (error) clearError()
          }}
          className="mb-6"
        />
      )}

      {/* Success Display */}
      {submitSuccess && (
        <ErrorAlert
          type="success"
          title="Success!"
          message={invoice ? 'Invoice updated successfully!' : 'Invoice created successfully!'}
          className="mb-6"
        />
      )}

      {/* Line Items Validation Error */}
      {errors.lineItems && (
        <ErrorAlert
          type="error"
          title="Line Items Required"
          message={errors.lineItems.message || 'Please add at least one line item to the invoice'}
          className="mb-6"
        />
      )}

      {/* Step Content */}
      <LoadingOverlay loading={loading} message={invoice ? 'Updating invoice...' : 'Creating invoice...'}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStep === 'customer' || loading}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <div className="flex space-x-3">
              {currentStep === 'review' ? (
                <Button
                  type="submit"
                  loading={loading}
                  disabled={!isValid || lineItems.length === 0 || submitSuccess}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{invoice ? 'Update Invoice' : 'Save Invoice'}</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceedToNext() || loading}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </LoadingOverlay>

      {/* Customer Selection Modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Select Customer"
        size="large"
      >
        <CustomerList
          onCustomerSelect={handleCustomerSelect}
          selectable={true}
          selectedCustomerId={selectedCustomer?.id}
        />
      </Modal>

      {/* Full Screen Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Invoice Preview - ${invoice?.invoiceNumber || 'INV-PREVIEW'}`}
        size="large"
      >
        {selectedCustomer && lineItems.length > 0 ? (
          <InvoicePreview
            invoice={{
              id: invoice?.id || 'preview',
              userId: invoice?.userId || '',
              invoiceNumber: invoice?.invoiceNumber || 'INV-PREVIEW',
              customerId: watchedValues.customerId,
              serviceDate: watchedValues.serviceDate || new Date(),
              dueDate: watchedValues.dueDate || new Date(),
              lineItems: lineItems,
              subtotal: totals.subtotal,
              taxRate: watchedValues.taxRate || 0,
              taxAmount: totals.taxAmount,
              total: totals.total,
              notes: watchedValues.notes || '',
              status: invoice?.status || 'draft',
              createdAt: invoice?.createdAt || new Date(),
              updatedAt: invoice?.updatedAt || new Date(),
            }}
            company={companyProfile}
            customer={selectedCustomer}
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Preview Not Available
            </h3>
            <p className="text-gray-500 mb-4">
              {!selectedCustomer && !lineItems.length 
                ? 'Please select a customer and add line items to preview the invoice.'
                : !selectedCustomer 
                  ? 'Please select a customer to preview the invoice.'
                  : 'Please add line items to preview the invoice.'
              }
            </p>
            <button
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close Preview
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}