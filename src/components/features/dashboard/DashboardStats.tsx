/**
 * DashboardStats Component
 * Displays key business metrics and statistics with modern design
 * Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 10.1, 10.2, 10.3, 10.5
 */

import React from 'react'
import { Card } from '../../ui/Card'
import { ShimmerStats } from '../../ui/ShimmerLoading'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../../utils/classNames'
import type { DashboardStatistics } from '../../../services/dashboardStatistics.service'

interface DashboardStatsProps {
  statistics: DashboardStatistics
  totalCustomers: number
  loading?: boolean
}

/**
 * Individual stat card component with modern design
 * Implements hover lift effects, gradient backgrounds, and trend indicators
 */
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  change?: number
  index: number
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient,
  change,
  index,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card 
        padding="md"
        className="animate-slide-up transition-all duration-300"
        style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded mb-2" />
            <div className="h-8 w-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded mb-2" />
            <div className="h-4 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer rounded" />
          </div>
          <div className="p-3 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-shimmer">
            <div className="w-6 h-6" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      padding="md" 
      hover
      className="animate-slide-up transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              change > 0 ? "text-success-600" : change < 0 ? "text-danger-600" : "text-gray-600"
            )}>
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : change < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : null}
              <span>{change !== 0 ? `${Math.abs(change)}%` : 'No change'}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-2xl bg-gradient-to-br",
          gradient
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  )
}

/**
 * DashboardStats component displaying key business metrics with modern design
 * Implements responsive grid, staggered animations, and trend indicators
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

  // Calculate trend indicators (mock data for demonstration)
  // In a real app, these would come from historical data comparison
  const trends = {
    revenue: 12.5,
    invoices: 8.3,
    pending: -5.2,
    customers: 15.7
  }

  // Use shimmer loading for better UX
  if (loading) {
    return <ShimmerStats cards={4} className="animate-fade-in" />
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(statistics.totalRevenue)}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )}
        gradient="from-primary-600 to-primary-500"
        change={trends.revenue}
        index={0}
        loading={loading}
      />
      
      <StatCard
        title="Total Invoices"
        value={statistics.totalInvoices}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        gradient="from-success-600 to-success-500"
        change={trends.invoices}
        index={1}
        loading={loading}
      />
      
      <StatCard
        title="Pending Invoices"
        value={statistics.pendingInvoices}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        gradient="from-secondary-600 to-secondary-500"
        change={trends.pending}
        index={2}
        loading={loading}
      />
      
      <StatCard
        title="Total Customers"
        value={totalCustomers}
        icon={({ className }) => (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        gradient="from-purple-600 to-purple-500"
        change={trends.customers}
        index={3}
        loading={loading}
      />
    </div>
  )
}