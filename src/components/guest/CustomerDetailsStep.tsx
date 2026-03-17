/**
 * Customer Details Step Component
 * Second step in guest invoice wizard - customer information (required)
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FormGrid, FormActions } from '../ui/FormField'
import { guestCustomerDetailsSchema } from '../../types/guestSchemas'
import type { GuestCustomerDetails } from '../../types/guest'
import { User } from 'lucide-react'

interface CustomerDetailsStepProps {
  data: GuestCustomerDetails
  onNext: (data: GuestCustomerDetails) => void
  onBack: () => void
}

export const CustomerDetailsStep: React.FC<CustomerDetailsStepProps> = ({
  data,
  onNext,
  onBack,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<GuestCustomerDetails>({
    resolver: zodResolver(guestCustomerDetailsSchema),
    mode: 'onBlur',
    defaultValues: data || {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
  })

  const onSubmit = (formData: GuestCustomerDetails) => {
    onNext(formData)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
        <p className="text-gray-600">
          Who are you billing? <span className="text-red-600">*</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Customer Name"
          placeholder="John Doe"
          required
          error={errors.name?.message}
          {...register('name')}
        />

        <FormGrid columns={2}>
          <Input
            label="Email"
            type="email"
            placeholder="customer@example.com"
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

        <Input
          label="Address"
          placeholder="456 Customer Street"
          error={errors.address?.message}
          {...register('address')}
        />

        <FormGrid columns={3}>
          <Input
            label="City"
            placeholder="Los Angeles"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="State/Province"
            placeholder="CA"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Postal Code"
            placeholder="90001"
            error={errors.zipCode?.message}
            {...register('zipCode')}
          />
        </FormGrid>

        <FormActions align="between" responsive>
          <Button
            type="button"
            variant="ghost"
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
