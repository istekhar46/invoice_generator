import React from 'react'
import { CustomerList } from '../components/features/customers'

/**
 * CustomersPage component for managing customer information.
 * 
 * Requirements: 3.2 - WHEN a user views the customer list, THE System SHALL display all customers sorted by creation date
 */
export const CustomersPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <CustomerList />
    </div>
  )
}