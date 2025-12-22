/**
 * Invoice Store
 * Zustand store for managing invoice state with local storage persistence
 * Integrates with calculation engine for reactive updates
 */

import { create } from 'zustand'
import type { Invoice, LineItem, InvoiceTotals, InvoiceStatus } from '../types/entities'
import type { InvoiceFormData, InvoiceFilters } from '../types/forms'
import { LocalStorageRepository, LocalStorageError } from '../services/localStorage.service'
import { InvoiceCalculationService } from '../services/invoiceCalculation.service'

/**
 * Invoice store state interface
 */
interface InvoiceStore {
  // State
  invoices: Invoice[]
  currentInvoice: Invoice | null
  loading: boolean
  error: string | null
  filters: InvoiceFilters
  sortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total'
  sortOrder: 'asc' | 'desc'

  // Actions
  createInvoice: (data: InvoiceFormData) => Promise<void>
  updateInvoice: (id: string, data: Partial<InvoiceFormData> | { status: InvoiceStatus }) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>
  loadInvoices: (userId: string) => Promise<void>
  getInvoice: (id: string) => Invoice | null
  setCurrentInvoice: (invoice: Invoice | null) => void
  generateInvoiceNumber: () => string
  calculateTotals: (lineItems: LineItem[], taxRate: number) => InvoiceTotals
  updateInvoiceCalculations: (id: string) => Promise<void>
  setFilters: (filters: Partial<InvoiceFilters>) => void
  setSorting: (sortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total', sortOrder: 'asc' | 'desc') => void
  getFilteredInvoices: () => Invoice[]
  clearError: () => void
  setLoading: (loading: boolean) => void
}

// Local storage repository for invoices
const invoiceRepository = new LocalStorageRepository<Invoice>('invoices')

/**
 * Generate unique ID for invoice
 */
const generateId = (): string => {
  return `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = now.getTime().toString().slice(-6) // Last 6 digits of timestamp
  return `INV-${year}${month}-${timestamp}`
}

/**
 * Sort invoices based on criteria
 */
const sortInvoices = (
  invoices: Invoice[], 
  sortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total', 
  sortOrder: 'asc' | 'desc'
): Invoice[] => {
  return [...invoices].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'invoiceNumber':
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'serviceDate':
        comparison = new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
        break
      case 'total':
        comparison = a.total - b.total
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

/**
 * Filter invoices based on criteria
 */
const filterInvoices = (invoices: Invoice[], filters: InvoiceFilters): Invoice[] => {
  return invoices.filter(invoice => {
    // Filter by status
    if (filters.status && invoice.status !== filters.status) {
      return false
    }
    
    // Filter by customer
    if (filters.customerId && invoice.customerId !== filters.customerId) {
      return false
    }
    
    // Filter by date range
    if (filters.dateFrom && new Date(invoice.serviceDate) < filters.dateFrom) {
      return false
    }
    
    if (filters.dateTo && new Date(invoice.serviceDate) > filters.dateTo) {
      return false
    }
    
    return true
  })
}

/**
 * Invoice Zustand store
 */
export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  // Initial state
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  filters: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',

  // Actions
  createInvoice: async (data: InvoiceFormData) => {
    set({ loading: true, error: null })
    
    try {
      // Get current user ID from auth store
      const authUser = JSON.parse(localStorage.getItem('user') || 'null')
      if (!authUser?.id) {
        throw new Error('User not authenticated')
      }
      const userId = authUser.id
      
      const now = new Date()
      
      // Calculate line item amounts
      const lineItemsWithAmounts = data.lineItems.map(item => ({
        ...item,
        invoiceId: '', // Will be set after invoice creation
        amount: InvoiceCalculationService.calculateLineItemAmount(item.quantity, item.rate)
      }))
      
      // Calculate totals
      const totals = InvoiceCalculationService.calculateInvoiceTotals(lineItemsWithAmounts, data.taxRate)
      
      const invoiceId = generateId()
      
      // Update line items with invoice ID
      const finalLineItems = lineItemsWithAmounts.map(item => ({
        ...item,
        invoiceId
      }))
      
      const newInvoice: Invoice = {
        id: invoiceId,
        userId,
        customerId: data.customerId,
        invoiceNumber: generateInvoiceNumber(),
        serviceDate: data.serviceDate,
        dueDate: data.dueDate,
        lineItems: finalLineItems,
        subtotal: totals.subtotal,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.total,
        notes: data.notes,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      }

      invoiceRepository.create(newInvoice)
      
      // Update local state
      const { invoices, sortBy, sortOrder } = get()
      const updatedInvoices = [...invoices, newInvoice]
      const sortedInvoices = sortInvoices(updatedInvoices, sortBy, sortOrder)
      
      set({ invoices: sortedInvoices, currentInvoice: newInvoice, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to create invoice'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  updateInvoice: async (id: string, data: Partial<InvoiceFormData> | { status: InvoiceStatus }) => {
    set({ loading: true, error: null })

    try {
      const { invoices } = get()
      const existingInvoice = invoices.find(inv => inv.id === id)
      
      if (!existingInvoice) {
        throw new Error('Invoice not found')
      }

      // If line items or tax rate are being updated, recalculate totals
      if ('lineItems' in data && data.lineItems || 'taxRate' in data && data.taxRate !== undefined) {
        const lineItems = ('lineItems' in data && data.lineItems) || existingInvoice.lineItems
        const taxRate = ('taxRate' in data && data.taxRate !== undefined) ? data.taxRate : existingInvoice.taxRate
        
        // Calculate line item amounts
        const lineItemsWithAmounts: LineItem[] = lineItems.map(item => ({
          ...item,
          invoiceId: id,
          amount: InvoiceCalculationService.calculateLineItemAmount(item.quantity, item.rate)
        }))
        
        // Calculate totals
        const totals = InvoiceCalculationService.calculateInvoiceTotals(lineItemsWithAmounts, taxRate)
        
        const updatedInvoice = invoiceRepository.update(id, {
          ...data,
          lineItems: lineItemsWithAmounts,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          taxRate: taxRate,
          updatedAt: new Date(),
        })

        if (!updatedInvoice) {
          throw new Error('Failed to update invoice')
        }

        // Update local state
        const updatedInvoices = invoices.map(invoice => 
          invoice.id === id ? updatedInvoice : invoice
        )
        const { sortBy, sortOrder } = get()
        const sortedInvoices = sortInvoices(updatedInvoices, sortBy, sortOrder)
        
        set({ 
          invoices: sortedInvoices, 
          currentInvoice: get().currentInvoice?.id === id ? updatedInvoice : get().currentInvoice,
          loading: false 
        })
      } else {
        // Simple update without line items recalculation
        // Filter out lineItems from data to avoid type issues
        const { lineItems, ...updateData } = data as any
        const updatedInvoice = invoiceRepository.update(id, {
          ...updateData,
          updatedAt: new Date(),
        })

        if (!updatedInvoice) {
          throw new Error('Failed to update invoice')
        }

        // Update local state
        const updatedInvoices = invoices.map(invoice => 
          invoice.id === id ? updatedInvoice : invoice
        )
        const { sortBy, sortOrder } = get()
        const sortedInvoices = sortInvoices(updatedInvoices, sortBy, sortOrder)
        
        set({ 
          invoices: sortedInvoices, 
          currentInvoice: get().currentInvoice?.id === id ? updatedInvoice : get().currentInvoice,
          loading: false 
        })
      }
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to update invoice'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  deleteInvoice: async (id: string) => {
    set({ loading: true, error: null })

    try {
      const deleted = invoiceRepository.delete(id)
      
      if (!deleted) {
        throw new Error('Invoice not found')
      }

      // Update local state
      const { invoices, currentInvoice } = get()
      const updatedInvoices = invoices.filter(invoice => invoice.id !== id)
      const newCurrentInvoice = currentInvoice?.id === id ? null : currentInvoice
      
      set({ invoices: updatedInvoices, currentInvoice: newCurrentInvoice, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to delete invoice'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  loadInvoices: async (userId: string) => {
    set({ loading: true, error: null })

    try {
      const allInvoices = invoiceRepository.getAll()
      const userInvoices = allInvoices.filter(invoice => invoice.userId === userId)
      
      const { sortBy, sortOrder } = get()
      const sortedInvoices = sortInvoices(userInvoices, sortBy, sortOrder)
      
      set({ invoices: sortedInvoices, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to load invoices'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  getInvoice: (id: string) => {
    const { invoices } = get()
    return invoices.find(invoice => invoice.id === id) || null
  },

  setCurrentInvoice: (invoice: Invoice | null) => {
    set({ currentInvoice: invoice })
  },

  generateInvoiceNumber: () => {
    return generateInvoiceNumber()
  },

  calculateTotals: (lineItems: LineItem[], taxRate: number) => {
    return InvoiceCalculationService.calculateInvoiceTotals(lineItems, taxRate)
  },

  updateInvoiceCalculations: async (id: string) => {
    const { invoices } = get()
    const invoice = invoices.find(inv => inv.id === id)
    
    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Recalculate line item amounts
    const updatedLineItems = invoice.lineItems.map(item => ({
      ...item,
      amount: InvoiceCalculationService.calculateLineItemAmount(item.quantity, item.rate)
    }))

    // Update the invoice
    await get().updateInvoice(id, {
      lineItems: updatedLineItems,
      taxRate: invoice.taxRate
    })
  },

  setFilters: (filters: Partial<InvoiceFilters>) => {
    const currentFilters = get().filters
    set({ filters: { ...currentFilters, ...filters } })
  },

  setSorting: (sortBy: 'invoiceNumber' | 'createdAt' | 'serviceDate' | 'total', sortOrder: 'asc' | 'desc') => {
    const { invoices } = get()
    const sortedInvoices = sortInvoices(invoices, sortBy, sortOrder)
    set({ sortBy, sortOrder, invoices: sortedInvoices })
  },

  getFilteredInvoices: () => {
    const { invoices, filters, sortBy, sortOrder } = get()
    const filtered = filterInvoices(invoices, filters)
    return sortInvoices(filtered, sortBy, sortOrder)
  },

  clearError: () => {
    set({ error: null })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))