/**
 * Invoice List Component
 * Displays list of invoices with modern card design, status filtering and sorting capabilities
 */

import React, { useState, useEffect } from 'react'
import type { Invoice, InvoiceStatus } from '../../../types/entities'
import { useInvoiceStore } from '../../../store/invoiceStore'
import { useCustomerStore } from '../../../store/customerStore'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { StatusBadge } from '../../ui/StatusBadge'
import { Modal } from '../../ui/Modal'
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
  User
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/formatters'
import { cn } from '../../../utils/classNames'

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
  const {
    invoices,
    loading,
    error,
    sortBy,
    sortOrder,
    loadInvoices,
    deleteInvoice,
    updateInvoice,
    setFilters,
    setSorting,
    getFilteredInvoices,
  } = useInvoiceStore()

  const { loadCustomers, getCustomer } = useCustomerStore()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'all'>('all')
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Load invoices and customers on mount
  useEffect(() => {
    // Get user ID from auth store
    const authUser = JSON.parse(localStorage.getItem('user') || 'null')
    if (authUser?.id) {
      loadInvoices(authUser.id)
      loadCustomers(authUser.id)
    }
  }, [loadInvoices, loadCustomers])

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActionsMenu(null)
    }

    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsMenu])

  const filteredInvoices = getFilteredInvoices()

  const handleStatusFilter = (status: InvoiceStatus | 'all') => {
    setSelectedStatus(status)
    if (status === 'all') {
      setFilters({ status: undefined })
    } else {
      setFilters({ status })
    }
  }

  const handleSort = (newSortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total') => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSorting(newSortBy, newSortOrder)
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setDeletingInvoice(invoice)
    setShowDeleteConfirm(true)
  }

  const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    try {
      await updateInvoice(invoice.id, { status: newStatus })
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
        await deleteInvoice(deletingInvoice.id)
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

  const getCustomerName = (customerId: string) => {
    const customer = getCustomer(customerId)
    return customer?.name || 'Unknown Customer'
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="h-8 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
              <div className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded mt-2" />
            </div>
          </div>
          <div className="h-10 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded-xl" />
        </div>

        {/* Loading Cards */}
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
          {[...Array(6)].map((_, index) => (
            <Card key={index} padding="lg" className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
                  <div className="h-6 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded-full" />
                </div>
                <div className="h-4 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
                <div className="h-8 w-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      </div>
    )
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
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
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
      <Card padding="lg" className="bg-gradient-to-r from-white to-gray-50/50">
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
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card padding="lg" className="border-danger-200 bg-danger-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-danger-100 rounded-xl">
              <FileText className="h-5 w-5 text-danger-600" />
            </div>
            <p className="text-sm text-danger-700 font-medium" role="alert">
              {error}
            </p>
          </div>
        </Card>
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
      {filteredInvoices.length === 0 ? (
        <Card padding="lg" className="text-center bg-gradient-to-br from-white to-gray-50/50">
          <div className="py-12">
            <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl w-fit mx-auto mb-6">
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
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
          {filteredInvoices.map((invoice, index) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              customerName={getCustomerName(invoice.customerId)}
              onSelect={() => onInvoiceSelect?.(invoice)}
              onEdit={() => handleEditInvoice(invoice)}
              onDelete={() => handleDeleteInvoice(invoice)}
              onStatusChange={(status) => handleStatusChange(invoice, status)}
              onPdfError={handlePdfError}
              index={index}
            />
          ))}
        </ResponsiveGrid>
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={loading}
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

  return (
    <Card 
      padding="lg" 
      hover={true}
      className={cn(
        "cursor-pointer transition-all duration-300 animate-slide-up bg-gradient-to-br from-white to-gray-50/50",
        "hover:shadow-glow hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
      onClick={onSelect}
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
                className="min-h-[44px] min-w-[44px]"
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
          <div className="text-xs text-gray-500">
            Due: {formatDate(invoice.dueDate)}
          </div>
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
      </div>
    </Card>
  )
}
