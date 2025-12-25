/**
 * Toast Hook and Context
 * Provides global toast notification management
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastContainer, type Toast } from '../components/ui/Toast'

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
  // Convenience methods
  success: (title: string, message?: string, options?: Partial<Toast>) => string
  error: (title: string, message?: string, options?: Partial<Toast>) => string
  warning: (title: string, message?: string, options?: Partial<Toast>) => string
  info: (title: string, message?: string, options?: Partial<Toast>) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Generate unique ID for toasts
 */
const generateId = (): string => {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Toast Provider Component
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId()
    const newToast: Toast = {
      id,
      duration: 5000, // Default duration
      ...toast,
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return addToast({
      type: 'success',
      title,
      message,
      ...options,
    })
  }, [addToast])

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return addToast({
      type: 'error',
      title,
      message,
      duration: 7000, // Longer duration for errors
      ...options,
    })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return addToast({
      type: 'warning',
      title,
      message,
      duration: 6000, // Slightly longer for warnings
      ...options,
    })
  }, [addToast])

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>): string => {
    return addToast({
      type: 'info',
      title,
      message,
      ...options,
    })
  }, [addToast])

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Hook to use toast notifications
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Hook for error handling with toast notifications
 */
export const useErrorHandler = () => {
  const { error } = useToast()

  const handleError = useCallback((err: unknown, title = 'An error occurred') => {
    let message = 'Please try again later'
    
    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === 'string') {
      message = err
    } else if (err && typeof err === 'object' && 'message' in err) {
      message = String((err as any).message)
    }

    error(title, message)
  }, [error])

  return { handleError }
}