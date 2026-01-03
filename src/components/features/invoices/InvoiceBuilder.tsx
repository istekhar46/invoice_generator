/**
 * Invoice Builder Component
 * Multi-step invoice creation form with customer selection, line items management,
 * and real-time calculation display
 */

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Invoice, Customer, LineItem, LineItemType } from '../../../types/entities'
import type { InvoiceFormData } from '../../../types/forms'
import { invoiceSchema } from '../../../types/forms'
import { useCreateInvoice, useUpdateInvoice } from '../../../hooks/useInvoices'
import { useCompanyProfile } from '../../../hooks/useCompany'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { ErrorAlert } from '../../ui/ErrorAlert'
import { FormSection, FormGrid, FormActions } from '../../ui/FormField'
import { LoadingOverlay } from '../../ui/LoadingSpinner'
import { CustomerList } from '../customers/CustomerList'
import { LineItemsTable } from './LineItemsTable'
import { InvoicePreview } from './InvoicePreview'
import { 
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
import { transformLineItemToDto, transformInvoiceResponse } from '../../../utils/apiTransformers'

interface InvoiceBuilderProps {
  invoice?: Invoice | null
  onSave?: (invoice: Invoice) => void
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
  className,
}) => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const { data: companyProfile } = useCompanyProfile()
  
  const loading = createInvoice.isPending || updateInvoice.isPending
  const error = createInvoice.error || updateInvoice.error

  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
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

  // Validation helpers - single source of truth for each step
  const validateCustomerStep = (): boolean => {
    // When editing an invoice, customer is pre-selected, so we just need to check if it exists
    // Don't check form errors for customerId since we skip the customer step when editing
    return selectedCustomer !== null && !!watchedValues.customerId
  }

  const validateDetailsStep = (): boolean => {
    // Check all required fields exist
    if (!watchedValues.serviceDate || !watchedValues.dueDate) {
      return false
    }
    
    // Check for form errors
    if (errors.serviceDate || errors.dueDate || errors.taxRate) {
      return false
    }
    
    // Check tax rate is valid
    if (watchedValues.taxRate === undefined || watchedValues.taxRate === null) {
      return false
    }
    
    // Validate date logic: due date must be >= service date
    if (watchedValues.dueDate < watchedValues.serviceDate) {
      return false
    }
    
    return true
  }

  const validateItemsStep = (): boolean => {
    // Must have at least one line item
    if (lineItems.length === 0) {
      return false
    }
    
    // Validate each line item has required fields and valid values
    const allItemsValid = lineItems.every(item => {
      // Check description is not empty
      if (!item.description || !item.description.trim()) {
        return false
      }
      
      // Check quantity is positive
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return false
      }
      
      // Check rate is non-negative
      if (typeof item.rate !== 'number' || item.rate < 0) {
        return false
      }
      
      // Check type is valid
      if (item.type !== 'material' && item.type !== 'labor') {
        return false
      }
      
      // Check amount is calculated correctly
      if (typeof item.amount !== 'number' || item.amount < 0) {
        return false
      }
      
      return true
    })
    
    return allItemsValid
  }

  const validateReviewStep = (): boolean => {
    // All previous steps must be valid
    const customerValid = validateCustomerStep()
    const detailsValid = validateDetailsStep()
    const itemsValid = validateItemsStep()
    
    // Check form errors, but exclude lineItems errors since we validate them separately
    const formErrors = Object.keys(errors).filter(key => key !== 'lineItems')
    const noErrors = formErrors.length === 0
    
    // Debug logging to help identify validation issues
    if (!customerValid || !detailsValid || !itemsValid || !noErrors) {
      console.log('Review step validation failed:', {
        customerValid,
        detailsValid,
        itemsValid,
        noErrors,
        formErrors,
        allErrors: errors,
        lineItems: lineItems.length,
        selectedCustomer: !!selectedCustomer,
        watchedValues: {
          customerId: watchedValues.customerId,
          serviceDate: watchedValues.serviceDate,
          dueDate: watchedValues.dueDate,
          taxRate: watchedValues.taxRate,
        }
      })
    }
    
    return customerValid && detailsValid && itemsValid && noErrors
  }

  // Determine if user can proceed to next step
  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 'customer':
        return validateCustomerStep()
      case 'details':
        return validateDetailsStep()
      case 'items':
        return validateItemsStep()
      case 'review':
        return validateReviewStep()
      default:
        return false
    }
  }

  // Initialize form with existing invoice data
  useEffect(() => {
    if (invoice) {
      console.log('Initializing invoice form with data:', {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        hasCustomer: !!(invoice as any).customer,
        customerIdFromNested: (invoice as any).customer?.id,
      })
      
      // Normalize line items - ensure type is lowercase
      const normalizedLineItems = invoice.lineItems.map(item => ({
        ...item,
        type: item.type.toLowerCase() as LineItemType
      }))
      
      setLineItems(normalizedLineItems)
      
      // Extract customerId - it might be in invoice.customerId or invoice.customer.id
      let customerId = invoice.customerId
      
      // Set selected customer if invoice has customer data
      // The API response includes the customer object
      if ((invoice as any).customer) {
        const customerData = (invoice as any).customer
        const customer: Customer = {
          id: customerData.id,
          userId: invoice.userId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          zipCode: customerData.zipCode,
          createdAt: customerData.createdAt ? new Date(customerData.createdAt) : new Date(),
          updatedAt: customerData.updatedAt ? new Date(customerData.updatedAt) : new Date(),
        }
        setSelectedCustomer(customer)
        
        // If customerId is not in the invoice object, get it from customer.id
        if (!customerId) {
          customerId = customerData.id
        }
      }
      
      const formData = {
        customerId: customerId || '',
        serviceDate: new Date(invoice.serviceDate),
        dueDate: new Date(invoice.dueDate),
        lineItems: normalizedLineItems,
        notes: invoice.notes || '',
        taxRate: invoice.taxRate,
      }
      
      console.log('Resetting form with data:', formData)
      
      reset(formData)
      
      // Explicitly set customerId to ensure it's in the form state
      if (customerId) {
        setValue('customerId', customerId, { 
          shouldValidate: true,
          shouldDirty: false,
          shouldTouch: false 
        })
      }
      
      // Skip to details step if editing
      setCurrentStep('details')
    }
  }, [invoice, reset, setValue])

  // Update form when line items change
  useEffect(() => {
    setValue('lineItems', lineItems, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true 
    })
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

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setSubmitError(null)
      setSubmitSuccess(false)
      
      // Final validation before submit (should already be validated by review step)
      if (!validateReviewStep()) {
        setSubmitError('Please complete all required fields before saving.')
        return
      }
      
      // Build the payload with proper transformations
      const payload = {
        customerId: data.customerId,
        serviceDate: data.serviceDate,
        dueDate: data.dueDate,
        lineItems: lineItems.map(transformLineItemToDto),
        notes: data.notes || undefined,
        taxRate: data.taxRate,
      }
      
      if (invoice) {
        // Update existing invoice
        const updatedInvoice = await updateInvoice.mutateAsync({ 
          id: invoice.id, 
          data: payload 
        })
        setSubmitSuccess(true)
        
        // Wait briefly to show success message, then close
        setTimeout(() => {
          const transformedInvoice = transformInvoiceResponse(updatedInvoice)
          onSave?.(transformedInvoice)
        }, 1500)
      } else {
        // Create new invoice
        const newInvoice = await createInvoice.mutateAsync(payload)
        setSubmitSuccess(true)
        
        // Wait briefly to show success message, then close
        setTimeout(() => {
          const transformedInvoice = transformInvoiceResponse(newInvoice)
          onSave?.(transformedInvoice)
        }, 1500)
      }
    } catch (error: any) {
      console.error('Failed to save invoice:', error)
      
      // Enhanced error handling with specific messages
      if (error?.status === 400 || error?.status === 422) {
        // Validation error
        if (error?.data?.errors && Array.isArray(error.data.errors)) {
          const fieldErrors = error.data.errors
            .map((err: any) => `${err.field}: ${err.message}`)
            .join(', ')
          setSubmitError(`Validation failed: ${fieldErrors}`)
        } else if (error?.data?.message) {
          setSubmitError(`Validation error: ${error.data.message}`)
        } else {
          setSubmitError('Invalid invoice data. Please check your input and try again.')
        }
      } else if (error?.status === 404) {
        setSubmitError('Invoice not found. It may have been deleted.')
      } else if (error?.status === 403) {
        setSubmitError('You do not have permission to save this invoice.')
      } else if (error?.status === 0) {
        setSubmitError('Network error. Please check your internet connection and try again.')
      } else if (error?.message) {
        setSubmitError(error.message)
      } else {
        setSubmitError('An unexpected error occurred. Please try again.')
      }
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
                  w-6 h-0.5 mx-4 transition-colors
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
    <Card padding='none'>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Select Customer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {selectedCustomer ? (
          <FormSection
            title="Selected Customer"
            description="Customer information for this invoice"
            variant="elevated"
          >
            <div className="bg-linear-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-3 items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary-900">{selectedCustomer.name}</h3>
                  <div className="space-y-1 text-sm text-primary-700">
                    <p className="flex items-center space-x-2">
                      <span className="font-medium">Email:</span>
                      <span>{selectedCustomer.email}</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <span className="font-medium">Phone:</span>
                      <span>{selectedCustomer.phone}</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <span className="font-medium">Address:</span>
                      <span>
                        {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zipCode}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerModal(true)}
                  className="ml-4 shrink-0"
                >
                  Change Customer
                </Button>
              </div>
            </div>
          </FormSection>
        ) : (
          <FormSection
            title="Choose Customer"
            description="Select the customer who will receive this invoice"
            variant="bordered"
          >
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Customer Selected
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Choose a customer from your customer list to create an invoice for them.
              </p>
              <Button 
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Select Customer</span>
              </Button>
            </div>
          </FormSection>
        )}
      </CardContent>
    </Card>
  )

  const renderDetailsStep = () => (
    <Card padding='none'>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Invoice Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormSection
          title="Date Information"
          description="Set the service date and payment due date for this invoice"
          variant="bordered"
        >
          <FormGrid columns={2} gap="lg">
            <Controller
              name="serviceDate"
              control={control}
              render={({ field }) => (
                <Input
                  label="Service Date *"
                  type="date"
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    field.onChange(date)
                    // Clear submit error when user makes changes
                    if (submitError) setSubmitError(null)
                  }}
                  error={errors.serviceDate?.message}
                />
              )}
            />
            
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Input
                  label="Due Date *"
                  type="date"
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    field.onChange(date)
                    // Clear submit error when user makes changes
                    if (submitError) setSubmitError(null)
                  }}
                  error={
                    errors.dueDate?.message || 
                    (watchedValues.dueDate && watchedValues.serviceDate && watchedValues.dueDate < watchedValues.serviceDate
                      ? 'Due date must be on or after service date'
                      : undefined)
                  }
                  helpText="Payment due date (typically 30 days after service date)"
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Tax Information"
          description="Set the tax rate for this invoice"
          variant="bordered"
        >
          <FormGrid columns={1} gap="md">
            <Controller
              name="taxRate"
              control={control}
              render={({ field }) => (
                <Input
                  label="Tax Rate (%) *"
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
                  error={errors.taxRate?.message}
                  helpText="Enter tax rate as a percentage (e.g., 8.5 for 8.5%)"
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Additional Information"
          description="Add any notes or special terms for this invoice"
          variant="elevated"
        >
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  {...field}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 min-h-11 resize-none"
                  placeholder="Add any additional notes or terms for this invoice..."
                  onChange={(e) => {
                    field.onChange(e)
                    // Clear submit error when user makes changes
                    if (submitError) setSubmitError(null)
                  }}
                />
                <p className="text-sm text-gray-500">
                  Add any additional notes, terms, or special instructions
                </p>
              </div>
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
      <Card padding='none'>
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
        <Card padding='none'>
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
      {/* Step Indicator */}
      <div className="mb-8">
        {renderStepIndicator()}
      </div>

      {/* Error Display */}
      {(error || submitError) && (
        <ErrorAlert
          type="error"
          title={submitError ? "Validation Error" : "Error"}
          message={submitError || error || 'An unexpected error occurred'}
          onDismiss={() => {
            if (submitError) setSubmitError(null)
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

      {/* Step Content */}
      <LoadingOverlay loading={loading} message={invoice ? 'Updating invoice...' : 'Creating invoice...'}>
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <FormActions align="between" responsive={false}>
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

          {currentStep === 'review' ? (
            <Button
              type="button"
              loading={loading}
              disabled={!validateReviewStep() || submitSuccess || loading}
              onClick={handleSubmit(onSubmit)}
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
        </FormActions>
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