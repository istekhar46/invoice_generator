/**
 * Error Alert Component
 * Reusable component for displaying error messages with different severity levels
 */

import React from 'react'
import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react'
import { cn } from '../../utils/classNames'

export interface ErrorAlertProps {
  type?: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
}

const alertStyles = {
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700',
    button: 'text-red-400 hover:text-red-600 hover:bg-red-100',
    Icon: AlertTriangle,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
    button: 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700',
    button: 'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
    Icon: Info,
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-400',
    title: 'text-green-800',
    message: 'text-green-700',
    button: 'text-green-400 hover:text-green-600 hover:bg-green-100',
    Icon: CheckCircle,
  },
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  type = 'error',
  title,
  message,
  onDismiss,
  className,
}) => {
  const styles = alertStyles[type]
  const { Icon } = styles

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium', styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', title ? 'mt-2' : '', styles.message)}>
            {message}
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  styles.button
                )}
                onClick={onDismiss}
                aria-label="Dismiss alert"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}