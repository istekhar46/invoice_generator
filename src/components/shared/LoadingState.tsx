/**
 * Loading State Components
 * Enhanced loading indicators for different scenarios and async operations
 */

import React from 'react'
import { Loader2, Database, FileText, Users, Calculator } from 'lucide-react'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { cn } from '../../utils/classNames'

export type LoadingType = 
  | 'default'
  | 'data'
  | 'saving'
  | 'loading'
  | 'processing'
  | 'generating'
  | 'authenticating'
  | 'uploading'

export interface LoadingStateProps {
  loading: boolean
  type?: LoadingType
  message?: string
  children: React.ReactNode
  overlay?: boolean
  className?: string
}

/**
 * Get loading configuration based on loading type
 */
const getLoadingConfig = (type: LoadingType) => {
  const configs = {
    default: {
      icon: Loader2,
      message: 'Loading...',
    },
    data: {
      icon: Database,
      message: 'Loading data...',
    },
    saving: {
      icon: Database,
      message: 'Saving...',
    },
    loading: {
      icon: Loader2,
      message: 'Loading...',
    },
    processing: {
      icon: Calculator,
      message: 'Processing...',
    },
    generating: {
      icon: FileText,
      message: 'Generating...',
    },
    authenticating: {
      icon: Users,
      message: 'Authenticating...',
    },
    uploading: {
      icon: FileText,
      message: 'Uploading...',
    },
  }

  return configs[type] || configs.default
}

/**
 * LoadingState component that shows loading overlay or inline loading
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  type = 'default',
  message,
  children,
  overlay = true,
  className,
}) => {
  const config = getLoadingConfig(type)
  const loadingMessage = message || config.message
  const { icon: Icon } = config

  if (!loading) {
    return <>{children}</>
  }

  if (overlay) {
    return (
      <div className={cn('relative', className)}>
        {children}
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-md">
          <div className="text-center">
            <Icon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{loadingMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <div className="text-center">
        <Icon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-sm text-gray-600">{loadingMessage}</p>
      </div>
    </div>
  )
}

/**
 * Inline loading indicator for buttons and small components
 */
export interface InlineLoadingProps {
  loading: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  loading,
  size = 'small',
  className,
}) => {
  if (!loading) return null

  return (
    <LoadingSpinner 
      size={size} 
      className={cn('inline-block', className)} 
    />
  )
}

/**
 * Button loading state component
 */
export interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  loadingText,
  className,
}) => {
  if (loading) {
    return (
      <span className={cn('flex items-center', className)}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {loadingText || 'Loading...'}
      </span>
    )
  }

  return <>{children}</>
}

/**
 * Page loading component for full-page loading states
 */
export interface PageLoadingProps {
  message?: string
  type?: LoadingType
  className?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message,
  type = 'loading',
  className,
}) => {
  const config = getLoadingConfig(type)
  const loadingMessage = message || config.message
  const { icon: Icon } = config

  return (
    <div className={cn('min-h-screen bg-gray-50 flex items-center justify-center', className)}>
      <div className="text-center">
        <Icon className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          {loadingMessage}
        </h2>
        <p className="text-sm text-gray-500">
          Please wait while we process your request...
        </p>
      </div>
    </div>
  )
}

/**
 * Skeleton loading component for content placeholders
 */
export interface SkeletonProps {
  className?: string
  lines?: number
  avatar?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  lines = 3,
  avatar = false,
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="rounded-full bg-gray-300 h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-4 bg-gray-300 rounded',
              index === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Table skeleton for loading table data
 */
export interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={`header-${index}`} className="h-4 bg-gray-300 rounded" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            className="grid gap-4" 
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div 
                key={`cell-${rowIndex}-${colIndex}`} 
                className="h-4 bg-gray-200 rounded" 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}