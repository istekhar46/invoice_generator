import React from 'react'
import { CustomerList } from '../components/features/customers'
import { ResponsiveContainer } from '../components/layout/ResponsiveLayout'

/**
 * CustomersPage component for managing customer information with modern design.
 * 
 * Requirements: 3.2 - WHEN a user views the customer list, THE System SHALL display all customers sorted by creation date
 */
export const CustomersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      <ResponsiveContainer maxWidth="xl" padding="md" className="py-6">
        <div className="animate-fade-in">
          <CustomerList />
        </div>
      </ResponsiveContainer>
    </div>
  )
}