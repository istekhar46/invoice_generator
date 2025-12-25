/**
 * Customer Form Component
 * Form for creating and editing customer information
 */

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CustomerFormData } from '../../../types/forms'
import { customerSchema } from '../../../types/forms'
import type { Customer } from '../../../types/entities'
import { useCreateCustomer, useUpdateCustomer } from '../../../hooks/useCustomers'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { FormSection, FormGrid, FormActions } from '../../ui/FormField'

interface CustomerFormProps {
  customer?: Customer | null
  onSuccess?: () => void
  onCancel?: () => void
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  customer,
  onSuccess,
  onCancel,
}) => {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const isEditing = !!customer
  const loading = createCustomer.isPending || updateCustomer.isPending
  const error = createCustomer.error || updateCustomer.error

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
    } : {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
    },
    mode: 'onChange',
  })

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (isEditing && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, data })
      } else {
        await createCustomer.mutateAsync(data)
      }
      
      onSuccess?.()
    } catch (error) {
      // Error is handled by the mutation hooks
      console.error('Form submission failed:', error)
    }
  }

  const handleCancel = () => {
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zipCode,
      })
    } else {
      reset()
    }
    onCancel?.()
  }

  return (
    <Card className="w-full max-w- 3xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Customer' : 'Add New Customer'}
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

          {/* Customer Information Section */}
          <FormSection
            title="Customer Information"
            description="Basic contact details for your customer"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
              <div className="sm:col-span-2">
                <Input
                  label="Customer Name *"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="John Doe"
                />
              </div>

              <Input
                label="Email *"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="john@example.com"
              />

              <Input
                label="Phone *"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="(555) 123-4567"
              />
            </FormGrid>
          </FormSection>

          {/* Address Information Section */}
          <FormSection
            title="Address Information"
            description="Service location for this customer"
            variant="bordered"
          >
            <FormGrid columns={2} gap="lg">
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

              <div className="sm:col-span-2">
                <Input
                  label="Zip Code *"
                  {...register('zipCode')}
                  error={errors.zipCode?.message}
                  placeholder="12345"
                />
              </div>
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
              disabled={!isValid || loading || (!isDirty && isEditing)}
            >
              {isEditing ? 'Update Customer' : 'Add Customer'}
            </Button>
          </FormActions>
        </CardContent>
      </form>
    </Card>
  )
}