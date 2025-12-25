import React from 'react'
import { cn } from '../../utils/classNames'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'draft' | 'sent' | 'paid'
  className?: string
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    // Normalize status to lowercase to handle both 'DRAFT'/'draft' formats
    const normalizedStatus = status?.toLowerCase() as 'draft' | 'sent' | 'paid' | undefined
    
    const styles = {
      draft: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        dot: 'bg-gray-400',
      },
      sent: {
        bg: 'bg-primary-100', 
        text: 'text-primary-700',
        dot: 'bg-primary-500',
      },
      paid: {
        bg: 'bg-success-100',
        text: 'text-success-700', 
        dot: 'bg-success-500',
      },
    }

    // Provide default fallback if status is undefined or invalid
    const style = styles[normalizedStatus || 'draft']
    const statusLabel = normalizedStatus 
      ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
      : 'Unknown'

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center space-x-1.5',
          'px-3 py-1.5 rounded-full text-xs font-semibold',
          'transition-all duration-200',
          style.bg, 
          style.text,
          className
        )}
        role="status"
        aria-label={`Status: ${statusLabel}`}
        {...props}
      >
        <span 
          className={cn('w-1.5 h-1.5 rounded-full', style.dot)} 
          aria-hidden="true"
        />
        <span>{statusLabel}</span>
      </span>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

export { StatusBadge }