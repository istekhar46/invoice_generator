import { useEffect, useRef } from 'react'
import type { CancelTokenSource } from 'axios'
import { apiClient } from '../services/api/apiClient'

/**
 * Hook for managing request cancellation on component unmount
 * Returns a cancel token source that automatically cancels on unmount
 */
export function useRequestCancellation() {
  const cancelTokenRef = useRef<CancelTokenSource | null>(null)

  // Create a new cancel token
  const createCancelToken = () => {
    // Cancel previous token if it exists
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Component unmounted or new request initiated')
    }
    
    // Create new cancel token
    cancelTokenRef.current = apiClient.createCancelToken()
    return cancelTokenRef.current
  }

  // Cancel all requests on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted')
      }
    }
  }, [])

  return {
    createCancelToken,
    cancelToken: cancelTokenRef.current?.token,
    cancel: (message?: string) => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel(message || 'Request cancelled')
      }
    },
  }
}

/**
 * Hook for handling API errors with user-friendly messages
 */
export function useApiErrorHandler() {
  const handleError = (error: any) => {
    // Don't handle cancellation errors
    if (apiClient.isCancelError(error)) {
      return null
    }

    // Get user-friendly error message
    const message = apiClient.getErrorMessage(error)
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('API Error:', error)
    }

    return message
  }

  return { handleError }
}