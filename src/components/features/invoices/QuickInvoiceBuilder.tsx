/**
 * Quick Invoice Builder Component
 * Allows users to create invoices without saving company or customer details
 */

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Invoice, LineItem } from '../../../types/entities'
import type { QuickInvoiceFormData } from '../../../types/forms'
import type { GuestInvoiceData } from '../../../types/guest'
import type { CreateQuickInvoiceDto } from '../../../services/api'
import { quickInvoiceSchema } from '../../../types/forms'
import { useCreateQuickInvoice } from '../../../hooks/useInvoices'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { ErrorAlert } from '../../ui/ErrorAlert'
import { FormSection, FormGrid, FormActions } from '../../ui/FormField'
import { LoadingOverlay } from '../../ui/LoadingSpinner'
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
  Check,
  Building2,
  Download,
} from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'

type BuilderStep = 'company' | 'customer' | 'details' | 'items' | 'review'

const stepConfig = {
  company: {
    title: 'Company Details',
    icon: Building2,
    description: 'Enter your company information (optional)',
  },
  customer: {
    title: 'Customer Details',
    icon: User,
    description: 'Enter customer information',
  },
  details: {
    title: 'Invoice Details',
    icon: Calendar,
    description: 'Set service date, due date, and tax rate',
  },
  items: {
    title: 'Line Items',
    icon: Calculator,
    description: 'Add material charges with units',
  },
  review: {
    title: 'Review & Save',
    icon: Eye,
    description: 'Review the invoice and save',
  },
}

interface QuickInvoiceBuilderProps {
  invoice?: Invoice | null
  onSave?: (invoice: Invoice, company: any, customer: any) => void
  initialGuestData?: GuestInvoiceData | null
  className?: string
}

