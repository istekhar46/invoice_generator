/**
 * Skeleton Loading Components
 * Provides skeleton placeholders to prevent layout shifts during loading
 * Requirements: 9.5 - prevent layout shifts with proper loading states
 */

import React from 'react'
import { Card } from './Card'
import { cn } from '../../utils/classNames'

/**
 * Base skeleton component with shimmer animation
 */
interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

export type { SkeletonProps }

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = 'md',
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
        roundedClasses[rounded],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        animation: 'shimmer 2s infinite linear',
      }}
    />
  )
}

/**
 * Skeleton for customer cards
 */
export const CustomerCardSkeleton: React.FC = () => {
  return (
    <Card padding="lg" className="animate-pulse">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton height={24} width="60%" />
            <Skeleton height={16} width="40%" />
          </div>
          <div className="flex space-x-2">
            <Skeleton height={32} width={32} rounded="md" />
            <Skeleton height={32} width={32} rounded="md" />
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Skeleton height={16} width={16} rounded="sm" />
            <Skeleton height={16} width="70%" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton height={16} width={16} rounded="sm" />
            <Skeleton height={16} width="50%" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton height={16} width={16} rounded="sm" />
            <Skeleton height={16} width="80%" />
          </div>
          <Skeleton height={16} width="60%" className="ml-6" />
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <Skeleton height={14} width="40%" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for invoice cards
 */
export const InvoiceCardSkeleton: React.FC = () => {
  return (
    <Card padding="lg" className="animate-pulse">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton height={24} width="50%" />
            <div className="flex items-center space-x-2">
              <Skeleton height={16} width={16} rounded="sm" />
              <Skeleton height={16} width="60%" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton height={24} width={60} rounded="full" />
            <Skeleton height={32} width={32} rounded="md" />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Skeleton height={16} width={16} rounded="sm" />
            <Skeleton height={16} width="70%" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton height={16} width={16} rounded="sm" />
            <Skeleton height={16} width="50%" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Skeleton height={14} width="40%" />
          <div className="flex items-center space-x-2">
            <Skeleton height={32} width={60} rounded="md" />
            <Skeleton height={32} width={32} rounded="md" />
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton for pagination
 */
export const PaginationSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <Skeleton height={20} width="200px" />
      <div className="flex items-center space-x-1">
        <Skeleton height={36} width={80} rounded="md" />
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} height={36} width={36} rounded="md" />
          ))}
        </div>
        <Skeleton height={36} width={60} rounded="md" />
      </div>
    </div>
  )
}

/**
 * Skeleton for list headers
 */
export const ListHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center space-x-3">
        <Skeleton height={40} width={40} rounded="lg" />
        <div className="space-y-1">
          <Skeleton height={28} width="150px" />
          <Skeleton height={16} width="100px" />
        </div>
      </div>
      <Skeleton height={44} width="140px" rounded="md" />
    </div>
  )
}

/**
 * Skeleton for filter controls
 */
export const FilterControlsSkeleton: React.FC = () => {
  return (
    <Card padding="lg" className="bg-gradient-to-r from-white to-gray-50/50">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Skeleton height={44} width="100%" rounded="md" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Skeleton height={20} width="60px" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={32} width={80} rounded="md" />
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Skeleton grid for cards
 */
interface SkeletonGridProps {
  count?: number
  CardSkeleton: React.ComponentType
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

export type { SkeletonGridProps }

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 6,
  CardSkeleton,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
}) => {
  const gridClasses = cn(
    'grid gap-6',
    `grid-cols-${columns.mobile}`,
    `md:grid-cols-${columns.tablet}`,
    `lg:grid-cols-${columns.desktop}`
  )

  return (
    <div className={gridClasses}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Complete page skeleton for customer list
 */
export const CustomerListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <ListHeaderSkeleton />
      <FilterControlsSkeleton />
      <SkeletonGrid CardSkeleton={CustomerCardSkeleton} count={6} />
      <PaginationSkeleton />
    </div>
  )
}

/**
 * Complete page skeleton for invoice list
 */
export const InvoiceListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <ListHeaderSkeleton />
      <FilterControlsSkeleton />
      <SkeletonGrid CardSkeleton={InvoiceCardSkeleton} count={6} />
      <PaginationSkeleton />
    </div>
  )
}

/**
 * Inline loading skeleton for when data is being refetched
 */
export const InlineLoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <Skeleton height={40} width={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={14} width="40%" />
          </div>
          <Skeleton height={32} width={80} rounded="md" />
        </div>
      ))}
    </div>
  )
}