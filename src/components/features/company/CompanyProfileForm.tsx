/**
 * Company Profile Form Component
 * Comprehensive form for creating and editing company profile information
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CompanyProfileFormData } from '../../../types/forms'
import { companyProfileSchema } from '../../../types/forms'
import { useCompanyProfile, useCreateCompanyProfile, useUpdateCompanyProfile, useUploadLogo, useDeleteLogo } from '../../../hooks/useCompany'
import { useAuthStatus } from '../../../hooks/useAuth'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { FormSection, FormGrid, FormActions } from '../../ui/FormField'
import { LogoUploader } from './LogoUploader'

interface CompanyProfileFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuthStatus()
  const { data: profile, isLoading: profileLoading } = useCompanyProfile()
  const createProfile = useCreateCompanyProfile()
  const updateProfile = useUpdateCompanyProfile()
  const uploadLogo = useUploadLogo()
  const deleteLogo = useDeleteLogo()

  const isEditing = !!profile
  const loading = createProfile.isPending || updateProfile.isPending || profileLoading
  const error = createProfile.error || updateProfile.error

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<CompanyProfileFormData>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: profile ? {
      businessName: profile.businessName,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      phone: profile.phone,
      email: profile.email,
      taxNumber: profile.taxNumber,
      defaultLaborRate: profile.defaultLaborRate,
      defaultTaxRate: profile.defaultTaxRate,
    } : {
      businessName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      taxNumber: '',
      defaultLaborRate: 0,
      defaultTaxRate: 0,
    },
    mode: 'onChange',
  })

  const onSubmit = async (data: CompanyProfileFormData) => {
    try {
      if (!user?.id) {
        throw new Error('User must be logged in')
      }
      
      if (isEditing) {
        await updateProfile.mutateAsync(data)
      } else {
        await createProfile.mutateAsync(data)
      }
      
      onSuccess?.()
    } catch (error) {
      // Error is handled by the mutation hooks
      console.error('Form submission failed:', error)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      await uploadLogo.mutateAsync(file)
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Logo upload failed:', error)
    }
  }

  const handleLogoDelete = async () => {
    try {
      await deleteLogo.mutateAsync()
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Logo deletion failed:', error)
    }
  }

  const handleCancel = () => {
    if (profile) {
      reset({
        businessName: profile.businessName,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        phone: profile.phone,
        email: profile.email,
        taxNumber: profile.taxNumber,
        defaultLaborRate: profile.defaultLaborRate,
        defaultTaxRate: profile.defaultTaxRate,
      })
    } else {
      reset()
    }
    onCancel?.()
  }

  if (profileLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Company Profile' : 'Create Company Profile'}
        </CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8">
          {/* Error Display */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 animate-fade-in">
              <p className="text-sm text-red-600" role="alert">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          )}

          {/* Logo Upload Section - Only show when editing existing profile */}
          {isEditing && (
            <FormSection
              title="Company Logo"
              description="Upload your company logo to personalize your invoices"
              variant="elevated"
            >
              <LogoUploader
                currentLogo={profile?.logoUrl}
                onLogoUpload={handleLogoUpload}
                onLogoDelete={handleLogoDelete}
                loading={uploadLogo.isPending}
                deleting={deleteLogo.isPending}
                error={uploadLogo.error instanceof Error ? uploadLogo.error.message : deleteLogo.error instanceof Error ? deleteLogo.error.message : undefined}
              />
            </FormSection>
          )}

          {/* Info message for new profile creation */}
          {!isEditing && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> You can upload your company logo after creating your profile.
              </p>
            </div>
          )}

          {/* Business Information Section */}
          <FormSection
            title="Business Information"
            description="Basic information about your electrical business"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
              <div className="sm:col-span-2">
                <Input
                  label="Business Name *"
                  {...register('businessName')}
                  error={errors.businessName?.message}
                  placeholder="Your Business Name"
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Address *"
                  {...register('address')}
                  error={errors.address?.message}
                  placeholder="123 Main Street"
                />
              </div>

              <Input
                label="City *"
                {...register('city')}
                error={errors.city?.message}
                placeholder="City"
              />

              <Input
                label="State *"
                {...register('state')}
                error={errors.state?.message}
                placeholder="CA"
                maxLength={2}
              />

              <Input
                label="Zip Code *"
                {...register('zipCode')}
                error={errors.zipCode?.message}
                placeholder="12345"
              />

              <Input
                label="Tax Number *"
                {...register('taxNumber')}
                error={errors.taxNumber?.message}
                placeholder="Tax ID or EIN"
              />
            </FormGrid>
          </FormSection>

          {/* Contact Information Section */}
          <FormSection
            title="Contact Information"
            description="How customers can reach your business"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
              <Input
                label="Phone *"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="(555) 123-4567"
              />

              <Input
                label="Email *"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="business@example.com"
              />
            </FormGrid>
          </FormSection>

          {/* Default Rates Section */}
          <FormSection
            title="Default Rates"
            description="Set your standard labor and tax rates for new invoices"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
              <Input
                label="Default Labor Rate ($/hour) *"
                type="number"
                step="0.01"
                min="0"
                {...register('defaultLaborRate', { valueAsNumber: true })}
                error={errors.defaultLaborRate?.message}
                placeholder="75.00"
              />

              <Input
                label="Default Tax Rate (%) *"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('defaultTaxRate', { 
                  valueAsNumber: true,
                  setValueAs: (value) => value / 100 // Convert percentage to decimal
                })}
                error={errors.defaultTaxRate?.message}
                placeholder="8.25"
                helpText="Enter as percentage (e.g., 8.25 for 8.25%)"
              />
            </FormGrid>
          </FormSection>

          {/* Form Actions */}
          <FormActions align="between" responsive>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={loading}
              disabled={!isValid || loading || (!isDirty && !isEditing)}
            >
              {isEditing ? 'Update Profile' : 'Create Profile'}
            </Button>
          </FormActions>
        </CardContent>
      </form>
    </Card>
  )
}