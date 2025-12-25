/**
 * Pagination Component
 * Provides navigation controls for paginated data
 */

import React from 'react'
import { Button } from './Button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '../../utils/classNames'

interface PaginationProps {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  total: number
  limit: number
  onPageChange: (page: number) => void
  className?: string
  showInfo?: boolean
}

export type { PaginationProps }

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  total,
  limit,
  onPageChange,
  className,
  showInfo = true,
}) => {
  // Don't render if there's only one page or no data
  if (totalPages <= 1) {
    return null
  }

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2 // Number of pages to show on each side of current page
    const range = []
    const rangeWithDots = []

    // Always include first page
    range.push(1)

    // Add pages around current page
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    // Always include last page if there are multiple pages
    if (totalPages > 1) {
      range.push(totalPages)
    }

    // Remove duplicates and sort
    const uniqueRange = [...new Set(range)].sort((a, b) => a - b)

    // Add dots where there are gaps
    let prev = 0
    for (const page of uniqueRange) {
      if (page - prev > 1) {
        rangeWithDots.push('...')
      }
      rangeWithDots.push(page)
      prev = page
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()
  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, total)

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      {/* Info */}
      {showInfo && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
          <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
          <span className="font-semibold text-gray-900">{total}</span> results
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center space-x-1">
        {/* Previous button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${index}`}
                  className="px-3 py-2 text-sm text-gray-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              )
            }

            const pageNumber = page as number
            const isCurrentPage = pageNumber === currentPage

            return (
              <Button
                key={pageNumber}
                variant={isCurrentPage ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  'min-w-[40px]',
                  isCurrentPage && 'shadow-glow'
                )}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        {/* Next button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="flex items-center space-x-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Simple pagination component for basic use cases
 */
interface SimplePaginationProps {
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  className?: string
}

export type { SimplePaginationProps }

export const SimplePagination: React.FC<SimplePaginationProps> = ({
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center space-x-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center space-x-1"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}