import React from 'react'
import { cn } from '../../utils/classNames'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large'
  loading?: boolean
  children: React.ReactNode
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center',
      'font-semibold rounded-xl',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95', // Press effect
      'shadow-soft hover:shadow-medium',
      fullWidth && 'w-full'
    )

    const variants = {
      primary: cn(
        'bg-gradient-primary',
        'text-white',
        'hover:shadow-glow',
        'focus:ring-primary-500',
        'shadow-primary-500/20'
      ),
      secondary: cn(
        'bg-white border-2 border-gray-200',
        'text-gray-700',
        'hover:bg-gray-50 hover:border-gray-300',
        'focus:ring-gray-500'
      ),
      success: cn(
        'bg-gradient-success',
        'text-white',
        'hover:shadow-glow',
        'focus:ring-success-500',
        'shadow-success-500/20'
      ),
      danger: cn(
        'bg-gradient-danger',
        'text-white',
        'hover:shadow-glow',
        'focus:ring-danger-500',
        'shadow-danger-500/20'
      ),
      ghost: cn(
        'bg-transparent text-gray-700',
        'hover:bg-gray-100',
        'focus:ring-gray-500'
      ),
      // Backward compatibility - map outline to secondary
      outline: cn(
        'bg-white border-2 border-gray-200',
        'text-gray-700',
        'hover:bg-gray-50 hover:border-gray-300',
        'focus:ring-gray-500'
      ),
    }

    // Normalize size values for backward compatibility
    const normalizeSize = (size: string) => {
      switch (size) {
        case 'small': return 'sm'
        case 'medium': return 'md'
        case 'large': return 'lg'
        default: return size as 'sm' | 'md' | 'lg'
      }
    }

    const normalizedSize = normalizeSize(size)

    const sizes = {
      sm: 'px-4 py-2 text-sm min-h-[36px]',
      md: 'px-6 py-2.5 text-base min-h-[44px]', // Touch-friendly
      lg: 'px-8 py-3.5 text-lg min-h-[52px]',
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[normalizedSize],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }