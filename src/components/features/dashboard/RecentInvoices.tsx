/**
 * RecentInvoices Component
 * Displays a list of recent invoices with status indicators
 * Requirements: 8.1, 10.4, 10.5
 */

import React from 'react'
import { Card } from '../../ui/Card'
import type { RecentInvoiceSummary } from '../../../services/dashboardStatistics.service'
import type { InvoiceStatus } from '../../../types/entities'

interface RecentInvoicesProps {
  invoices: RecentInvoiceSummary[]
  loading?: boolean
  onInvoiceClick?: (invoiceId: string) => void
  onViewAll?: () => void
}

/**
 * Status badge component for invoices
 */
interface StatusBadgeProps {
  status: InvoiceStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  // Normalize status to lowercase to handle both 'DRAFT' and 'draft' formats
  const normalizedStatus = status?.toLowerCase() as 'draft' | 'sent' | 'paid' | undefined
  
  const statusConfig = {
    draft: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-800',
    },
    sent: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800',
    },
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-800',
    },
  }

  const config = statusConfig[normalizedStatus || 'draft']

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.className || 'bg-gray-100 text-gray-800'}`}>
      {config?.label || 'Unknown'}
    </span>
  )
}

/**
 * Enhanced loading skeleton with shimmer effects for recent invoices
 */
const RecentInvoicesLoading: React.FC = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, index) => (
      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
        <div className="flex-1">
          <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200px_100%] animate-shimmer rounded mb-2" />
          <div className="h-3 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200px_100%] animate-shimmer rounded w-2/3" />
        </div>
        <div className="ml-4 text-right">
          <div className="h-4 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200px_100%] animate-shimmer rounded mb-2 w-16" />
          <div className="h-5 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 bg-size-[200px_100%] animate-shimmer rounded-full w-12" />
        </div>
      </div>
    ))}
  </div>
)

/**
 * Empty state for when there are no invoices
 */
const EmptyState: React.FC = () => (
  <div className="text-center py-8">
    <div className="mx-auto h-12 w-12 text-gray-400">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <p className="text-gray-500 mt-2">No invoices yet</p>
    <p className="text-sm text-gray-400 mt-1">
      Create your first invoice to see it here
    </p>
  </div>
)

/**
 * RecentInvoices component displaying recent invoice activity
 */
export const RecentInvoices: React.FC<RecentInvoicesProps> = ({ 
  invoices, 
  loading = false,
  onInvoiceClick,
  onViewAll 
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Recent Invoices
        </h3>
        {onViewAll && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
            onClick={onViewAll}
          >
            View all
          </button>
        )}
      </div>

      {loading ? (
        <RecentInvoicesLoading />
      ) : invoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0 transition-all duration-200 ${
                onInvoiceClick ? 'cursor-pointer hover:bg-gray-50 hover:shadow-sm -mx-2 px-2 rounded' : ''
              }`}
              onClick={() => onInvoiceClick?.(invoice.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {invoice.invoiceNumber}
                  </p>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                  {invoice.customerName && (
                    <>
                      <span>{invoice.customerName}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDate(invoice.serviceDate)}</span>
                </div>
              </div>
              <div className="ml-4 text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.total)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}