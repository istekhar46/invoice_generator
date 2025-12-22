/**
 * Line Items Table Component
 * Dynamic table for managing invoice line items with add/edit/delete functionality
 */

import React, { useState } from 'react'
import type { LineItem, LineItemType } from '../../../types/entities'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { Plus, Edit, Trash2, Check, X } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'
import { InvoiceCalculationService } from '../../../services/invoiceCalculation.service'

interface LineItemsTableProps {
  lineItems: LineItem[]
  onChange: (lineItems: LineItem[]) => void
  disabled?: boolean
}

interface LineItemFormData {
  type: LineItemType
  description: string
  quantity: string
  rate: string
}

const emptyLineItem: LineItemFormData = {
  type: 'labor',
  description: '',
  quantity: '',
  rate: '',
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  lineItems,
  onChange,
  disabled = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<LineItemFormData>(emptyLineItem)
  const [errors, setErrors] = useState<Partial<LineItemFormData>>({})

  const generateId = (): string => {
    return `lineitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const validateForm = (data: LineItemFormData): boolean => {
    const newErrors: Partial<LineItemFormData> = {}

    if (!data.description.trim()) {
      newErrors.description = 'Description is required'
    }

    const quantity = parseFloat(data.quantity)
    if (!data.quantity || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Quantity must be a positive number'
    }

    const rate = parseFloat(data.rate)
    if (!data.rate || isNaN(rate) || rate < 0) {
      newErrors.rate = 'Rate must be a non-negative number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddLineItem = () => {
    if (!validateForm(formData)) return

    const quantity = parseFloat(formData.quantity)
    const rate = parseFloat(formData.rate)
    const amount = InvoiceCalculationService.calculateLineItemAmount(quantity, rate)

    const newLineItem: LineItem = {
      id: generateId(),
      invoiceId: '', // Will be set when invoice is saved
      type: formData.type,
      description: formData.description.trim(),
      quantity,
      rate,
      amount,
    }

    onChange([...lineItems, newLineItem])
    setFormData(emptyLineItem)
    setShowAddForm(false)
    setErrors({})
  }

  const handleEditLineItem = (id: string) => {
    const item = lineItems.find(item => item.id === id)
    if (item) {
      setFormData({
        type: item.type,
        description: item.description,
        quantity: item.quantity.toString(),
        rate: item.rate.toString(),
      })
      setEditingId(id)
      setErrors({})
    }
  }

  const handleUpdateLineItem = () => {
    if (!validateForm(formData) || !editingId) return

    const quantity = parseFloat(formData.quantity)
    const rate = parseFloat(formData.rate)
    const amount = InvoiceCalculationService.calculateLineItemAmount(quantity, rate)

    const updatedLineItems = lineItems.map(item =>
      item.id === editingId
        ? {
            ...item,
            type: formData.type,
            description: formData.description.trim(),
            quantity,
            rate,
            amount,
          }
        : item
    )

    onChange(updatedLineItems)
    setEditingId(null)
    setFormData(emptyLineItem)
    setErrors({})
  }

  const handleDeleteLineItem = (id: string) => {
    const updatedLineItems = lineItems.filter(item => item.id !== id)
    onChange(updatedLineItems)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData(emptyLineItem)
    setErrors({})
  }

  const handleFormChange = (field: keyof LineItemFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const calculateSubtotal = (): number => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0)
  }

  const renderFormRow = (isEditing: boolean = false, key?: string) => (
    <tr key={key} className="bg-gray-50">
      <td className="px-4 py-3">
        <select
          value={formData.type}
          onChange={(e) => handleFormChange('type', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        >
          <option value="labor">Labor</option>
          <option value="material">Material</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          placeholder="Description"
          error={errors.description}
          disabled={disabled}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          value={formData.quantity}
          onChange={(e) => handleFormChange('quantity', e.target.value)}
          placeholder="0"
          min="0"
          step="0.01"
          error={errors.quantity}
          disabled={disabled}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          value={formData.rate}
          onChange={(e) => handleFormChange('rate', e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          error={errors.rate}
          disabled={disabled}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-gray-500">
          {formData.quantity && formData.rate && !errors.quantity && !errors.rate
            ? formatCurrency(
                InvoiceCalculationService.calculateLineItemAmount(
                  parseFloat(formData.quantity) || 0,
                  parseFloat(formData.rate) || 0
                )
              )
            : '$0.00'
          }
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="small"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              isEditing ? handleUpdateLineItem() : handleAddLineItem()
            }}
            disabled={disabled}
            title={isEditing ? 'Save Changes' : 'Add Line Item'}
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="small"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCancelEdit()
            }}
            disabled={disabled}
            title="Cancel"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </td>
    </tr>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {!showAddForm && !editingId && (
            <Button
              variant="outline"
              size="small"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowAddForm(true)
              }}
              disabled={disabled}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 && !showAddForm ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No line items added yet</p>
            <Button
              variant="outline"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowAddForm(true)
              }}
              disabled={disabled}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Line Item</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item) => (
                  editingId === item.id ? (
                    // Show edit form for this item
                    renderFormRow(true, item.id)
                  ) : (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.type === 'labor' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="small"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditLineItem(item.id)
                            }}
                            disabled={disabled || editingId !== null || showAddForm}
                            title="Edit Line Item"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLineItem(item.id)
                            }}
                            disabled={disabled || editingId !== null || showAddForm}
                            title="Delete Line Item"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
                
                {/* Add Form Row */}
                {showAddForm && renderFormRow(false, 'add-form')}
                
                {/* Subtotal Row */}
                {lineItems.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Subtotal:
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(calculateSubtotal())}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}