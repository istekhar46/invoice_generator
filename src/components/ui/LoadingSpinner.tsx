/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and styles
 */

import React from 'react'
import { cn } from '../../utils/classNames'

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  label?: string
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-8 w-8',
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className,
  label = 'Loading...',
}) => {
  return (
    <div className="flex items-center justify-center" role="status" aria-label={label}>
      <svg
        className={cn(
          'animate-spin text-blue-600',
          sizeClasses[size],
          className
        )}
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
      <span className="sr-only">{label}</span>
    </div>
  )
}

export interface LoadingOverlayProps {
  loading: boolean
  children: React.ReactNode
  message?: string
  className?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  message = 'Loading...',
  className,
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}