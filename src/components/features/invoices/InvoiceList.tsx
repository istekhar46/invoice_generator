/**
 * Invoice List Component
 * Displays list of invoices with modern card design, status filtering and sorting capabilities
 */

import React, { useState, useMemo, useEffect } from 'react'
import type { Invoice, InvoiceStatus } from '../../../types/entities'
import { usePaginatedInvoices, useDeleteInvoice, useUpdateInvoiceStatus } from '../../../hooks/useInvoices'
import { usePrefetchOnHover, usePrefetchRelated, useAutoPrefetch } from '../../../hooks/usePrefetch'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { StatusBadge } from '../../ui/StatusBadge'
import { Modal } from '../../ui/Modal'
import { Pagination } from '../../ui/Pagination'
import { InvoiceListSkeleton, InvoiceCardSkeleton, SkeletonGrid } from '../../ui/SkeletonLoading'
import { ErrorDisplay } from '../../shared/ErrorDisplay'
import { PDFActions } from './PDFActions'
import { ResponsiveGrid, ResponsiveStack } from '../../layout/ResponsiveLayout'
import { 
  FileText, 
  Plus, 
  SortAsc, 
  SortDesc, 
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  Send,
  ArrowRight,
  Calendar,
  DollarSign,
  User,
  Grid3x3,
  List
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { cn } from '../../../utils/classNames'
import type { InvoiceQueryParams } from '../../../services/api'

interface InvoiceListProps {
  onInvoiceSelect?: (invoice: Invoice) => void
  onInvoiceEdit?: (invoice: Invoice) => void
  onCreateInvoice?: () => void
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onInvoiceSelect,
  onInvoiceEdit,
  onCreateInvoice,
}) => {
  // State for filtering, sorting, pagination, and modals
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Build query parameters
  const queryParams: Omit<InvoiceQueryParams, 'page' | 'limit'> = useMemo(() => ({
    status: selectedStatus !== 'all' ? selectedStatus.toUpperCase() as 'DRAFT' | 'SENT' | 'PAID' : undefined,
    sortBy,
    sortOrder,
  }), [selectedStatus, sortBy, sortOrder])

  // Use paginated invoices hook
  const { 
    data: invoicesResponse, 
    isLoading: invoicesLoading, 
    error: invoicesError,
    refetch: refetchInvoices,
    pagination
  } = usePaginatedInvoices(currentPage, 20, queryParams)

  // Extract data from responses
  const invoices = invoicesResponse?.data || []
  const isLoading = invoicesLoading

  const deleteInvoiceMutation = useDeleteInvoice()
  const updateStatusMutation = useUpdateInvoiceStatus()
  const { smartPrefetch } = useAutoPrefetch()

  // Smart prefetching on component mount
  useEffect(() => {
    smartPrefetch('invoice-list')
  }, [smartPrefetch])

  // Close actions menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowActionsMenu(null)
    }

    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsMenu])

  const handleStatusFilter = (status: InvoiceStatus | 'all') => {
    setSelectedStatus(status)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (newSortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total') => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setCurrentPage(1) // Reset to first page when sorting
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setDeletingInvoice(invoice)
    setShowDeleteConfirm(true)
  }

  const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ 
        id: invoice.id, 
        status: newStatus.toUpperCase() as 'DRAFT' | 'SENT' | 'PAID'
      })
      setShowActionsMenu(null)
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }

  const handlePdfError = (error: string) => {
    setPdfError(error)
    setShowActionsMenu(null)
  }

  const clearPdfError = () => {
    setPdfError(null)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    onInvoiceEdit?.(invoice)
  }

  const confirmDelete = async () => {
    if (deletingInvoice) {
      try {
        await deleteInvoiceMutation.mutateAsync(deletingInvoice.id)
        setShowDeleteConfirm(false)
        setDeletingInvoice(null)
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  const getSortIcon = (column: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total') => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  const getCustomerName = (invoice: any) => {
    // API response has customer object, not customerId
    return invoice.customer?.name || 'Unknown Customer'
  }

  if (isLoading && invoices.length === 0) {
    return <InvoiceListSkeleton />
  }

  return (
    <ResponsiveStack spacing="lg">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="heading-2 text-gray-900">Invoices</h1>
            <p className="text-body-sm text-gray-600">
              {pagination.total} {pagination.total === 1 ? 'invoice' : 'invoices'}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onCreateInvoice} 
          variant="primary"
          size="lg"
          className="group shadow-glow"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Invoice
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Modern Filters and Sort Controls */}
      <Card padding="lg" className="bg-linear-to-r from-white to-gray-50/50">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Filter by Status:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'draft' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusFilter('draft')}
              >
                Draft
              </Button>
              <Button
                variant={selectedStatus === 'sent' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusFilter('sent')}
              >
                Sent
              </Button>
              <Button
                variant={selectedStatus === 'paid' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleStatusFilter('paid')}
              >
                Paid
              </Button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:ml-auto">
            <span className="text-sm font-semibold text-gray-700">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSort('invoiceNumber')}
                className="flex items-center space-x-1"
              >
                <span>Number</span>
                {getSortIcon('invoiceNumber')}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSort('serviceDate')}
                className="flex items-center space-x-1"
              >
                <span>Date</span>
                {getSortIcon('serviceDate')}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSort('total')}
                className="flex items-center space-x-1"
              >
                <span>Total</span>
                {getSortIcon('total')}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex gap-1 ml-4 border-l border-gray-300 pl-4">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className="flex items-center space-x-1"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className="flex items-center space-x-1"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {invoicesError && (
        <ErrorDisplay 
          error={invoicesError} 
          onRetry={() => refetchInvoices()}
          title="Failed to load invoices"
        />
      )}

      {/* PDF Error Display */}
      {pdfError && (
        <Card padding="lg" className="border-danger-200 bg-danger-50">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-danger-100 rounded-xl">
                <FileText className="h-5 w-5 text-danger-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-danger-800">PDF Generation Failed</h3>
                <p className="text-sm text-danger-700 mt-1" role="alert">
                  {pdfError}
                </p>
                {pdfError.includes('Company profile is required') && (
                  <p className="text-sm text-danger-700 mt-2">
                    <strong>Next steps:</strong> Go to Settings → Company Profile to set up your business information.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearPdfError}
              className="text-danger-400 hover:text-danger-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>
        </Card>
      )}

      {/* Invoice Cards Grid */}
      {invoices.length === 0 ? (
        <Card padding="lg" className="text-center bg-linear-to-r from-white to-gray-50/50">
          <div className="py-12">
            <div className="p-4 bg-gradient-to- from-gray-100 to-gray-200 rounded-2xl w-fit mx-auto mb-6">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="heading-3 text-gray-900 mb-2">
              {selectedStatus !== 'all' ? `No ${selectedStatus} invoices` : 'No invoices yet'}
            </h3>
            <p className="text-body text-gray-600 mb-6 max -w- md mx-auto">
              {selectedStatus !== 'all'
                ? `You don't have any ${selectedStatus} invoices. Try changing the filter.`
                : 'Get started by creating your first invoice and managing your business professionally.'
              }
            </p>
            {selectedStatus === 'all' && (
              <Button onClick={onCreateInvoice} variant="primary" size="lg" className="group">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Invoice
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Show skeleton overlay when refetching */}
          {isLoading && invoices.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 rounded-lg">
                <SkeletonGrid CardSkeleton={InvoiceCardSkeleton} count={6} />
              </div>
            </div>
          )}
          
          {viewMode === 'grid' ? (
            <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
              {invoices.map((invoice, index) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice as any}
                  customerName={getCustomerName(invoice)}
                  onSelect={() => onInvoiceSelect?.(invoice as any)}
                  onEdit={() => handleEditInvoice(invoice as any)}
                  onDelete={() => handleDeleteInvoice(invoice as any)}
                  onStatusChange={(status) => handleStatusChange(invoice as any, status)}
                  onPdfError={handlePdfError}
                  index={index}
                />
              ))}
            </ResponsiveGrid>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <InvoiceListRow
                  key={invoice.id}
                  invoice={invoice as any}
                  customerName={getCustomerName(invoice)}
                  onSelect={() => onInvoiceSelect?.(invoice as any)}
                  onEdit={() => handleEditInvoice(invoice as any)}
                  onDelete={() => handleDeleteInvoice(invoice as any)}
                  onStatusChange={(status) => handleStatusChange(invoice as any, status)}
                  onPdfError={handlePdfError}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {invoices.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Invoice"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete invoice <strong>{deletingInvoice?.invoiceNumber}</strong>? 
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteInvoiceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={deleteInvoiceMutation.isPending}
            >
              Delete Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </ResponsiveStack>
  )
}

/**
 * Modern Invoice Card Component
 */
interface InvoiceCardProps {
  invoice: Invoice
  customerName: string
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: InvoiceStatus) => void
  onPdfError: (error: string) => void
  index: number
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  customerName,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onPdfError,
  index
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const { prefetchInvoice, cancelPrefetch } = usePrefetchOnHover()
  const { prefetchCustomerInvoices } = usePrefetchRelated()

  const handleMouseEnter = () => {
    // Prefetch invoice details and customer's other invoices on hover
    prefetchInvoice(invoice.id)
    // Note: Using any type cast since API response structure may vary
    const customerData = (invoice as any).customer
    if (customerData?.id) {
      prefetchCustomerInvoices(customerData.id)
    }
  }

  const handleMouseLeave = () => {
    // Cancel prefetch if user moves away quickly
    cancelPrefetch()
  }

  return (
    <Card 
      padding="lg" 
      hover={true}
      className={cn(
        "cursor-pointer transition-all duration-300 animate-slide-up bg-linear-to-r from-white to-gray-50/50",
        "hover:shadow-glow hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {invoice.invoiceNumber}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{customerName}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={invoice.status} />
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActionsMenu(!showActionsMenu)
                }}
                className="min-h-11 min-w-11"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-medium border border-gray-200 z-10 py-2">
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                      setShowActionsMenu(false)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-3 text-gray-400" />
                    Edit Invoice
                  </button>
                  
                  {invoice.status !== 'sent' && (
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange('sent')
                        setShowActionsMenu(false)
                      }}
                    >
                      <Send className="h-4 w-4 mr-3 text-secondary-500" />
                      Mark as Sent
                    </button>
                  )}
                  
                  {invoice.status !== 'paid' && (
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange('paid')
                        setShowActionsMenu(false)
                      }}
                    >
                      <Check className="h-4 w-4 mr-3 text-success-500" />
                      Mark as Paid
                    </button>
                  )}
                  
                  <div className="border-t border-gray-100 my-2" />
                  
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowActionsMenu(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(invoice.serviceDate)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
         
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <PDFActions
              invoice={invoice}
              variant="compact"
              onError={onPdfError}
              className="opacity-75 hover:opacity-100"
            />
          </div>
           
        </div>
        <div className="text-xs text-gray-500">
            Due: {formatDate(invoice.dueDate)}
          </div>
      </div>
    </Card>
  )
}
/**
 * Invoice List Row Component (for list view)
 */
interface InvoiceListRowProps {
  invoice: Invoice
  customerName: string
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: InvoiceStatus) => void
  onPdfError: (error: string) => void
}

const InvoiceListRow: React.FC<InvoiceListRowProps> = ({
  invoice,
  customerName,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onPdfError,
}) => {
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  return (
    <Card 
      padding="lg" 
      hover={true}
      className={cn(
        "cursor-pointer transition-all duration-300 bg-linear-to-r from-white to-gray-50/50",
        "hover:shadow-glow hover:border-primary-200"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Section - Invoice Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {invoice.invoiceNumber}
              </h3>
              <p className="text-xs text-gray-600 mt-1">{customerName}</p>
            </div>
            
            {/* Middle Section - Dates and Amount */}
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(invoice.serviceDate)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Status and Actions */}
        <div className="flex items-center gap-3">
          <StatusBadge status={invoice.status} />
          
          <PDFActions
            invoice={invoice}
            variant="compact"
            onError={onPdfError}
            className="opacity-75 hover:opacity-100"
          />
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowActionsMenu(!showActionsMenu)
              }}
              className="min-h-11 min-w-11"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-medium border border-gray-200 z-10 py-2">
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                    setShowActionsMenu(false)
                  }}
                >
                  <Edit className="h-4 w-4 mr-3 text-gray-400" />
                  Edit Invoice
                </button>
                
                {invoice.status !== 'sent' && (
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange('sent')
                      setShowActionsMenu(false)
                    }}
                  >
                    <Send className="h-4 w-4 mr-3 text-secondary-500" />
                    Mark as Sent
                  </button>
                )}
                
                {invoice.status !== 'paid' && (
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange('paid')
                      setShowActionsMenu(false)
                    }}
                  >
                    <Check className="h-4 w-4 mr-3 text-success-500" />
                    Mark as Paid
                  </button>
                )}
                
                <div className="border-t border-gray-100 my-2" />
                
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                    setShowActionsMenu(false)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}