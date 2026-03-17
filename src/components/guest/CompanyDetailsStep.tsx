/**
 * Company Details Step Component
 * First step in guest invoice wizard - optional company information
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FormGrid, FormActions } from '../ui/FormField'
import { guestCompanyDetailsSchema } from '../../types/guestSchemas'
import type { GuestCompanyDetails } from '../../types/guest'
import { Building2 } from 'lucide-react'

interface CompanyDetailsStepProps {
  data: GuestCompanyDetails | null
  onNext: (data: GuestCompanyDetails | null) => void
  onSkip: () => void
}

export const CompanyDetailsStep: React.FC<CompanyDetailsStepProps> = ({
  data,
  onNext,
  onSkip,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<GuestCompanyDetails>({
    resolver: zodResolver(guestCompanyDetailsSchema),
    mode: 'onBlur',
    defaultValues: data || {
      businessName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      taxNumber: '',
    },
  })

  const onSubmit = (formData: GuestCompanyDetails) => {
    // Check if any field has a value
    const hasData = Object.values(formData).some(value => value && value.trim() !== '')
    onNext(hasData ? formData : null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
        <p className="text-gray-600">
          Add your business information (optional)
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Name */}
        <Input
          label="Business Name"
          placeholder="Your Company LLC"
          error={errors.businessName?.message}
          {...register('businessName')}
        />

        {/* Contact Information */}
        <FormGrid columns={2}>
          <Input
            label="Email"
            type="email"
            placeholder="company@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </FormGrid>

        {/* Address */}
        <Input
          label="Address"
          placeholder="123 Main Street"
          error={errors.address?.message}
          {...register('address')}
        />

        {/* City, State, Zip */}
        <FormGrid columns={3}>
          <Input
            label="City"
            placeholder="New York"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="State/Province"
            placeholder="NY"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Postal Code"
            placeholder="10001"
            error={errors.zipCode?.message}
            {...register('zipCode')}
          />
        </FormGrid>

        {/* Tax Number */}
        <Input
          label="Tax/VAT Number"
          placeholder="12-3456789"
          helpText="Optional tax identification number"
          error={errors.taxNumber?.message}
          {...register('taxNumber')}
        />

        {/* Actions */}
        <FormActions align="between" responsive>
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
          >
            Skip this step
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Continue
          </Button>
        </FormActions>
      </form>
    </div>
  )
}
