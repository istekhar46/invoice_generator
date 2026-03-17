/**
 * Customer Details Step Component
 * Second step in guest invoice wizard - customer information (required)
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FormSection, FormGrid, FormActions } from '../ui/FormField'
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
    <Card padding='none'>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Customer Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-center">
          <p className="text-gray-600">
            Who are you billing? <span className="text-red-600">*</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FormSection
            title="Customer Information"
            description="Basic details about the customer receiving this invoice"
            variant="bordered"
          >
            <FormGrid columns={1} gap="lg">
              <Input
                label="Customer Name"
                placeholder="John Doe"
                required
                error={errors.name?.message}
                {...register('name')}
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Contact Information"
            description="How to reach the customer"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
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
          </FormSection>

          <FormSection
            title="Customer Address"
            description="Billing address for the customer"
            variant="bordered"
          >
            <FormGrid columns={1} gap="lg">
              <Input
                label="Address"
                placeholder="456 Customer Street"
                error={errors.address?.message}
                {...register('address')}
              />
            </FormGrid>
            <FormGrid columns={3} gap="lg">
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
          </FormSection>

          <FormActions align="between" responsive={false}>
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
      </CardContent>
    </Card>
  )
}
