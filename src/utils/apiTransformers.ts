/**
 * API Response Transformers
 * Utilities to transform API DTOs to frontend entity types
 */

import type { Customer, Invoice, LineItem } from '../types/entities'
import type { 
  CustomerResponseDto, 
  InvoiceResponseDto, 
  LineItemResponseDto,
  CreateLineItemDto
} from '../services/api'
import type { InvoiceFormData } from '../types/forms'

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
  type: 'material',
  unit: dto.unit ?? '',
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
 * Extract and transform nested customer data from InvoiceResponseDto
 * Converts the nested customer object to a standalone Customer entity
 */
export const extractCustomerFromInvoiceResponse = (dto: InvoiceResponseDto): Customer => ({
  id: dto.customer.id,
  userId: '', // API doesn't provide userId, but frontend expects it
  name: dto.customer.name,
  email: dto.customer.email,
  phone: dto.customer.phone,
  address: dto.customer.address,
  city: dto.customer.city,
  state: dto.customer.state,
  zipCode: dto.customer.zipCode,
  createdAt: new Date(), // Not provided in nested customer object
  updatedAt: new Date(), // Not provided in nested customer object
})

/**
 * Transform frontend LineItem to API CreateLineItemDto
 * Converts lowercase enum values to uppercase for API compatibility
 * Normalizes all line items to MATERIAL for backend payloads
 */
export const transformLineItemToDto = (lineItem: LineItem | { type: string; description: string; unit?: string; quantity: number; rate: number }): CreateLineItemDto => ({
  type: 'MATERIAL',
  description: lineItem.description,
  unit: lineItem.unit?.trim() || '',
  quantity: lineItem.quantity,
  rate: lineItem.rate,
})

/**
 * Transform frontend Invoice/InvoiceFormData to API UpdateInvoiceDto
 * Serializes Date objects to ISO 8601 strings with millisecond precision
 * Omits undefined values from the request payload
 * Handles optional fields appropriately (undefined omitted, null preserved)
 */
export const transformInvoiceToUpdateDto = (
  invoice: Partial<InvoiceFormData> | Partial<Invoice>
): any => {
  const dto: any = {}

  // Only include fields that are explicitly provided
  if (invoice.customerId !== undefined) {
    dto.customerId = invoice.customerId
  }

  // Serialize dates to ISO 8601 format (maintains millisecond precision)
  if (invoice.serviceDate !== undefined) {
    dto.serviceDate = invoice.serviceDate instanceof Date 
      ? invoice.serviceDate.toISOString()
      : new Date(invoice.serviceDate).toISOString()
  }

  if (invoice.dueDate !== undefined) {
    dto.dueDate = invoice.dueDate instanceof Date 
      ? invoice.dueDate.toISOString()
      : new Date(invoice.dueDate).toISOString()
  }

  // Transform line items if provided
  if (invoice.lineItems !== undefined) {
    dto.lineItems = invoice.lineItems.map(transformLineItemToDto)
  }

  // Handle optional notes field (undefined omitted, null preserved, empty string preserved)
  if (invoice.notes !== undefined) {
    dto.notes = invoice.notes || undefined
  }

  // Include tax rate if provided
  if (invoice.taxRate !== undefined) {
    dto.taxRate = invoice.taxRate
  }

  return dto
}
