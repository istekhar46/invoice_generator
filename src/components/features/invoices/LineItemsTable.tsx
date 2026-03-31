/**
 * Line Items Table Component
 * Dynamic table for managing invoice line items with add/edit/delete functionality
 */

import React, { useState } from 'react'
import type { LineItem } from '../../../types/entities'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card'
import { Modal } from '../../ui/Modal'
import { Plus, Edit, Trash2, Check, X } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatters'
import { InvoiceCalculationService } from '../../../services/invoiceCalculation.service'

interface LineItemsTableProps {
  lineItems: LineItem[]
  onChange: (lineItems: LineItem[]) => void
  disabled?: boolean
}

interface LineItemFormData {
  description: string
  unit: string
  quantity: string
  rate: string
}

const emptyLineItem: LineItemFormData = {
  description: '',
  unit: '',
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
  const [showMobileModal, setShowMobileModal] = useState(false)
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
    if (!data.unit.trim()) {
      newErrors.unit = 'Unit is required'
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
      type: 'material',
      description: formData.description.trim(),
      unit: formData.unit.trim(),
      quantity,
      rate,
      amount,
    }

    onChange([...lineItems, newLineItem])
    setFormData(emptyLineItem)
    setShowAddForm(false)
    setShowMobileModal(false)
    setErrors({})
  }

  const handleEditLineItem = (id: string) => {
    const item = lineItems.find(item => item.id === id)
    if (item) {
      setFormData({
        description: item.description,
        unit: item.unit || '',
        quantity: item.quantity.toString(),
        rate: item.rate.toString(),
      })
      setEditingId(id)
      setShowMobileModal(true)
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
            type: 'material' as const,
            description: formData.description.trim(),
            unit: formData.unit.trim(),
            quantity,
            rate,
            amount,
          }
        : item
    )

    onChange(updatedLineItems)
    setEditingId(null)
    setFormData(emptyLineItem)
    setShowMobileModal(false)
    setErrors({})
  }

  const handleDeleteLineItem = (id: string) => {
    const updatedLineItems = lineItems.filter(item => item.id !== id)
    onChange(updatedLineItems)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setShowAddForm(false)
    setShowMobileModal(false)
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

  const openAddForm = () => {
    setFormData(emptyLineItem)
    setEditingId(null)
    setErrors({})
    // On mobile, use modal; on desktop, use inline form
    if (window.innerWidth < 768) {
      setShowMobileModal(true)
    } else {
      setShowAddForm(true)
    }
  }

  const renderMobileForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Name *
        </label>
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          placeholder="Enter description"
          error={errors.description}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Unit *
        </label>
        <Input
          type="text"
          value={formData.unit}
          onChange={(e) => handleFormChange('unit', e.target.value)}
          placeholder="mtr, bundle, box..."
          error={errors.unit}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantity *
        </label>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rate *
        </label>
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
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total Amount:</span>
          <span className="text-lg font-bold text-gray-900">
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
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={handleCancelEdit}
          disabled={disabled}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={editingId ? handleUpdateLineItem : handleAddLineItem}
          disabled={disabled}
          className="flex-1"
        >
          {editingId ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </div>
  )

  const renderFormRow = (isEditing: boolean = false, key?: string) => (
    <tr key={key} className="bg-gray-50/50">
      <td className="px-4 py-3">
        <Input
          type="text"
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          placeholder="Item name"
          error={errors.description}
          disabled={disabled}
          variant="filled"
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
          variant="filled"
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
          variant="filled"
        />
        <div className="mt-2">
          <Input
            type="text"
            value={formData.unit}
            onChange={(e) => handleFormChange('unit', e.target.value)}
            placeholder="unit"
            error={errors.unit}
            disabled={disabled}
            variant="filled"
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="bg-gray-100 rounded-xl px-4 py-3 min-h-11 flex items-center justify-end">
          <span className="text-sm font-medium text-gray-700">
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
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              isEditing ? handleUpdateLineItem() : handleAddLineItem()
            }}
            disabled={disabled}
            title={isEditing ? 'Save Changes' : 'Add Line Item'}
            className="text-success-600 hover:text-success-700 hover:bg-success-50"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCancelEdit()
            }}
            disabled={disabled}
            title="Cancel"
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            {!showAddForm && !editingId && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openAddForm()
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
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No line items yet</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Add material charges to build your invoice.
              </p>
              <Button
                variant="primary"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openAddForm()
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
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((item) => (
                    editingId === item.id && window.innerWidth >= 768 ? (
                      // Show edit form for this item (desktop only)
                      renderFormRow(true, item.id)
                    ) : (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.quantity} {item.unit}
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
                  
                  {/* Add Form Row (desktop only) */}
                  {showAddForm && renderFormRow(false, 'add-form')}
                  
                  {/* Subtotal Row */}
                  {lineItems.length > 0 && (
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
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

      {/* Mobile Modal for Add/Edit */}
      <Modal
        open={showMobileModal}
        onClose={handleCancelEdit}
        title={editingId ? 'Edit Line Item' : 'Add Line Item'}
        size="medium"
      >
        {renderMobileForm()}
      </Modal>
    </>
  )
}
