import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileText,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Zap,
} from 'lucide-react'
import {
  DashboardStats,
  RecentInvoices,
} from '../components/features/dashboard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { InvoiceBuilder } from '../components/features/invoices/InvoiceBuilder'
import { CustomerForm } from '../components/features/customers/CustomerForm'
import { ErrorDisplay } from '../components/shared/ErrorDisplay'
import { PageLoading } from '../components/shared/LoadingState'
import {
  ResponsiveGrid,
  ResponsiveStack,
  MobileOptimizedSection,
} from '../components/layout/ResponsiveLayout'
import { useRecentInvoices } from '../hooks/useInvoices'
import { useAllCustomers } from '../hooks/useCustomers'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useCompanyProfileStatus } from '../hooks/useCompany'
import { useAuthStatus } from '../hooks/useAuth'
import { DashboardStatisticsService } from '../services/dashboardStatistics.service'
import type { Invoice } from '../types/entities'
import type { DashboardStatistics } from '../services/dashboardStatistics.service'

/**
 * DashboardPage component showing key business metrics and recent activity.
 *
 * Requirements: 8.1 - THE System SHALL provide a dashboard showing recent invoices and key statistics
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5 - Dashboard statistics and reactive updates
 * Requirements: 3.2, 3.3, 3.5, 9.2 - Responsive layout adaptation and mobile optimization
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStatus()
  const { hasProfile, isLoading: companyLoading } = useCompanyProfileStatus()

  // Use TanStack Query hooks
  const {
    data: invoicesResponse,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useRecentInvoices(10)

  const {
    data: customersResponse,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useAllCustomers()

  // Fetch dashboard statistics from dedicated backend endpoint
  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats()

  // Provide default statistics if not yet loaded
  const defaultStats: DashboardStatistics = statistics || {
    totalInvoices: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    draftInvoices: 0,
    averageInvoiceValue: 0,
  }

  // Modal states
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false)
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  // Extract data from responses
  const invoices = invoicesResponse?.data || []
  const customers = customersResponse?.data || []
  const dashboardLoading = invoicesLoading || customersLoading || statsLoading
  const hasError = invoicesError || customersError || statsError

  // Get recent invoices with customer names (still used for the recent invoices list)
  const recentInvoices = useMemo(() => {
    const customerLookup = (customerId: string) => {
      const customer = customers.find(c => c.id === customerId)
      return customer?.name
    }

    return DashboardStatisticsService.getRecentInvoiceSummaries(
      invoices as any,
      customerLookup,
      5
    )
  }, [invoices, customers])

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

  const handleQuickInvoice = () => {
    navigate('/quick-invoice')
  }

  const handleInvoiceSave = (_invoice: Invoice) => {
    setShowInvoiceBuilder(false)
    // Refetch data to get updated statistics
    refetchInvoices()
  }

  const handleCustomerSuccess = () => {
    setShowCustomerForm(false)
    // Refetch customers to get updated count
    refetchCustomers()
  }

  // Show loading state
  if (dashboardLoading && invoices.length === 0) {
    return <PageLoading message="Loading dashboard..." />
  }

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-primary-50/30 p-6">
        <ErrorDisplay
          error={invoicesError || customersError}
          onRetry={() => {
            refetchInvoices()
            refetchCustomers()
          }}
          title="Failed to load dashboard data"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveStack spacing="lg" className="animate-fade-in">
        {/* Modern Header Section with Welcome Message */}
        <MobileOptimizedSection padding="sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="space-y-2">
              <h1 className="heading-2 text-gray-900">
                Welcome back, {user?.displayName?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-body text-gray-600">
                Here's what's happening with your business today
              </p>
            </div>

            {/* Quick Action Button - Mobile Optimized */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreateInvoice}
              className="group shadow-glow"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Invoice
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </MobileOptimizedSection>

        {/* Company Setup Prompt - Show when no profile exists */}
        {!companyLoading && !hasProfile && (
          <MobileOptimizedSection>
            <Card className="bg-linear-to-r from-primary-50 to-secondary-50 border-primary-200">
                <div className="flex items-start space-x-4">
                  <div className="shrink-0">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Complete Your Company Setup
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Set up your company profile to start creating professional invoices and managing customers. 
                      This will only take a few minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => navigate('/company?setup=true')}
                        className="group"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Setup Company Profile
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/company')}
                        className="text-gray-600"
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                </div>
            </Card>
          </MobileOptimizedSection>
        )}

        {/* Statistics Cards - Modern Grid with Staggered Animation */}
        <MobileOptimizedSection>
          <DashboardStats
            statistics={defaultStats}
            totalCustomers={customers.length}
            loading={dashboardLoading}
          />
        </MobileOptimizedSection>

        {/* Main Content Grid - Enhanced Layout */}
        <MobileOptimizedSection>
          <ResponsiveGrid
            columns={{ mobile: 1, tablet: 1, desktop: 3 }}
            gap="lg"
          >
            {/* Recent Invoices - Takes 2 columns on desktop */}
            <div className="lg:col-span-2">
              <RecentInvoices
                invoices={recentInvoices}
                loading={dashboardLoading}
                onInvoiceClick={handleInvoiceClick}
                onViewAll={() => navigate('/invoices')}
              />
            </div>

            {/* Quick Actions - Modern Card Design */}
            <Card
              padding="sm"
              hover={true}
              className="space-y-6 bg-linear-to-br from-white to-gray-50/50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="heading-4 text-gray-900">Quick Actions</h3>
              </div>

              <ResponsiveStack spacing="sm">
                <QuickActionButton
                  icon={Zap}
                  title="Quick Invoice"
                  description="Invoice without saving details"
                  gradient="from-amber-500 to-orange-500"
                  onClick={handleQuickInvoice}
                />

                <QuickActionButton
                  icon={FileText}
                  title="Create Invoice"
                  description="Generate a new invoice"
                  gradient="from-primary-600 to-primary-500"
                  onClick={handleCreateInvoice}
                />

                <QuickActionButton
                  icon={Users}
                  title="Add Customer"
                  description="Add a new customer"
                  gradient="from-success-600 to-success-500"
                  onClick={handleAddCustomer}
                />

                <QuickActionButton
                  icon={Building2}
                  title="Company Profile"
                  description="Update business info"
                  gradient="from-purple-600 to-purple-500"
                  onClick={() => navigate('/company')}
                />
              </ResponsiveStack>

              {/* Business Insights */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Business Insights
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">This Month</span>
                    <span className="font-semibold text-gray-900">
                      {defaultStats.totalInvoices} invoices
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-success-600">
                      ${defaultStats.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Pending</span>
                    <span className="font-semibold text-secondary-600">
                      {defaultStats.pendingInvoices} invoices
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </ResponsiveGrid>
        </MobileOptimizedSection>

        {/* Invoice Builder Modal */}
        <Modal
          open={showInvoiceBuilder}
          onClose={() => setShowInvoiceBuilder(false)}
          title="Create New Invoice"
          size="large"
        >
          <InvoiceBuilder
            onSave={handleInvoiceSave}
          />
        </Modal>

        {/* Customer Form Modal */}
        <Modal
          open={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          title="Add New Customer"
          size="medium"
        >
          <CustomerForm
            onSuccess={handleCustomerSuccess}
            onCancel={() => setShowCustomerForm(false)}
          />
        </Modal>
      </ResponsiveStack>
    </div>
  )
}

/**
 * QuickActionButton component for modern dashboard actions
 */
interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  gradient: string
  onClick: () => void
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  title,
  description,
  gradient,
  onClick,
}) => {
  return (
    <button
      type="button"
      className="w-full flex items-center justify-between p-4 text-left border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-medium transition-all duration-200 min-h-11 group"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div
          className={`p-2.5 rounded-xl bg-linear-to-br ${gradient} group-hover:shadow-glow transition-all duration-200 group-hover:scale-105`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all duration-200 group-hover:translate-x-1" />
    </button>
  )
}
