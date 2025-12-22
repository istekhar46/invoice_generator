/**
 * Customer List Component
 * Modern list of customers with search, sorting, and filtering capabilities
 */

import React, { useState, useEffect } from 'react'
import type { Customer } from '../../../types/entities'
import { useCustomerStore } from '../../../store/customerStore'
import { CustomerCard } from './CustomerCard'
import { CustomerForm } from './CustomerForm'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { Card } from '../../ui/Card'
import { ResponsiveGrid, ResponsiveStack } from '../../layout/ResponsiveLayout'
import { Plus, Search, SortAsc, SortDesc, Users, ArrowRight } from 'lucide-react'

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
      <ResponsiveStack spacing="lg">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Users className="h-6 w-6 text-white" />
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
                <div className="h-6 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
                <div className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
                <div className="h-4 w-28 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
              </div>
            </Card>
          ))}
        </ResponsiveGrid>
      </ResponsiveStack>
    )
  }

  return (
    <ResponsiveStack spacing="lg">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="heading-2 text-gray-900">
              {selectable ? 'Select Customer' : 'Customers'}
            </h1>
            <p className="text-body-sm text-gray-600">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
            </p>
          </div>
        </div>
        
        {!selectable && (
          <Button 
            onClick={handleAddCustomer} 
            variant="primary"
            size="lg"
            className="group shadow-glow"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Customer
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        )}
      </div>

      {/* Modern Search and Sort Controls */}
      <Card padding="lg" className="bg-gradient-to-r from-white to-gray-50/50">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search customers by name, email, phone, or address..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-12"
                variant="filled"
              />
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSort('name')}
                className="flex items-center space-x-1"
              >
                <span>Name</span>
                {getSortIcon('name')}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSort('createdAt')}
                className="flex items-center space-x-1"
              >
                <span>Date Added</span>
                {getSortIcon('createdAt')}
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
              <Users className="h-5 w-5 text-danger-600" />
            </div>
            <p className="text-sm text-danger-700 font-medium" role="alert">
              {error}
            </p>
          </div>
        </Card>
      )}

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <Card padding="lg" className="text-center bg-gradient-to-br from-white to-gray-50/50">
          <div className="py-12">
            <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl w-fit mx-auto mb-6">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="heading-3 text-gray-900 mb-2">
              {searchQuery ? 'No customers found' : 'No customers yet'}
            </h3>
            <p className="text-body text-gray-600 mb-6 max-w -md mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all customers.'
                : 'Get started by adding your first customer to manage your business relationships.'
              }
            </p>
            {!selectable && !searchQuery && (
              <Button onClick={handleAddCustomer} variant="primary" size="lg" className="group">
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Customer
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
          {filteredCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
            >
              <CustomerCard
                customer={customer}
                onEdit={handleEditCustomer}
                onDelete={handleDeleteCustomer}
                onSelect={handleCustomerSelect}
                showActions={!selectable}
                selectable={selectable}
                selected={selectedCustomerId === customer.id}
              />
            </div>
          ))}
        </ResponsiveGrid>
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
              Delete Customer
            </Button>
          </div>
        </div>
      </Modal>
    </ResponsiveStack>
  )
}