/**
 * Error Display Component
 * Centralized component for displaying various types of application errors
 */

import React from 'react'
import { AlertTriangle, Wifi, Database, FileX, RefreshCw } from 'lucide-react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { Button } from '../ui/Button'
import { sanitizeErrorMessage } from '../../utils/errorMessages'

export type ErrorType = 
  | 'network'
  | 'storage'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not-found'
  | 'server'
  | 'unknown'

export interface ErrorDisplayProps {
  error: Error | string | null
  type?: ErrorType
  title?: string
  showRetry?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

/**
 * Get error configuration based on error type
 */
const getErrorConfig = (type: ErrorType) => {
  const configs = {
    network: {
      icon: Wifi,
      title: 'Network Error',
      description: 'Unable to connect to the server. Please check your internet connection.',
      color: 'error' as const,
    },
    storage: {
      icon: Database,
      title: 'Storage Error',
      description: 'Unable to save or load data. Please check if local storage is available.',
      color: 'error' as const,
    },
    validation: {
      icon: AlertTriangle,
      title: 'Validation Error',
      description: 'Please check your input and try again.',
      color: 'warning' as const,
    },
    authentication: {
      icon: AlertTriangle,
      title: 'Authentication Error',
      description: 'Please check your credentials and try again.',
      color: 'error' as const,
    },
    authorization: {
      icon: AlertTriangle,
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
      color: 'error' as const,
    },
    'not-found': {
      icon: FileX,
      title: 'Not Found',
      description: 'The requested resource could not be found.',
      color: 'warning' as const,
    },
    server: {
      icon: AlertTriangle,
      title: 'Server Error',
      description: 'An error occurred on the server. Please try again later.',
      color: 'error' as const,
    },
    unknown: {
      icon: AlertTriangle,
      title: 'Unexpected Error',
      description: 'An unexpected error occurred. Please try again.',
      color: 'error' as const,
    },
  }

  return configs[type] || configs.unknown
}

/**
 * Extract error message from various error types and sanitize it
 */
const getErrorMessage = (error: Error | string | null): string => {
  if (!error) return 'An unknown error occurred'
  
  let message: string
  
  if (typeof error === 'string') {
    message = error
  } else if (error instanceof Error) {
    message = error.message || 'An unknown error occurred'
  } else {
    message = 'An unknown error occurred'
  }
  
  // Sanitize the message to remove technical details
  return sanitizeErrorMessage(message)
}

/**
 * Determine error type from error message or error object
 */
const inferErrorType = (error: Error | string | null): ErrorType => {
  const message = getErrorMessage(error).toLowerCase()
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  
  if (message.includes('storage') || message.includes('localstorage') || message.includes('quota')) {
    return 'storage'
  }
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'validation'
  }
  
  if (message.includes('authentication') || message.includes('login') || message.includes('credentials')) {
    return 'authentication'
  }
  
  if (message.includes('authorization') || message.includes('permission') || message.includes('access denied')) {
    return 'authorization'
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'not-found'
  }
  
  if (message.includes('server') || message.includes('500') || message.includes('503')) {
    return 'server'
  }
  
  return 'unknown'
}

/**
 * ErrorDisplay component for showing contextual error messages
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type,
  title,
  showRetry = false,
  onRetry,
  onDismiss,
  className,
}) => {
  if (!error) return null

  const errorType = type || inferErrorType(error)
  const config = getErrorConfig(errorType)
  const errorMessage = getErrorMessage(error)
  const errorTitle = title || config.title

  return (
    <div className={className}>
      <ErrorAlert
        type={config.color}
        title={errorTitle}
        message={errorMessage}
        onDismiss={onDismiss}
      />
      
      {showRetry && onRetry && (
        <div className="mt-3 flex justify-center">
          <Button
            onClick={onRetry}
            variant="outline"
            size="small"
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Inline error display for form fields and smaller components
 */
export interface InlineErrorProps {
  error: string | null
  className?: string
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, className }) => {
  if (!error) return null

  return (
    <div className={`flex items-center mt-1 text-sm text-red-600 ${className || ''}`}>
      <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

/**
 * Full-page error display for critical errors
 */
export interface FullPageErrorProps {
  error: Error | string
  type?: ErrorType
  onRetry?: () => void
  onGoHome?: () => void
}

export const FullPageError: React.FC<FullPageErrorProps> = ({
  error,
  type,
  onRetry,
  onGoHome,
}) => {
  const errorType = type || inferErrorType(error)
  const config = getErrorConfig(errorType)
  const errorMessage = getErrorMessage(error)
  const { icon: Icon } = config

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <Icon className="h-12 w-12 text-red-500" />
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {config.title}
        </h1>
        
        <p className="text-gray-600 mb-2">
          {config.description}
        </p>
        
        {errorMessage !== config.description && (
          <p className="text-sm text-gray-500 mb-6">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="primary"
              className="flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {onGoHome && (
            <Button
              onClick={onGoHome}
              variant="outline"
              className="flex items-center justify-center"
            >
              Go Home
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}