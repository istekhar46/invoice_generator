import React from 'react'
import { cn } from '../../utils/classNames'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'draft' | 'sent' | 'paid'
  className?: string
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
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

    const style = styles[status]
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1)

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