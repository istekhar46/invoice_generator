/**
 * API Response Transformers
 * Utilities to transform API DTOs to frontend entity types
 */

import type { Customer, Invoice, LineItem } from '../types/entities'
import type { CustomerResponseDto, InvoiceResponseDto, LineItemResponseDto } from '../services/api'

/**
 * Transform CustomerResponseDto to Customer entity
 * Adds missing userId field (will be empty string as it's not provided by API)
 */
export const transformCustomerResponse = (dto: CustomerResponseDto): Customer => ({
  ...dto,
  userId: '', // API doesn't provide userId, but frontend expects it
})

/**
 * Transform LineItemResponseDto to LineItem entity
 * Converts uppercase enum values to lowercase for frontend compatibility
 */
export const transformLineItemResponse = (dto: LineItemResponseDto, invoiceId: string): LineItem => ({
  ...dto,
  invoiceId,
  type: dto.type.toLowerCase() as 'material' | 'labor',
})

/**
 * Transform InvoiceResponseDto to Invoice entity
 * Handles nested customer data and line items transformation
 */
export const transformInvoiceResponse = (dto: InvoiceResponseDto): Invoice => ({
  id: dto.id,
  userId: '', // API doesn't provide userId, but frontend expects it
  customerId: dto.customer.id,
  invoiceNumber: dto.invoiceNumber,
  serviceDate: new Date(dto.serviceDate),
  dueDate: new Date(dto.dueDate),
  lineItems: dto.lineItems.map(item => transformLineItemResponse(item, dto.id)),
  subtotal: dto.subtotal,
  taxRate: dto.taxRate,
  taxAmount: dto.taxAmount,
  total: dto.total,
  notes: dto.notes,
  status: dto.status.toLowerCase() as 'draft' | 'sent' | 'paid',
  createdAt: new Date(dto.createdAt),
  updatedAt: new Date(dto.updatedAt),
})

/**
 * Transform frontend LineItem to API CreateLineItemDto
 * Converts lowercase enum values to uppercase for API compatibility
 */
export const transformLineItemToDto = (lineItem: LineItem) => ({
  type: lineItem.type.toUpperCase() as 'MATERIAL' | 'LABOR',
  description: lineItem.description,
  quantity: lineItem.quantity,
  rate: lineItem.rate,
})