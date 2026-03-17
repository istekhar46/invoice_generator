/**
 * Company Details Step Component
 * First step in guest invoice wizard - optional company information
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { FormSection, FormGrid, FormActions } from '../ui/FormField'
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
    formState: { errors },
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
    <Card padding='none'>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Company Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="text-center">
          <p className="text-gray-600">
            Add your business information (optional)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FormSection
            title="Business Information"
            description="Your company details that will appear on the invoice"
            variant="bordered"
          >
            <FormGrid columns={1} gap="lg">
              <Input
                label="Business Name"
                placeholder="Your Company LLC"
                error={errors.businessName?.message}
                {...register('businessName')}
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Contact Information"
            description="How customers can reach your business"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
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
          </FormSection>

          <FormSection
            title="Business Address"
            description="Your company's physical location"
            variant="bordered"
          >
            <FormGrid columns={1} gap="lg">
              <Input
                label="Address"
                placeholder="123 Main Street"
                error={errors.address?.message}
                {...register('address')}
              />
            </FormGrid>
            <FormGrid columns={3} gap="lg">
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
          </FormSection>

          <FormSection
            title="Tax Information"
            description="Optional tax identification for your business"
            variant="elevated"
          >
            <FormGrid columns={1} gap="md">
              <Input
                label="Tax/VAT Number"
                placeholder="12-3456789"
                helpText="Optional tax identification number"
                error={errors.taxNumber?.message}
                {...register('taxNumber')}
              />
            </FormGrid>
          </FormSection>

          {/* Actions */}
          <FormActions align="between" responsive={false}>
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
      </CardContent>
    </Card>
  )
}
