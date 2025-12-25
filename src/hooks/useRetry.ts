/**
 * Retry Hook
 * Provides enhanced retry mechanisms for failed operations with TanStack Query integration
 * Requirements: 8.6 - retry mechanisms for failed operations, 8.4 - offline support
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOnlineStatus } from './useOnlineStatus'
import { useOfflineQueue } from '../services/offline/offlineQueue.service'

export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryOnOffline?: boolean
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetrySuccess?: () => void
  onRetryFailure?: (error: unknown) => void
  queryKeysToInvalidate?: string[][]
}

export interface RetryState {
  isRetrying: boolean
  attemptCount: number
  lastError: unknown | null
  canRetry: boolean
  nextRetryIn?: number
}

/**
 * Enhanced hook for implementing retry logic with exponential backoff and offline support
 * Requirements: 8.6 - retry mechanisms for failed operations, 8.4 - offline support
 */
export function useRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryOnOffline = false,
    shouldRetry = (error, attempt) => {
      // Default retry logic with enhanced error handling
      if (attempt >= maxAttempts) return false
      
      // Don't retry on authentication errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status
        if (status === 401 || status === 403) return false
        // Don't retry on client errors (except timeout and rate limit)
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false
      }
      
      return true
    },
    onRetrySuccess,
    onRetryFailure,
    queryKeysToInvalidate = [],
  } = options

  const { isOnline } = useOnlineStatus()
  const { enqueue } = useOfflineQueue()
  const queryClient = useQueryClient()
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null,
    canRetry: true,
  })

  const timeoutRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay)
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }, [baseDelay, backoffFactor, maxDelay])

  const startCountdown = useCallback((delay: number) => {
    setState(prev => ({ ...prev, nextRetryIn: Math.ceil(delay / 1000) }))
    
    const updateCountdown = () => {
      setState(prev => {
        const nextRetryIn = prev.nextRetryIn ? prev.nextRetryIn - 1 : 0
        if (nextRetryIn <= 0) {
          return { ...prev, nextRetryIn: undefined }
        }
        return { ...prev, nextRetryIn }
      })
    }

    countdownRef.current = setInterval(updateCountdown, 1000) as unknown as number
    
    setTimeout(() => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        setState(prev => ({ ...prev, nextRetryIn: undefined }))
      }
    }, delay)
  }, [])

  const executeWithRetry = useCallback(async (): Promise<T> => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }

    // Check if we should retry based on online status
    if (!isOnline && !retryOnOffline) {
      // Queue operation for later if offline
      const queueId = enqueue({
        type: 'create', // This would need to be determined based on the operation
        entity: 'customer', // This would need to be determined based on the operation
        data: {}, // This would need to be the operation data
        maxRetries: maxAttempts,
      })
      throw new Error(`Operation queued for offline processing (ID: ${queueId})`)
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastError: null,
      nextRetryIn: undefined,
    }))

    const attemptOperation = async (attempt: number): Promise<T> => {
      try {
        const result = await operation()
        
        // Success - reset state and invalidate queries
        setState({
          isRetrying: false,
          attemptCount: 0,
          lastError: null,
          canRetry: true,
        })

        // Invalidate specified query keys on success
        if (queryKeysToInvalidate.length > 0) {
          queryKeysToInvalidate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey })
          })
        }

        onRetrySuccess?.()
        return result
      } catch (error) {
        const nextAttempt = attempt + 1
        const canRetryNext = shouldRetry(error, nextAttempt) && nextAttempt <= maxAttempts
        
        setState(prev => ({
          ...prev,
          attemptCount: nextAttempt,
          lastError: error,
          canRetry: canRetryNext,
        }))

        if (!canRetryNext) {
          setState(prev => ({ ...prev, isRetrying: false }))
          onRetryFailure?.(error)
          throw error
        }

        // Calculate delay and retry
        const delay = calculateDelay(attempt)
        startCountdown(delay)
        
        return new Promise<T>((resolve, reject) => {
          timeoutRef.current = setTimeout(async () => {
            try {
              const result = await attemptOperation(nextAttempt)
              resolve(result)
            } catch (retryError) {
              reject(retryError)
            }
          }, delay) as unknown as number
        })
      }
    }

    return attemptOperation(0)
  }, [
    operation, 
    shouldRetry, 
    calculateDelay, 
    isOnline, 
    retryOnOffline, 
    maxAttempts,
    queryKeysToInvalidate,
    queryClient,
    enqueue,
    onRetrySuccess,
    onRetryFailure,
    startCountdown
  ])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null,
      canRetry: true,
    })
  }, [])

  const manualRetry = useCallback(async (): Promise<T> => {
    if (!state.canRetry) {
      throw new Error('Cannot retry - maximum attempts reached')
    }
    
    return executeWithRetry()
  }, [executeWithRetry, state.canRetry])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  return {
    ...state,
    execute: executeWithRetry,
    retry: manualRetry,
    reset,
  }
}

/**
 * Enhanced hook for retry with TanStack Query integration
 */
