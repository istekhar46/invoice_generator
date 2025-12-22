import React, { useId } from 'react'
import { cn } from '../../utils/classNames'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  success?: boolean
  variant?: 'default' | 'filled' | 'outlined'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text', 
    label, 
    error, 
    helpText, 
    success = false,
    variant = 'default',
    id, 
    ...props 
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId

    const variants = {
      default: cn(
        'w-full px-4 py-3 rounded-xl text-base',
        'border-2 border-gray-200',
        'bg-gray-50',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'focus:border-transparent focus:bg-white',
        'hover:border-gray-300',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        'placeholder:text-gray-400',
        'min-h-[44px]', // Touch-friendly
      ),
      filled: cn(
        'w-full px-4 py-3 rounded-xl text-base',
        'border-2 border-transparent',
        'bg-gray-100',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'focus:border-primary-500 focus:bg-white',
        'hover:bg-gray-150',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        'placeholder:text-gray-400',
        'min-h-[44px]',
      ),
      outlined: cn(
        'w-full px-4 py-3 rounded-xl text-base',
        'border-2 border-gray-300',
        'bg-white',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        'focus:border-primary-500',
        'hover:border-gray-400',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',
        'placeholder:text-gray-400',
        'min-h-[44px]',
      ),
    }

    const getStateClasses = () => {
      if (error) {
        return 'border-danger-500 focus:ring-danger-500 focus:border-danger-500 bg-red-50'
      }
      if (success) {
        return 'border-success-500 focus:ring-success-500 focus:border-success-500 bg-green-50'
      }
      return ''
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              variants[variant],
              getStateClasses(),
              // Mobile keyboard optimization
              'touch-target',
              className
            )}
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helpText
                ? `${inputId}-help`
                : undefined
            }
            // Mobile keyboard optimization attributes
            autoComplete={props.autoComplete || 'off'}
            inputMode={
              type === 'email' ? 'email' :
              type === 'tel' ? 'tel' :
              type === 'number' ? 'numeric' :
              type === 'url' ? 'url' :
              'text'
            }
            {...props}
          />
          
          {/* State Icons */}
          {(error || success) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {error && (
                <AlertTriangle className="h-5 w-5 text-danger-500" aria-hidden="true" />
              )}
              {success && !error && (
                <CheckCircle className="h-5 w-5 text-success-500" aria-hidden="true" />
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-sm text-danger-600 flex items-center animate-fade-in"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        
        {success && !error && (
          <p
            className="mt-2 text-sm text-success-600 flex items-center animate-fade-in"
          >
            <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
            Input is valid
          </p>
        )}
        
        {helpText && !error && !success && (
          <p id={`${inputId}-help`} className="mt-2 text-sm text-gray-500">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }