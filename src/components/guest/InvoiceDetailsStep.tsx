/**
 * Invoice Details Step Component
 * Third step in guest invoice wizard - invoice dates and tax rate
 */

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FormSection, FormGrid, FormActions } from '../ui/FormField'
import { guestInvoiceDetailsSchema } from '../../types/guestSchemas'
import type { GuestInvoiceDetails } from '../../types/guest'
import { Calendar } from 'lucide-react'

interface InvoiceDetailsStepProps {
  data: GuestInvoiceDetails | null
  onNext: (data: GuestInvoiceDetails) => void
  onBack: () => void
}

export const InvoiceDetailsStep: React.FC<InvoiceDetailsStepProps> = ({
  data,
  onNext,
  onBack,
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<GuestInvoiceDetails>({
    resolver: zodResolver(guestInvoiceDetailsSchema),
    mode: 'onBlur',
    defaultValues: data || {
      serviceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      taxRate: 0.08,
    },
  })

  const onSubmit = (formData: GuestInvoiceDetails) => {
    onNext(formData)
  }

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <Card padding='none'>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Invoice Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-center">
          <p className="text-gray-600">
            Set dates and tax rate <span className="text-red-500">*</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                    required
                    error={errors.serviceDate?.message}
                    value={formatDateForInput(field.value)}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
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
                    required
                    error={errors.dueDate?.message}
                    value={formatDateForInput(field.value)}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
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
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="8.00"
                    error={errors.taxRate?.message}
                    value={(field.value * 100).toFixed(2)}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value) || 0
                      field.onChange(percentage / 100)
                    }}
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 min-h-[100px] resize-none"
                placeholder="Add any additional notes, terms, or payment instructions..."
                maxLength={1000}
                {...register('notes' as any)}
              />
              <p className="text-sm text-gray-500">
                Add any additional notes, terms, or special instructions
              </p>
            </div>
          </FormSection>

          {/* Actions */}
          <FormActions align="between" responsive={false}>
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid}
            >
              Continue
            </Button>
          </FormActions>
        </form>
      </CardContent>
    </Card>
  )
}
