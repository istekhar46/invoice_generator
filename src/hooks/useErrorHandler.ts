/**
 * Error Handler Hook
 * Provides centralized error handling functionality for components
 */

import { useState, useCallback } from 'react'
import type { ErrorType } from '../components/shared/ErrorDisplay'

export interface UseErrorHandlerOptions {
  onError?: (error: Error) => void
  defaultErrorType?: ErrorType
}

export interface ErrorState {
  error: Error | null
  errorType: ErrorType | null
  isError: boolean
}

/**
 * Hook for managing error state and handling errors consistently
 */
export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { onError, defaultErrorType = 'unknown' } = options
  
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    errorType: null,
    isError: false,
  })

  /**
   * Handle an error with optional type specification
   */
  const handleError = useCallback((error: Error | string, type?: ErrorType) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    const errorType = type || defaultErrorType

    setErrorState({
      error: errorObj,
      errorType,
      isError: true,
    })

    // Call optional error handler
    if (onError) {
      onError(errorObj)
    }

    // Log error for debugging
    console.error('Error handled:', errorObj, { type: errorType })
  }, [onError, defaultErrorType])

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      errorType: null,
      isError: false,
    })
  }, [])

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorType?: ErrorType
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        clearError()
        return await fn(...args)
      } catch (error) {
        handleError(error as Error, errorType)
        return null
      }
    }
  }, [handleError, clearError])

  /**
   * Wrap a synchronous function with error handling
   */
  const withSyncErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    errorType?: ErrorType
  ) => {
    return (...args: T): R | null => {
      try {
        clearError()
        return fn(...args)
      } catch (error) {
        handleError(error as Error, errorType)
        return null
      }
    }
  }, [handleError, clearError])

  return {
    ...errorState,
    handleError,
    clearError,
    withErrorHandling,
    withSyncErrorHandling,
  }
}

/**
 * Hook for handling async operations with loading and error states
 */
export interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  errorType?: ErrorType
}

export const useAsyncOperation = <T = any>(options: UseAsyncOperationOptions<T> = {}) => {
  const { onSuccess, onError, errorType = 'unknown' } = options
  
  const [loading, setLoading] = useState(false)
  const { error, isError, handleError, clearError } = useErrorHandler({ 
    onError, 
    defaultErrorType: errorType 
  })

  /**
   * Execute an async operation with loading and error handling
   */
  const execute = useCallback(async <R = T>(
    operation: () => Promise<R>
  ): Promise<R | null> => {
    setLoading(true)
    clearError()

    try {
      const result = await operation()
      
      if (onSuccess) {
        onSuccess(result as unknown as T)
      }
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      handleError(error, errorType)
      return null
    } finally {
      setLoading(false)
    }
  }, [clearError, handleError, onSuccess, errorType])

  /**
   * Reset the operation state
   */
  const reset = useCallback(() => {
    setLoading(false)
    clearError()
  }, [clearError])

  return {
    loading,
    error,
    isError,
    execute,
    reset,
    clearError,
  }
}