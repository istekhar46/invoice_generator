/**
 * Error Message Utility
 * Maps technical error messages to user-friendly alternatives
 * Requirements: 12.5 - User-friendly error messages without technical details
 */

export interface ErrorContext {
  status?: number
  statusText?: string
  operation?: 'login' | 'register' | 'logout' | 'refresh' | 'fetch' | 'update' | 'delete' | 'create'
  isOnline?: boolean
}

/**
 * Get user-friendly error message based on error details
 */
export function getUserFriendlyErrorMessage(
  error: any,
  context: ErrorContext = {}
): { title: string; message: string } {
  const { status, operation, isOnline = true } = context

  // Handle offline state first
  if (!isOnline) {
    return {
      title: 'No Internet Connection',
      message: 'Please check your connection and try again',
    }
  }

  // Handle network errors (no response from server)
  if (status === 0 || !status) {
    return {
      title: 'Connection Problem',
      message: 'Unable to reach the server. Please check your internet connection',
    }
  }

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      return getValidationErrorMessage(error, operation)
    
    case 401:
      return getAuthenticationErrorMessage(operation)
    
    case 403:
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action',
      }
    
    case 404:
      return {
        title: 'Not Found',
        message: 'The requested information could not be found',
      }
    
    case 409:
      return getConflictErrorMessage(error, operation)
    
    case 422:
      return getValidationErrorMessage(error, operation)
    
    case 429:
      return {
        title: 'Too Many Attempts',
        message: 'Please wait a moment before trying again',
      }
    
    case 500:
    case 502:
    case 503:
    case 504:
      return getServerErrorMessage(status)
    
    default:
      return {
        title: 'Something Went Wrong',
        message: 'Please try again in a moment',
      }
  }
}

/**
 * Get validation error message
 */
function getValidationErrorMessage(
  error: any,
  operation?: string
): { title: string; message: string } {
  // Try to extract a user-friendly message from the error
  const errorMessage = extractErrorMessage(error)
  
  // If we have a specific validation message, use it
  if (errorMessage && !isTechnicalMessage(errorMessage)) {
    return {
      title: 'Invalid Information',
      message: errorMessage,
    }
  }

  // Otherwise, provide operation-specific guidance
  switch (operation) {
    case 'login':
      return {
        title: 'Login Failed',
        message: 'Please check your email and password',
      }
    
    case 'register':
      return {
        title: 'Registration Failed',
        message: 'Please check your information and try again',
      }
    
    default:
      return {
        title: 'Invalid Information',
        message: 'Please check your input and try again',
      }
  }
}

/**
 * Get authentication error message
 */
function getAuthenticationErrorMessage(
  operation?: string
): { title: string; message: string } {
  switch (operation) {
    case 'login':
      return {
        title: 'Login Failed',
        message: 'Incorrect email or password',
      }
    
    case 'refresh':
      return {
        title: 'Session Expired',
        message: 'Please log in again to continue',
      }
    
    default:
      return {
        title: 'Authentication Required',
        message: 'Please log in to continue',
      }
  }
}

/**
 * Get conflict error message
 */
function getConflictErrorMessage(
  error: any,
  _operation?: string
): { title: string; message: string } {
  const errorMessage = extractErrorMessage(error)
  
  // Check for common conflict scenarios
  if (errorMessage?.toLowerCase().includes('email')) {
    return {
      title: 'Email Already Registered',
      message: 'This email is already in use. Please use a different email or try logging in',
    }
  }
  
  if (errorMessage?.toLowerCase().includes('exists')) {
    return {
      title: 'Already Exists',
      message: 'This item already exists. Please try a different name',
    }
  }

  return {
    title: 'Conflict',
    message: 'This action conflicts with existing data. Please refresh and try again',
  }
}

/**
 * Get server error message
 */
function getServerErrorMessage(status: number): { title: string; message: string } {
  switch (status) {
    case 500:
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later',
      }
    
    case 502:
    case 503:
      return {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again in a few minutes',
      }
    
    case 504:
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again',
      }
    
    default:
      return {
        title: 'Server Error',
        message: 'Something went wrong. Please try again later',
      }
  }
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: any): string | null {
  if (!error) return null
  
  // Check common error message locations
  if (typeof error === 'string') return error
  if (error.message && typeof error.message === 'string') return error.message
  if (error.data?.message && typeof error.data.message === 'string') return error.data.message
  if (error.error && typeof error.error === 'string') return error.error
  
  return null
}

/**
 * Check if a message contains technical details that should be hidden
 */
function isTechnicalMessage(message: string): boolean {
  const technicalPatterns = [
    /stack trace/i,
    /\bat\s+\w+\.\w+/i, // Stack trace patterns like "at Object.method"
    /error:\s*\w+Error/i, // Error type names
    /prisma/i,
    /database/i,
    /sql/i,
    /query/i,
    /constraint/i,
    /foreign key/i,
    /unique constraint/i,
    /null value/i,
    /column/i,
    /table/i,
    /jwt/i,
    /token/i,
    /bearer/i,
    /authorization/i,
    /internal server error/i,
    /500/,
    /502/,
    /503/,
    /504/,
  ]
  
  return technicalPatterns.some(pattern => pattern.test(message))
}

/**
 * Sanitize error message by removing technical details
 */
export function sanitizeErrorMessage(message: string): string {
  if (isTechnicalMessage(message)) {
    return 'An error occurred. Please try again'
  }
  
  return message
}

/**
 * Get operation-specific error context
 */
export function getOperationContext(url: string): ErrorContext['operation'] {
  if (url.includes('/auth/login')) return 'login'
  if (url.includes('/auth/register')) return 'register'
  if (url.includes('/auth/logout')) return 'logout'
  if (url.includes('/auth/refresh')) return 'refresh'
  
  // Determine operation from HTTP method (would need to be passed in)
  return 'fetch'
}
