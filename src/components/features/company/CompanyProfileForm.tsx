/**
 * Company Profile Form Component
 * Comprehensive form for creating and editing company profile information
 */

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { RiMoneyDollarCircleLine } from 'react-icons/ri'

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
    control,
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
      defaultTaxRate: profile.defaultTaxRate * 100,
    } : {
      businessName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
      taxNumber: '',
      defaultTaxRate: 0,
    },
    mode: 'onChange',
  })

  const onSubmit = async (data: CompanyProfileFormData) => {
    try {
      if (!user?.id) {
        throw new Error('User must be logged in')
      }

      // Convert defaultTaxRate from percentage (e.g. 18) to decimal (e.g. 0.18) before sending
      const payload = {
        ...data,
        defaultTaxRate: data.defaultTaxRate / 100,
      }

      if (isEditing) {
        await updateProfile.mutateAsync(payload)
      } else {
        await createProfile.mutateAsync(payload)
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
        defaultTaxRate: profile.defaultTaxRate * 100,
      })
    } else {
      reset()
    }
    onCancel?.()
  }

  if (profileLoading) {
    return (
      <Card padding='none' className="w-full max-w-4xl mx-auto">
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
    <Card padding='none' className="w-full max-w-4xl mx-auto">
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
            description="Basic information about your business"
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
                label="State / Province / Region *"
                {...register('state')}
                error={errors.state?.message}
                placeholder="e.g. California, Ontario, England"
              />

              <Input
                label="Postal Code *"
                {...register('zipCode')}
                error={errors.zipCode?.message}
                placeholder="e.g. 10001, SW1A 1AA, 110001"
              />

              <Input
                label="Tax / VAT / GST Number"
                {...register('taxNumber')}
                error={errors.taxNumber?.message}
                placeholder="e.g. EIN, VAT, GSTIN, TIN"
                helpText="Optional — leave blank if not applicable"
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
                placeholder="+1 555 123 4567"
                helpText="Include country code for international numbers (e.g. +44 20 7946 0958)"
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
            title={
              <span className="flex items-center gap-2">
                <RiMoneyDollarCircleLine className="h-5 w-5 text-primary-600" />
                Default Rates
              </span>
            }
            description="Set your standard tax rate for new invoices"
            variant="bordered"
          >
            <FormGrid columns={1} gap="lg">
              <Controller
                name="defaultTaxRate"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Default Tax / GST Rate (%) *"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={field.value !== undefined && field.value !== null ? field.value : ''}
                    onChange={(e) => {
                      // User enters percentage (e.g. 18) → store as decimal (0.18) in form
                      const pct = parseFloat(e.target.value)
                      field.onChange(isNaN(pct) ? 0 : pct)
                    }}
                    error={errors.defaultTaxRate?.message}
                    placeholder="e.g. 18 or 12.5"
                    helpText="Enter as a percentage (e.g. 18 for 18%, 12.5 for 12.5%)"
                  />
                )}
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