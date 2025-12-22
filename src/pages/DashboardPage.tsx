import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardStats, RecentInvoices } from '../components/features/dashboard'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { InvoiceBuilder } from '../components/features/invoices/InvoiceBuilder'
import { CustomerForm } from '../components/features/customers/CustomerForm'
import { useInvoiceStore } from '../store/invoiceStore'
import { useCustomerStore } from '../store/customerStore'
import { useAuthStore } from '../store/authStore'
import { DashboardStatisticsService } from '../services/dashboardStatistics.service'
import type { Invoice } from '../types/entities'

/**
 * DashboardPage component showing key business metrics and recent activity.
 * 
 * Requirements: 8.1 - THE System SHALL provide a dashboard showing recent invoices and key statistics
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5 - Dashboard statistics and reactive updates
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    invoices, 
    loading: invoicesLoading, 
    loadInvoices 
  } = useInvoiceStore()
  const { 
    customers, 
    loading: customersLoading, 
    loadCustomers,
    getCustomer 
  } = useCustomerStore()

  // Modal states
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadInvoices(user.id)
      loadCustomers(user.id)
    }
  }, [user?.id, loadInvoices, loadCustomers])

  // Calculate dashboard statistics
  const statistics = useMemo(() => {
    return DashboardStatisticsService.calculateStatistics(invoices)
  }, [invoices])

  // Get recent invoices with customer names
  const recentInvoices = useMemo(() => {
    const customerLookup = (customerId: string) => {
      const customer = getCustomer(customerId)
      return customer?.name
    }

    return DashboardStatisticsService.getRecentInvoiceSummaries(
      invoices,
      customerLookup,
      5
    )
  }, [invoices, getCustomer])

  const isLoading = invoicesLoading || customersLoading

  const handleInvoiceClick = (_invoiceId: string) => {
    // Navigate to invoices page - the InvoicesPage will handle showing the specific invoice
    navigate('/invoices')
  }

  const handleCreateInvoice = () => {
    setShowInvoiceBuilder(true)
  }

  const handleAddCustomer = () => {
    setShowCustomerForm(true)
  }

  const handleInvoiceSave = (_invoice: Invoice) => {
    setShowInvoiceBuilder(false)
    // Optionally navigate to the invoice or show a success message
  }

  const handleInvoiceBuilderCancel = () => {
    setShowInvoiceBuilder(false)
  }

  const handleCustomerSuccess = () => {
    setShowCustomerForm(false)
    // Customer will be automatically added to the store
  }

  const handleCustomerCancel = () => {
    setShowCustomerForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, {user?.displayName || 'User'}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <DashboardStats
        statistics={statistics}
        totalCustomers={customers.length}
        loading={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <RecentInvoices
          invoices={recentInvoices}
          loading={isLoading}
          onInvoiceClick={handleInvoiceClick}
          onViewAll={() => navigate('/invoices')}
        />

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={handleCreateInvoice}
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-medium">+</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Create Invoice</p>
                  <p className="text-xs text-gray-500">Generate a new invoice</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={handleAddCustomer}
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-md bg-green-500 flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-medium">👤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Add Customer</p>
                  <p className="text-xs text-gray-500">Add a new customer</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => navigate('/company')}
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-md bg-purple-500 flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-medium">⚙️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Company Profile</p>
                  <p className="text-xs text-gray-500">Update business info</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </Card>
      </div>

      {/* Invoice Builder Modal */}
      <Modal
        open={showInvoiceBuilder}
        onClose={handleInvoiceBuilderCancel}
        title="Create New Invoice"
        size="large"
      >
        <InvoiceBuilder
          onSave={handleInvoiceSave}
          onCancel={handleInvoiceBuilderCancel}
        />
      </Modal>

      {/* Customer Form Modal */}
      <Modal
        open={showCustomerForm}
        onClose={handleCustomerCancel}
        title="Add New Customer"
        size="medium"
      >
        <CustomerForm
          onSuccess={handleCustomerSuccess}
          onCancel={handleCustomerCancel}
        />
      </Modal>
    </div>
  )
}