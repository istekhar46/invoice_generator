/**
 * Invoice Details Step Component
 * Third step in guest invoice wizard - invoice dates and tax rate
 */

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FormGrid, FormActions } from '../ui/FormField'
import { guestInvoiceDetailsSchema } from '../../types/guestSchemas'
import type { GuestInvoiceDetails } from '../../types/guest'
import { Calendar, Percent } from 'lucide-react'

interface InvoiceDetailsStepProps {
  data: GuestInvoiceDetails
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Calendar className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
        <p className="text-gray-600">
          Set dates and tax rate <span className="text-red-500">*</span> Required
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dates */}
        <FormGrid columns={2}>
          <Controller
            name="serviceDate"
            control={control}
            render={({ field }) => (
              <Input
                label="Service Date"
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
                label="Due Date"
                type="date"
                required
                error={errors.dueDate?.message}
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(new Date(e.target.value))}
                helpText="Must be on or after service date"
              />
            )}
          />
        </FormGrid>

        {/* Tax Rate */}
        <Controller
          name="taxRate"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
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
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Percent className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter tax rate as percentage (e.g., 8.00 for 8%)
              </p>
            </div>
          )}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 min-h-[100px]"
            placeholder="Add any additional notes or payment terms..."
            maxLength={1000}
            {...register('notes' as any)}
          />
          <p className="mt-2 text-sm text-gray-500">
            Maximum 1000 characters
          </p>
        </div>

        {/* Actions */}
        <FormActions align="between" responsive>
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
    </div>
  )
}
