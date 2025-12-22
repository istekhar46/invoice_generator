/**
 * Form Field Component
 * Enhanced form field wrapper with validation state and error display
 */

import React from 'react'
import { cn } from '../../utils/classNames'
import { AlertTriangle } from 'lucide-react'

export interface FormFieldProps {
  label?: string
  error?: string
  helpText?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helpText,
  required = false,
  children,
  className,
}) => {
  const fieldId = React.useId()

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-invalid': error ? 'true' : 'false',
          'aria-describedby': error
            ? `${fieldId}-error`
            : helpText
            ? `${fieldId}-help`
            : undefined,
        } as any)}
        
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-red-600 flex items-center"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p id={`${fieldId}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  )
}

export interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="border-b border-gray-200 pb-4">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-6">{children}</div>
    </div>
  )
}