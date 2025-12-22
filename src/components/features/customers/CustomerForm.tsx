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
import { useCustomerStore } from '../../../store/customerStore'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card'

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
  const { loading, error, addCustomer, updateCustomer, clearError } = useCustomerStore()

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

  const isEditing = !!customer

  const onSubmit = async (data: CustomerFormData) => {
    try {
      clearError()
      
      if (isEditing && customer) {
        await updateCustomer(customer.id, data)
      } else {
        await addCustomer(data)
      }
      
      onSuccess?.()
    } catch (error) {
      // Error is handled by the store
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
    clearError()
    onCancel?.()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Customer' : 'Add New Customer'}
        </CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Customer Information</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Address Information</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
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
        </CardFooter>
      </form>
    </Card>
  )
}