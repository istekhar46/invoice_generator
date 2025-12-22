/**
 * DashboardStats Component
 * Displays key business metrics and statistics
 * Requirements: 8.1, 10.1, 10.2, 10.3, 10.5
 */

import React from 'react'
import { Card } from '../../ui/Card'
import type { DashboardStatistics } from '../../../services/dashboardStatistics.service'

interface DashboardStatsProps {
  statistics: DashboardStatistics
  totalCustomers: number
  loading?: boolean
}

/**
 * Individual stat card component
 */
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading = false }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-md bg-gray-200 animate-pulse" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="h-6 bg-gray-200 rounded animate-pulse mt-1" />
            </dl>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`h-8 w-8 rounded-md ${colorClasses[color]} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-lg font-medium text-gray-900">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  )
}

/**
 * DashboardStats component displaying key business metrics
 */
export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  statistics, 
  totalCustomers, 
  loading = false 
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(statistics.totalRevenue)}
        icon={<span className="text-white text-sm font-medium">$</span>}
        color="blue"
        loading={loading}
      />
      
      <StatCard
        title="Total Invoices"
        value={statistics.totalInvoices}
        icon={<span className="text-white text-sm font-medium">#</span>}
        color="green"
        loading={loading}
      />
      
      <StatCard
        title="Pending Invoices"
        value={statistics.pendingInvoices}
        icon={<span className="text-white text-sm font-medium">!</span>}
        color="yellow"
        loading={loading}
      />
      
      <StatCard
        title="Total Customers"
        value={totalCustomers}
        icon={<span className="text-white text-sm font-medium">👥</span>}
        color="purple"
        loading={loading}
      />
    </div>
  )
}