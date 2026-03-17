/**
 * Line Items Step Component
 * Fourth step in guest invoice wizard - add and manage line items
 */

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { FormActions } from '../ui/FormField'
import type { LineItem } from '../../types/entities'
import { InvoiceCalculationService } from '../../services/invoiceCalculation.service'
import { Plus, Trash2, Edit2, Package, Wrench } from 'lucide-react'

interface LineItemsStepProps {
  data: LineItem[]
  taxRate: number
  onNext: (data: LineItem[]) => void
  onBack: () => void
}

interface LineItemFormData {
  type: 'material' | 'labor'
  description: string
  quantity: string
  rate: string
}

export const LineItemsStep: React.FC<LineItemsStepProps> = ({
  data,
  taxRate,
  onNext,
  onBack,
}) => {
  const [lineItems, setLineItems] = useState<LineItem[]>(data || [])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<LineItemFormData>({
    type: 'labor',
    description: '',
    quantity: '1',
    rate: '0',
  })
  const [errors, setErrors] = useState<Partial<LineItemFormData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<LineItemFormData> = {}
    
    if (!formData.description || formData.description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters'
    }
    
    const qty = parseFloat(formData.quantity)
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }
    
    const rate = parseFloat(formData.rate)
    if (isNaN(rate) || rate < 0) {
      newErrors.rate = 'Rate must be non-negative'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddItem = () => {
    if (!validateForm()) return
    
    const quantity = parseFloat(formData.quantity)
    const rate = parseFloat(formData.rate)
    const amount = InvoiceCalculationService.calculateLineItemAmount(quantity, rate)
    
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      invoiceId: 'guest',
      type: formData.type,
      description: formData.description.trim(),
      quantity,
      rate,
      amount,
    }
    
    setLineItems([...lineItems, newItem])
    setFormData({ type: 'labor', description: '', quantity: '1', rate: '0' })
    setIsAdding(false)
    setErrors({})
  }

  const handleUpdateItem = () => {
    if (!validateForm() || !editingId) return
    
    const quantity = parseFloat(formData.quantity)
    const rate = parseFloat(formData.rate)
    const amount = InvoiceCalculationService.calculateLineItemAmount(quantity, rate)
    
    setLineItems(lineItems.map(item =>
      item.id === editingId
        ? { ...item, ...formData, quantity, rate, amount, description: formData.description.trim() }
        : item
    ))
    
    setFormData({ type: 'labor', description: '', quantity: '1', rate: '0' })
    setEditingId(null)
    setErrors({})
  }

  const handleEditItem = (item: LineItem) => {
    setFormData({
      type: item.type,
      description: item.description,
      quantity: item.quantity.toString(),
      rate: item.rate.toString(),
    })
    setEditingId(item.id)
    setIsAdding(false)
  }

  const handleDeleteItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleCancel = () => {
    setFormData({ type: 'labor', description: '', quantity: '1', rate: '0' })
    setIsAdding(false)
    setEditingId(null)
    setErrors({})
  }

  const totals = InvoiceCalculationService.calculateInvoiceTotals(lineItems, taxRate)
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  const canProceed = lineItems.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Line Items</h2>
        <p className="text-gray-600">
          Add items or services <span className="text-red-500">*</span> At least one required
        </p>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        {lineItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {item.type === 'material' ? (
                          <Package className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Wrench className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-sm font-medium capitalize">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditItem(item)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          aria-label="Edit item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          aria-label="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No line items yet. Add your first item below.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Item' : 'Add New Item'}
          </h3>
          
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="labor"
                  checked={formData.type === 'labor'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'labor' })}
                  className="w-4 h-4 text-blue-600"
                />
                <Wrench className="w-4 h-4 text-green-600" />
                <span className="text-sm">Labor</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="material"
                  checked={formData.type === 'material'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'material' })}
                  className="w-4 h-4 text-blue-600"
                />
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Material</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe the item or service..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Quantity and Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-base border-2 border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.rate && (
                <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={editingId ? handleUpdateItem : handleAddItem}
              fullWidth
            >
              {editingId ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </div>
      )}

      {/* Add Item Button */}
      {!isAdding && !editingId && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsAdding(true)}
          fullWidth
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Line Item
        </Button>
      )}

      {/* Totals Summary */}
      {lineItems.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tax ({(taxRate * 100).toFixed(2)}%):</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totals.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-blue-300">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <FormActions align="between" responsive>
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => onNext(lineItems)}
          disabled={!canProceed}
        >
          Continue to Review
        </Button>
      </FormActions>
    </div>
  )
}
