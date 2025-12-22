/**
 * Customer List Component
 * List of customers with search, sorting, and filtering capabilities
 */

import React, { useState, useEffect } from 'react'
import type { Customer } from '../../../types/entities'
import { useCustomerStore } from '../../../store/customerStore'
import { CustomerCard } from './CustomerCard'
import { CustomerForm } from './CustomerForm'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { Card, CardContent } from '../../ui/Card'
import { Plus, Search, SortAsc, SortDesc, Users } from 'lucide-react'

interface CustomerListProps {
  onCustomerSelect?: (customer: Customer) => void
  selectable?: boolean
  selectedCustomerId?: string
}

export const CustomerList: React.FC<CustomerListProps> = ({
  onCustomerSelect,
  selectable = false,
  selectedCustomerId,
}) => {
  const {
    customers,
    loading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    loadCustomers,
    deleteCustomer,
    searchCustomers,
    setSorting,
    getFilteredCustomers,
    clearError,
  } = useCustomerStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  // Load customers on mount
  useEffect(() => {
    // Get user ID from auth store
    const authUser = JSON.parse(localStorage.getItem('user') || 'null')
    if (authUser?.id) {
      loadCustomers(authUser.id)
    }
  }, [loadCustomers])

  const filteredCustomers = getFilteredCustomers()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchCustomers(e.target.value)
  }

  const handleSort = (newSortBy: 'name' | 'createdAt') => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSorting(newSortBy, newSortOrder)
  }

  const handleAddCustomer = () => {
    setShowAddModal(true)
    clearError()
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowEditModal(true)
    clearError()
  }

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (deletingCustomer) {
      try {
        await deleteCustomer(deletingCustomer.id)
        setShowDeleteConfirm(false)
        setDeletingCustomer(null)
      } catch (error) {
        // Error is handled by the store
        console.error('Delete failed:', error)
      }
    }
  }

  const handleFormSuccess = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingCustomer(null)
  }

  const handleFormCancel = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingCustomer(null)
  }

  const handleCustomerSelect = (customer: Customer) => {
    if (selectable) {
      onCustomerSelect?.(customer)
    }
  }

  const getSortIcon = (column: 'name' | 'createdAt') => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  if (loading && customers.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading customers...</p>
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
          <Users className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {selectable ? 'Select Customer' : 'Customers'}
          </h2>
          <span className="text-sm text-gray-500">
            ({filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'})
          </span>
        </div>
        
        {!selectable && (
          <Button onClick={handleAddCustomer} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        )}
      </div>

      {/* Search and Sort Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search customers by name, email, phone, or address..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="small"
                onClick={() => handleSort('name')}
                className="flex items-center space-x-1"
              >
                <span>Name</span>
                {getSortIcon('name')}
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={() => handleSort('createdAt')}
                className="flex items-center space-x-1"
              >
                <span>Date Added</span>
                {getSortIcon('createdAt')}
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

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all customers.'
                : 'Get started by adding your first customer.'
              }
            </p>
            {!selectable && !searchQuery && (
              <Button onClick={handleAddCustomer}>
                Add Your First Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              onSelect={handleCustomerSelect}
              showActions={!selectable}
              selectable={selectable}
              selected={selectedCustomerId === customer.id}
            />
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={handleFormCancel}
        title="Add New Customer"
        size="large"
      >
        <CustomerForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        open={showEditModal}
        onClose={handleFormCancel}
        title="Edit Customer"
        size="large"
      >
        <CustomerForm
          customer={editingCustomer}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Customer"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deletingCustomer?.name}</strong>? 
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
              Delete Customer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}