export function useQueryRetry(
  queryFn: () => Promise<any>, 
  options: RetryOptions & { queryKey?: string[] } = {}
) {
  const { queryKey, ...retryOptions } = options
  
  const enhancedOptions: RetryOptions = {
    ...retryOptions,
    queryKeysToInvalidate: queryKey ? [queryKey] : [],
  }
  
  const { execute, ...retryState } = useRetry(queryFn, enhancedOptions)
  
  return {
    ...retryState,
    refetch: execute,
  }
}

/**
 * Enhanced hook for mutation retry with offline queueing
 */
export function useMutationRetry<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: RetryOptions & { 
    entityType?: 'customer' | 'invoice' | 'company'
    operationType?: 'create' | 'update' | 'delete'
  } = {}
) {
  const { entityType = 'customer', operationType = 'create', ...retryOptions } = options
  const [lastVariables, setLastVariables] = useState<TVariables | null>(null)
  const { enqueue } = useOfflineQueue()
  const { isOnline } = useOnlineStatus()
  
  const wrappedMutation = useCallback(async () => {
    if (!lastVariables) {
      throw new Error('No variables available for retry')
    }
    return mutationFn(lastVariables)
  }, [mutationFn, lastVariables])

  const enhancedOptions: RetryOptions = {
    ...retryOptions,
    shouldRetry: (error, attempt) => {
      // If offline, queue the operation instead of retrying
      if (!isOnline) {
        if (lastVariables) {
          enqueue({
            type: operationType,
            entity: entityType,
            data: lastVariables,
            maxRetries: retryOptions.maxAttempts || 3,
          })
        }
        return false
      }
      
      // Use default retry logic if online
      return retryOptions.shouldRetry ? retryOptions.shouldRetry(error, attempt) : true
    },
  }

  const { execute, retry, ...retryState } = useRetry(wrappedMutation, enhancedOptions)

  const mutateWithRetry = useCallback(async (variables: TVariables): Promise<TData> => {
    setLastVariables(variables)
    return execute()
  }, [execute])

  return {
    ...retryState,
    mutate: mutateWithRetry,
    retry,
  }
}

/**
 * Enhanced hook for automatic retry on network reconnection with queue processing
 */
export function useAutoRetryOnReconnect(
  operation: () => Promise<any>,
  options: { 
    enabled?: boolean
    delay?: number
    processQueue?: boolean
    queryKeysToInvalidate?: string[][]
  } = {}
) {
  const { enabled = true, delay = 1000, processQueue = true, queryKeysToInvalidate = [] } = options
  const { isOnline, wasOffline } = useOnlineStatus()
  const { processQueue: processOfflineQueue } = useOfflineQueue()
  const queryClient = useQueryClient()
  const hasRetriedRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    // Retry when coming back online after being offline
    if (isOnline && wasOffline && !hasRetriedRef.current) {
      hasRetriedRef.current = true
      
      const timer = setTimeout(async () => {
        try {
          // Process offline queue first if enabled
          if (processQueue) {
            await processOfflineQueue()
          }
          
          // Then execute the specific operation
          await operation()
          
          // Invalidate specified queries
          if (queryKeysToInvalidate.length > 0) {
            queryKeysToInvalidate.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey })
            })
          }
        } catch (error) {
          console.error('Auto-retry failed:', error)
        }
      }, delay)

      return () => clearTimeout(timer)
    }

    // Reset retry flag when going offline
    if (!isOnline) {
      hasRetriedRef.current = false
    }
  }, [
    isOnline, 
    wasOffline, 
    enabled, 
    delay, 
    operation, 
    processQueue, 
    processOfflineQueue, 
    queryKeysToInvalidate, 
    queryClient
  ])
}

/**
 * Hook for batch retry operations with progress tracking
 */
export function useBatchRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions & { 
    concurrency?: number
    onProgress?: (completed: number, total: number, failed: number) => void
  } = {}
) {
  const { concurrency = 3, onProgress, ...retryOptions } = options
  const [state, setState] = useState({
    isRetrying: false,
    completed: 0,
    failed: 0,
    total: operations.length,
    results: [] as Array<{ success: boolean; result?: T; error?: unknown }>,
  })

  const executeBatch = useCallback(async () => {
    setState(prev => ({ ...prev, isRetrying: true, completed: 0, failed: 0, results: [] }))
    
    const results: Array<{ success: boolean; result?: T; error?: unknown }> = []
    let completed = 0
    let failed = 0

    // Process operations in batches with concurrency limit
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async (operation, index) => {
        const { execute } = useRetry(operation, retryOptions)
        
        try {
          const result = await execute()
          const resultItem = { success: true, result }
          results[i + index] = resultItem
          completed++
          onProgress?.(completed, operations.length, failed)
          return resultItem
        } catch (error) {
          const resultItem = { success: false, error }
          results[i + index] = resultItem
          failed++
          onProgress?.(completed, operations.length, failed)
          return resultItem
        }
      })

      await Promise.all(batchPromises)
    }

    setState(prev => ({ 
      ...prev, 
      isRetrying: false, 
      completed, 
      failed, 
      results 
    }))

    return results
  }, [operations, concurrency, retryOptions, onProgress])

  return {
    ...state,
    execute: executeBatch,
  }
}