export const QuickInvoiceBuilder: React.FC<QuickInvoiceBuilderProps> = ({
  onSave,
  initialGuestData = null,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('company')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [hasImportedGuestData, setHasImportedGuestData] = useState(false)

  const createQuickInvoice = useCreateQuickInvoice()

  const loading = createQuickInvoice.isPending
  const error = createQuickInvoice.error

  // Form setup with React Hook Form and Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuickInvoiceFormData>({
    resolver: zodResolver(quickInvoiceSchema),
    defaultValues: {
      customerId: '',
      serviceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lineItems: [],
      notes: '',
      taxRate: 0.08, // Default 8% tax rate
    },
    mode: 'onChange',
  })

  const watchedValues = watch()

  // Update form when line items change
  useEffect(() => {
    setValue('lineItems', lineItems as any, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
  }, [lineItems, setValue])

  // If arriving from guest flow after signup, hydrate quick invoice with the same data
  useEffect(() => {
    if (!initialGuestData || hasImportedGuestData) {
      return
    }

    const mappedLineItems: LineItem[] = initialGuestData.lineItems.map((item) => ({
      id: item.id,
      invoiceId: '',
      type: 'material',
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    }))

    setLineItems(mappedLineItems)

    setValue('quickCompanyName', initialGuestData.company?.businessName || '')
    setValue('quickCompanyAddress', initialGuestData.company?.address || '')
    setValue('quickCompanyCity', initialGuestData.company?.city || '')
    setValue('quickCompanyState', initialGuestData.company?.state || '')
    setValue('quickCompanyZipCode', initialGuestData.company?.zipCode || '')
    setValue('quickCompanyPhone', initialGuestData.company?.phone || '')
    setValue('quickCompanyEmail', initialGuestData.company?.email || '')
    setValue('quickCompanyTaxNumber', initialGuestData.company?.taxNumber || '')

    setValue('quickCustomerName', initialGuestData.customer.name || '')
    setValue('quickCustomerEmail', initialGuestData.customer.email || '')
    setValue('quickCustomerPhone', initialGuestData.customer.phone || '')
    setValue('quickCustomerAddress', initialGuestData.customer.address || '')
    setValue('quickCustomerCity', initialGuestData.customer.city || '')
    setValue('quickCustomerState', initialGuestData.customer.state || '')
    setValue('quickCustomerZipCode', initialGuestData.customer.zipCode || '')

    setValue('serviceDate', new Date(initialGuestData.invoiceDetails.serviceDate))
    setValue('dueDate', new Date(initialGuestData.invoiceDetails.dueDate))
    setValue('taxRate', initialGuestData.invoiceDetails.taxRate)
    setValue('notes', initialGuestData.notes || '')

    if (!initialGuestData.customer.name) {
      setCurrentStep('customer')
    } else if (initialGuestData.lineItems.length === 0) {
      setCurrentStep('items')
    } else {
      setCurrentStep('review')
    }

    setHasImportedGuestData(true)
  }, [initialGuestData, hasImportedGuestData, setValue])

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

  const validateCustomerStep = (): boolean => {
    // Either customerId OR quick customer name must be provided
    return !!watchedValues.customerId || !!watchedValues.quickCustomerName
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

    // Validate each line item
    const allItemsValid = lineItems.every((item) => {
      if (!item.description || !item.description.trim()) {
        return false
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return false
      }
      if (typeof item.rate !== 'number' || item.rate < 0) {
        return false
      }
      if (item.type !== 'material') {
        return false
      }
      if (!item.unit || !item.unit.trim()) {
        return false
      }
      if (typeof item.amount !== 'number' || item.amount < 0) {
        return false
      }
      return true
    })

    return allItemsValid
  }

  const validateReviewStep = (): boolean => {
    return validateCustomerStep() && validateDetailsStep() && validateItemsStep()
  }

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 'company':
        return true // Optional step
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

  const handleNextStep = () => {
    const steps: BuilderStep[] = ['company', 'customer', 'details', 'items', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrevStep = () => {
    const steps: BuilderStep[] = ['company', 'customer', 'details', 'items', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const onSubmit = async (data: QuickInvoiceFormData): Promise<void> => {
    try {
      setSubmitError(null)
      setSubmitSuccess(false)

      // Final validation
      if (!validateReviewStep()) {
        setSubmitError('Please complete all required fields before saving.')
        return
      }

      // Build the payload
      const payload: CreateQuickInvoiceDto = {
        isQuickInvoice: true,
        customerId: data.customerId || undefined,
        quickCompanyName: data.quickCompanyName || undefined,
        quickCompanyAddress: data.quickCompanyAddress || undefined,
        quickCompanyCity: data.quickCompanyCity || undefined,
        quickCompanyState: data.quickCompanyState || undefined,
        quickCompanyZipCode: data.quickCompanyZipCode || undefined,
        quickCompanyPhone: data.quickCompanyPhone || undefined,
        quickCompanyEmail: data.quickCompanyEmail || undefined,
        quickCompanyTaxNumber: data.quickCompanyTaxNumber || undefined,
        quickCustomerName: data.quickCustomerName || undefined,
        quickCustomerEmail: data.quickCustomerEmail || undefined,
        quickCustomerPhone: data.quickCustomerPhone || undefined,
        quickCustomerAddress: data.quickCustomerAddress || undefined,
        quickCustomerCity: data.quickCustomerCity || undefined,
        quickCustomerState: data.quickCustomerState || undefined,
        quickCustomerZipCode: data.quickCustomerZipCode || undefined,
        serviceDate: data.serviceDate,
        dueDate: data.dueDate,
        lineItems: lineItems.map((item) => ({
          type: 'MATERIAL' as const,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
        })),
        notes: data.notes || undefined,
        taxRate: data.taxRate,
      }

      const newInvoice = await createQuickInvoice.mutateAsync(payload)
      setSubmitSuccess(true)

      // Build company and customer objects for preview
      const company = data.quickCompanyName
        ? {
            id: '',
            userId: '',
            businessName: data.quickCompanyName,
            address: data.quickCompanyAddress || '',
            city: data.quickCompanyCity || '',
            state: data.quickCompanyState || '',
            zipCode: data.quickCompanyZipCode || '',
            phone: data.quickCompanyPhone || '',
            email: data.quickCompanyEmail || '',
            taxNumber: data.quickCompanyTaxNumber || '',
            defaultLaborRate: 0,
            defaultTaxRate: data.taxRate,
            logoUrl: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null

      const customer = data.quickCustomerName
        ? {
            id: '',
            userId: '',
            name: data.quickCustomerName,
            email: data.quickCustomerEmail || '',
            phone: data.quickCustomerPhone || '',
            address: data.quickCustomerAddress || '',
            city: data.quickCustomerCity || '',
            state: data.quickCustomerState || '',
            zipCode: data.quickCustomerZipCode || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null

      // Wait briefly to show success message, then call onSave
      setTimeout(() => {
        onSave?.(
          {
            id: newInvoice.id,
            userId: '', // Will be set by the caller if needed
            customerId: newInvoice.customer.id,
            invoiceNumber: newInvoice.invoiceNumber,
            serviceDate: new Date(newInvoice.serviceDate),
            dueDate: new Date(newInvoice.dueDate),
            lineItems: newInvoice.lineItems.map(item => ({
              id: item.id,
              invoiceId: newInvoice.id,
              type: 'material',
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
            })),
            subtotal: newInvoice.subtotal,
            taxRate: newInvoice.taxRate,
            taxAmount: newInvoice.taxAmount,
            total: newInvoice.total,
            notes: newInvoice.notes,
            status: newInvoice.status.toLowerCase() as 'draft' | 'sent' | 'paid',
            createdAt: new Date(newInvoice.createdAt),
            updatedAt: new Date(newInvoice.updatedAt),
          } as Invoice,
          company,
          customer,
        )
      }, 1500)
    } catch (err: any) {
      console.error('Failed to save quick invoice:', err)
      setSubmitError(err?.message || 'An unexpected error occurred. Please try again.')
    }
  }

  const renderStepIndicator = () => {
    const steps: BuilderStep[] = ['company', 'customer', 'details', 'items', 'review']

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const isActive = step === currentStep
          const isCompleted = steps.indexOf(currentStep) > index
          const config = stepConfig[step]
          const Icon = config.icon

          return (
            <div key={step} className="flex items-center">
              <div
                className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${isActive ? 'border-blue-600 bg-blue-600 text-white' : isCompleted ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-400'}
              `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>

              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>{config.title}</p>
                <p className="text-xs text-gray-500">{config.description}</p>
              </div>

              {index < steps.length - 1 && <div className={`w-6 h-0.5 mx-4 transition-colors ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />}
            </div>
          )
        })}
      </div>
    )
  }

  const renderCompanyStep = () => (
    <Card padding="none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Company Details (Optional)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormSection
          title="Your Company Information"
          description="Enter your company details for the invoice (optional - you can skip this step)"
          variant="bordered"
        >
          <FormGrid columns={2} gap="md">
            <Controller
              name="quickCompanyName"
              control={control}
              render={({ field }) => <Input label="Business Name" placeholder="Acme Electric Co." {...field} />}
            />
            <Controller
              name="quickCompanyEmail"
              control={control}
              render={({ field }) => <Input label="Email" type="email" placeholder="billing@company.com" {...field} />}
            />
          </FormGrid>

          <Controller
            name="quickCompanyAddress"
            control={control}
            render={({ field }) => <Input label="Address" placeholder="123 Main St" {...field} />}
          />

          <FormGrid columns={3} gap="md">
            <Controller
              name="quickCompanyCity"
              control={control}
              render={({ field }) => <Input label="City" placeholder="Springfield" {...field} />}
            />
            <Controller
              name="quickCompanyState"
              control={control}
              render={({ field }) => (
                <Input
                  label="State / Province"
                  placeholder="e.g. California, Ontario"
                  error={errors.quickCompanyState?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="quickCompanyZipCode"
              control={control}
              render={({ field }) => (
                <Input
                  label="Postal Code"
                  placeholder="e.g. 10001, SW1A 1AA"
                  error={errors.quickCompanyZipCode?.message}
                  {...field}
                />
              )}
            />
          </FormGrid>

          <FormGrid columns={2} gap="md">
            <Controller
              name="quickCompanyPhone"
              control={control}
              render={({ field }) => (
                <Input
                  label="Phone"
                  placeholder="+1 555 123 4567"
                  error={errors.quickCompanyPhone?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="quickCompanyTaxNumber"
              control={control}
              render={({ field }) => <Input label="Tax / VAT Number" placeholder="e.g. EIN, VAT, GSTIN" {...field} />}
            />
          </FormGrid>
        </FormSection>
      </CardContent>
    </Card>
  )

  const renderCustomerStep = () => (
    <Card padding="none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Customer Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormSection
          title="Customer Information"
          description="Enter the customer details for this invoice"
          variant="bordered"
        >
          <Controller
            name="quickCustomerName"
            control={control}
            render={({ field }) => (
              <Input
                label="Customer Name *"
                placeholder="John Smith"
                error={errors.quickCustomerName?.message}
                {...field}
              />
            )}
          />

          <FormGrid columns={2} gap="md">
            <Controller
              name="quickCustomerEmail"
              control={control}
              render={({ field }) => (
                <Input
                  label="Email"
                  type="email"
                  placeholder="john@example.com"
                  error={errors.quickCustomerEmail?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="quickCustomerPhone"
              control={control}
              render={({ field }) => (
                <Input
                  label="Phone"
                  placeholder="(555) 987-6543"
                  error={errors.quickCustomerPhone?.message}
                  {...field}
                />
              )}
            />
          </FormGrid>

          <Controller
            name="quickCustomerAddress"
            control={control}
            render={({ field }) => <Input label="Address" placeholder="456 Oak Ave" {...field} />}
          />

          <FormGrid columns={3} gap="md">
            <Controller
              name="quickCustomerCity"
              control={control}
              render={({ field }) => <Input label="City" placeholder="Springfield" {...field} />}
            />
            <Controller
              name="quickCustomerState"
              control={control}
              render={({ field }) => (
                <Input
                  label="State / Province"
                  placeholder="e.g. California, Ontario"
                  error={errors.quickCustomerState?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="quickCustomerZipCode"
              control={control}
              render={({ field }) => (
                <Input
                  label="Postal Code"
                  placeholder="e.g. 10001, SW1A 1AA"
                  error={errors.quickCustomerZipCode?.message}
                  {...field}
                />
              )}
            />
          </FormGrid>
        </FormSection>
      </CardContent>
    </Card>
  )

  const renderDetailsStep = () => (
    <Card padding="none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Invoice Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormSection title="Date Information" description="Set the service date and payment due date" variant="bordered">
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
                    if (submitError) setSubmitError(null)
                  }}
                  error={errors.dueDate?.message || (watchedValues.dueDate && watchedValues.serviceDate && watchedValues.dueDate < watchedValues.serviceDate ? 'Due date must be on or after service date' : undefined)}
                  helpText="Payment due date (typically 30 days after service date)"
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Tax Information" description="Set the tax rate for this invoice" variant="bordered">
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

        <FormSection title="Additional Information" description="Add any notes or special terms" variant="elevated">
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                <textarea
                  {...field}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 min-h-11 resize-none"
                  placeholder="Add any additional notes or terms..."
                  onChange={(e) => {
                    field.onChange(e)
                    if (submitError) setSubmitError(null)
                  }}
                />
                <p className="text-sm text-gray-500">Add any additional notes, terms, or special instructions</p>
              </div>
            )}
          />
        </FormSection>
      </CardContent>
    </Card>
  )

  const renderItemsStep = () => (
    <div className="space-y-6">
      <LineItemsTable lineItems={lineItems} onChange={setLineItems} disabled={loading} />

      {/* Real-time totals display */}
      <Card padding="none">
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
              <span className="text-gray-600">Tax ({((watchedValues.taxRate || 0) * 100).toFixed(1)}%):</span>
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'company':
        return renderCompanyStep()
      case 'customer':
        return renderCustomerStep()
      case 'details':
        return renderDetailsStep()
      case 'items':
        return renderItemsStep()
      case 'review': {
        // Build a partial invoice from current form data for live preview
        const previewInvoice: Partial<Invoice> = {
          invoiceNumber: 'PREVIEW',
          serviceDate: watchedValues.serviceDate,
          dueDate: watchedValues.dueDate,
          lineItems: lineItems,
          subtotal: totals.subtotal,
          taxRate: watchedValues.taxRate || 0,
          taxAmount: totals.taxAmount,
          total: totals.total,
          notes: watchedValues.notes || undefined,
          status: 'draft',
        }
        const previewCompany = watchedValues.quickCompanyName
          ? {
              businessName: watchedValues.quickCompanyName,
              address: watchedValues.quickCompanyAddress || '',
              city: watchedValues.quickCompanyCity || '',
              state: watchedValues.quickCompanyState || '',
              zipCode: watchedValues.quickCompanyZipCode || '',
              phone: watchedValues.quickCompanyPhone || '',
              email: watchedValues.quickCompanyEmail || '',
              taxNumber: watchedValues.quickCompanyTaxNumber || '',
            } as any
          : null
        const previewCustomer = watchedValues.quickCustomerName
          ? {
              name: watchedValues.quickCustomerName,
              email: watchedValues.quickCustomerEmail || '',
              phone: watchedValues.quickCustomerPhone || '',
              address: watchedValues.quickCustomerAddress || '',
              city: watchedValues.quickCustomerCity || '',
              state: watchedValues.quickCustomerState || '',
              zipCode: watchedValues.quickCustomerZipCode || '',
            } as any
          : null
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <Eye className="h-4 w-4 shrink-0" />
              <span>This is a live preview. Click <strong>Save Invoice</strong> below to create it.</span>
            </div>
          <div id="printable-invoice">
            <InvoicePreview
              invoice={previewInvoice}
              company={previewCompany}
              customer={previewCustomer}
            />
          </div>
        </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className={className}>
      {/* Step Indicator */}
      <div className="mb-8">{renderStepIndicator()}</div>

      {/* Error Display */}
      {(error || submitError) && (
        <ErrorAlert
          type="error"
          title={submitError ? 'Validation Error' : 'Error'}
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
          message="Quick invoice created successfully!"
          className="mb-6"
        />
      )}

      {/* Step Content */}
      <LoadingOverlay loading={loading} message="Creating invoice...">
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation */}
        <FormActions align="between" responsive={false}>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 'company' || loading}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          {currentStep === 'review' ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </Button>
              <Button
                type="button"
                loading={loading}
                disabled={!validateReviewStep() || submitSuccess || loading}
                onClick={handleSubmit(onSubmit)}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Invoice</span>
              </Button>
            </div>
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
    </div>
  )
}
