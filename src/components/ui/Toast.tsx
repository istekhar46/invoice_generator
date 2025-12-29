/**
 * Toast Notification Component
 * Provides success, error, warning, and info notifications with auto-dismiss
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../utils/classNames'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ToastProps extends Toast {
  onDismiss: (id: string) => void
}

/**
 * Get toast configuration based on type
 */
const getToastConfig = (type: ToastType) => {
  const configs = {
    success: {
      icon: CheckCircle,
      className: 'bg-success-50 border-success-200 text-success-800',
      iconClassName: 'text-success-600',
    },
    error: {
      icon: XCircle,
      className: 'bg-danger-50 border-danger-200 text-danger-800',
      iconClassName: 'text-danger-600',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-warning-50 border-warning-200 text-warning-800',
      iconClassName: 'text-warning-600',
    },
    info: {
      icon: Info,
      className: 'bg-primary-50 border-primary-200 text-primary-800',
      iconClassName: 'text-primary-600',
    },
  }

  return configs[type]
}

/**
 * Individual Toast Component
 */
export const ToastComponent: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  action,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const config = getToastConfig(type)
  const { icon: Icon } = config

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(id)
    }, 300) // Match exit animation duration
  }

  return (
    <div
      className={cn(
        'flex items-start p-4 rounded-lg border shadow-lg max-w-md w-full transition-all duration-300 transform',
        config.className,
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isExiting && '-translate-x-full opacity-0'
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClassName)} />
      
      <div className="ml-3 flex-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        {message && (
          <p className="text-sm mt-1 opacity-90">{message}</p>
        )}
        
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline mt-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          >
            {action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={handleDismiss}
        className="ml-4 shrink-0 rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Toast Container Component
 */
export interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
}) => {
  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    }
    return positions[position]
  }

  if (toasts.length === 0) return null

  return createPortal(
    <div
      className={cn(
        'fixed z-50 flex flex-col space-y-3 pointer-events-none',
        getPositionClasses()
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent
            {...toast}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>,
    document.body
  )
}