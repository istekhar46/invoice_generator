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
  variant?: 'default' | 'elevated' | 'bordered'
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
  variant = 'default',
}) => {
  const variants = {
    default: 'space-y-6',
    elevated: cn(
      'bg-gray-50/50 rounded-2xl p-6 space-y-6',
      'border border-gray-100',
      'transition-all duration-300',
      'hover:bg-gray-50/70 hover:shadow-soft'
    ),
    bordered: cn(
      'border border-gray-200 rounded-2xl p-6 space-y-6',
      'bg-white',
      'transition-all duration-300',
      'hover:border-gray-300 hover:shadow-soft'
    ),
  }

  return (
    <div className={cn(variants[variant], className)}>
      {(title || description) && (
        <div className={cn(
          'pb-4',
          variant === 'default' ? 'border-b border-gray-200' : ''
        )}>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-6">{children}</div>
    </div>
  )
}

export interface FormGridProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

export const FormGrid: React.FC<FormGridProps> = ({
  children,
  className,
  columns = 2,
  gap = 'md',
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  }

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

export interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
  responsive?: boolean
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  align = 'between',
  responsive = true,
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }

  return (
    <div className={cn(
      'flex items-center',
      alignClasses[align],
      // Enhanced responsive behavior for mobile optimization
      responsive && 'flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3',
      !responsive && 'space-x-3',
      'pt-6 border-t border-gray-200',
      className
    )}>
      {responsive ? (
        React.Children.map(children, (child, index) => {
          // Clone button children to add fullWidth on mobile with touch-friendly sizing
          if (React.isValidElement(child)) {
            return (
              <div className={cn(
                'w-full sm:w-auto',
                index === 0 && align === 'between' ? 'sm:mr-auto' : '',
                index === React.Children.count(children) - 1 && align === 'between' ? 'sm:ml-auto' : ''
              )}>
                {React.cloneElement(child, {
                  className: cn(
                    'w-full sm:w-auto min-h-[44px]', // Ensure touch-friendly height
                    (child.props as any).className
                  )
                } as any)}
              </div>
            )
          }
          return (
            <div className={cn(
              'w-full sm:w-auto',
              index === 0 && align === 'between' ? 'sm:mr-auto' : '',
              index === React.Children.count(children) - 1 && align === 'between' ? 'sm:ml-auto' : ''
            )}>
              {child}
            </div>
          )
        })
      ) : children}
    </div>
  )
}