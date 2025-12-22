/**
 * Shimmer Loading Components
 * Modern shimmer effects for loading states with smooth animations
 */

import React from 'react'
import { cn } from '../../utils/classNames'

export interface ShimmerProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

/**
 * Base shimmer component with customizable dimensions
 */
export const Shimmer: React.FC<ShimmerProps> = ({
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        'bg-[length:200px_100%]',
        width,
        height,
        roundedClasses[rounded],
        className
      )}
    />
  )
}

/**
 * Card shimmer loading component
 */
export interface ShimmerCardProps {
  className?: string
  showAvatar?: boolean
  lines?: number
  padding?: 'sm' | 'md' | 'lg'
}

export const ShimmerCard: React.FC<ShimmerCardProps> = ({
  className,
  showAvatar = false,
  lines = 3,
  padding = 'md',
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-2xl shadow-soft',
      paddingClasses[padding],
      className
    )}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <Shimmer width="w-12" height="h-12" rounded="full" />
          <div className="flex-1 space-y-2">
            <Shimmer width="w-3/4" height="h-4" />
            <Shimmer width="w-1/2" height="h-3" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Shimmer
            key={index}
            width={index === lines - 1 ? 'w-2/3' : 'w-full'}
            height="h-4"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Table shimmer loading component
 */
export interface ShimmerTableProps {
  rows?: number
  columns?: number
  className?: string
  showHeader?: boolean
}

export const ShimmerTable: React.FC<ShimmerTableProps> = ({
  rows = 5,
  columns = 4,
  className,
  showHeader = true,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Shimmer key={`header-${index}`} height="h-5" />
          ))}
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            className="grid gap-4" 
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Shimmer 
                key={`cell-${rowIndex}-${colIndex}`} 
                height="h-4"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Dashboard stats shimmer loading
 */
export interface ShimmerStatsProps {
  cards?: number
  className?: string
}

export const ShimmerStats: React.FC<ShimmerStatsProps> = ({
  cards = 4,
  className,
}) => {
  return (
    <div className={cn(
      'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4',
      className
    )}>
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-2xl shadow-soft p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Shimmer width="w-20" height="h-4" className="mb-2" />
              <Shimmer width="w-16" height="h-8" className="mb-2" />
              <Shimmer width="w-12" height="h-4" />
            </div>
            <Shimmer width="w-12" height="h-12" rounded="xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * List item shimmer loading
 */
export interface ShimmerListProps {
  items?: number
  showAvatar?: boolean
  showActions?: boolean
  className?: string
}

export const ShimmerList: React.FC<ShimmerListProps> = ({
  items = 5,
  showAvatar = true,
  showActions = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4"
        >
          {showAvatar && (
            <Shimmer width="w-10" height="h-10" rounded="full" />
          )}
          
          <div className="flex-1 space-y-2">
            <Shimmer width="w-3/4" height="h-4" />
            <Shimmer width="w-1/2" height="h-3" />
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              <Shimmer width="w-8" height="h-8" rounded="md" />
              <Shimmer width="w-8" height="h-8" rounded="md" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Form shimmer loading
 */
export interface ShimmerFormProps {
  fields?: number
  showButtons?: boolean
  className?: string
}

export const ShimmerForm: React.FC<ShimmerFormProps> = ({
  fields = 4,
  showButtons = true,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Shimmer width="w-24" height="h-4" />
          <Shimmer width="w-full" height="h-11" rounded="xl" />
        </div>
      ))}
      
      {showButtons && (
        <div className="flex space-x-4 pt-4">
          <Shimmer width="w-24" height="h-11" rounded="xl" />
          <Shimmer width="w-20" height="h-11" rounded="xl" />
        </div>
      )}
    </div>
  )
}

/**
 * Page header shimmer loading
 */
export interface ShimmerPageHeaderProps {
  showBreadcrumb?: boolean
  showActions?: boolean
  className?: string
}

export const ShimmerPageHeader: React.FC<ShimmerPageHeaderProps> = ({
  showBreadcrumb = false,
  showActions = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {showBreadcrumb && (
        <div className="flex items-center space-x-2">
          <Shimmer width="w-16" height="h-4" />
          <span className="text-gray-400">/</span>
          <Shimmer width="w-20" height="h-4" />
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer width="w-48" height="h-8" />
          <Shimmer width="w-64" height="h-4" />
        </div>
        
        {showActions && (
          <div className="flex space-x-3">
            <Shimmer width="w-24" height="h-10" rounded="xl" />
            <Shimmer width="w-32" height="h-10" rounded="xl" />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Invoice preview shimmer loading
 */
export const ShimmerInvoicePreview: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-2xl p-8 space-y-8', className)}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Shimmer width="w-32" height="h-6" />
          <Shimmer width="w-48" height="h-4" />
        </div>
        <Shimmer width="w-24" height="h-24" rounded="lg" />
      </div>
      
      {/* Invoice details */}
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <Shimmer width="w-20" height="h-5" />
          <div className="space-y-2">
            <Shimmer width="w-full" height="h-4" />
            <Shimmer width="w-3/4" height="h-4" />
            <Shimmer width="w-1/2" height="h-4" />
          </div>
        </div>
        <div className="space-y-4">
          <Shimmer width="w-24" height="h-5" />
          <div className="space-y-2">
            <Shimmer width="w-full" height="h-4" />
            <Shimmer width="w-2/3" height="h-4" />
          </div>
        </div>
      </div>
      
      {/* Line items */}
      <div className="space-y-4">
        <Shimmer width="w-20" height="h-5" />
        <ShimmerTable rows={3} columns={4} showHeader={true} />
      </div>
      
      {/* Total */}
      <div className="flex justify-end">
        <div className="space-y-2 w-48">
          <div className="flex justify-between">
            <Shimmer width="w-16" height="h-4" />
            <Shimmer width="w-20" height="h-4" />
          </div>
          <div className="flex justify-between">
            <Shimmer width="w-12" height="h-4" />
            <Shimmer width="w-16" height="h-4" />
          </div>
          <div className="flex justify-between border-t pt-2">
            <Shimmer width="w-16" height="h-5" />
            <Shimmer width="w-24" height="h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}