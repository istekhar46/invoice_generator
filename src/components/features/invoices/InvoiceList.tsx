/**
 * Invoice List Component
 * Displays list of invoices with status filtering and sorting capabilities
 */

import React, { useState, useEffect } from 'react'
import type { Invoice, InvoiceStatus } from '../../../types/entities'
import { useInvoiceStore } from '../../../store/invoiceStore'
import { useCustomerStore } from '../../../store/customerStore'
import { Button } from '../../ui/Button'
import { Card, CardContent } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { PDFActions } from './PDFActions'
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
  Clock
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../../utils/formatters'

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

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <span className="text-sm text-gray-500">
            ({filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'})
          </span>
        </div>
        
        <Button onClick={onCreateInvoice} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create Invoice</span>
        </Button>
      </div>

      {/* Filters and Sort Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex space-x-2">
                <Button
                  variant={selectedStatus === 'all' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => handleStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedStatus === 'draft' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => handleStatusFilter('draft')}
                >
                  Draft
                </Button>
                <Button
                  variant={selectedStatus === 'sent' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => handleStatusFilter('sent')}
                >
                  Sent
                </Button>
                <Button
                  variant={selectedStatus === 'paid' ? 'primary' : 'outline'}
                  size="small"
                  onClick={() => handleStatusFilter('paid')}
                >
                  Paid
                </Button>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex space-x-2 ml-auto">
              <Button
                variant="outline"
                size="small"
                onClick={() => handleSort('invoiceNumber')}
                className="flex items-center space-x-1"
              >
                <span>Number</span>
                {getSortIcon('invoiceNumber')}
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={() => handleSort('serviceDate')}
                className="flex items-center space-x-1"
              >
                <span>Date</span>
                {getSortIcon('serviceDate')}
              </Button>

              <Button
                variant="outline"
                size="small"
                onClick={() => handleSort('total')}
                className="flex items-center space-x-1"
              >
                <span>Total</span>
                {getSortIcon('total')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* PDF Error Display */}
      {pdfError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex justify-between items-start">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">PDF Generation Failed</h3>
                <p className="text-sm text-red-600 mt-1" role="alert">
                  {pdfError}
                </p>
                {pdfError.includes('Company profile is required') && (
                  <p className="text-sm text-red-600 mt-2">
                    <strong>Next steps:</strong> Go to Settings → Company Profile to set up your business information.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={clearPdfError}
              className="text-red-400 hover:text-red-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedStatus !== 'all' ? `No ${selectedStatus} invoices` : 'No invoices yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedStatus !== 'all'
                ? `You don't have any ${selectedStatus} invoices. Try changing the filter.`
                : 'Get started by creating your first invoice.'
              }
            </p>
            {selectedStatus === 'all' && (
              <Button onClick={onCreateInvoice}>
                Create Your First Invoice
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onInvoiceSelect?.(invoice)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCustomerName(invoice.customerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.serviceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            onInvoiceSelect?.(invoice)
                          }}
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {/* Actions Menu */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowActionsMenu(showActionsMenu === invoice.id ? null : invoice.id)
                            }}
                            title="More Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          
                          {showActionsMenu === invoice.id && (
                            <div className="fixed right-8 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                {/* PDF Actions */}
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                  PDF Actions
                                </div>
                                <div className="px-3 py-2">
                                  <PDFActions
                                    invoice={invoice}
                                    variant="compact"
                                    onError={handlePdfError}
                                    className="justify-start"
                                  />
                                </div>
                                
                                {/* Invoice Actions */}
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100 border-t border-gray-100">
                                  Invoice Actions
                                </div>
                                <button
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditInvoice(invoice)
                                    setShowActionsMenu(null)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2 text-gray-400" />
                                  Edit Invoice
                                </button>
                                
                                {/* Status Change Actions */}
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100 border-t border-gray-100">
                                  Change Status
                                </div>
                                {invoice.status !== 'draft' && (
                                  <button
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(invoice, 'draft')
                                    }}
                                  >
                                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                    Mark as Draft
                                  </button>
                                )}
                                {invoice.status !== 'sent' && (
                                  <button
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(invoice, 'sent')
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2 text-yellow-500" />
                                    Mark as Sent
                                  </button>
                                )}
                                {invoice.status !== 'paid' && (
                                  <button
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(invoice, 'paid')
                                    }}
                                  >
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    Mark as Paid
                                  </button>
                                )}
                                
                                {/* Danger Zone */}
                                <div className="px-3 py-2 text-xs font-medium text-red-500 uppercase tracking-wider border-b border-gray-100 border-t border-gray-100">
                                  Danger Zone
                                </div>
                                <button
                                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteInvoice(invoice)
                                    setShowActionsMenu(null)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Invoice
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmDelete}
              loading={loading}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
            >
              Delete Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
