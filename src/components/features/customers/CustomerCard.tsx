/**
 * Customer Card Component
 * Individual customer display card with actions
 */

import React from 'react'
import type { Customer } from '../../../types/entities'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { usePrefetchOnHover, usePrefetchRelated } from '../../../hooks'
import { Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react'

interface CustomerCardProps {
  customer: Customer
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => void
  onSelect?: (customer: Customer) => void
  showActions?: boolean
  selectable?: boolean
  selected?: boolean
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onEdit,
  onDelete,
  onSelect,
  showActions = true,
  selectable = false,
  selected = false,
}) => {
  const { prefetchCustomer, cancelPrefetch } = usePrefetchOnHover()
  const { prefetchCustomerInvoices } = usePrefetchRelated()

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(customer)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(customer)
  }

  const handleSelect = () => {
    if (selectable) {
      onSelect?.(customer)
    }
  }

  const handleMouseEnter = () => {
    // Prefetch customer details and related invoices on hover
    prefetchCustomer(customer.id)
    prefetchCustomerInvoices(customer.id)
  }

  const handleMouseLeave = () => {
    // Cancel prefetch if user moves away quickly
    cancelPrefetch()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  return (
    <Card 
      className={`
        transition-all duration-200 hover:shadow-md
        ${selectable ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      `}
      onClick={handleSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {customer.name}
          </CardTitle>
          {showActions && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="small"
                onClick={handleEdit}
                aria-label={`Edit ${customer.name}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={handleDelete}
                aria-label={`Delete ${customer.name}`}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Information */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{customer.phone}</span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div>{customer.address}</div>
            <div>{customer.city}, {customer.state} {customer.zipCode}</div>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Added {formatDate(customer.createdAt)}
          </div>
        </div>
      </CardContent>

      {selectable && (
        <CardFooter className="pt-0">
          <div className="text-xs text-gray-500">
            Click to select this customer
          </div>
        </CardFooter>
      )}
    </Card>
  )
}