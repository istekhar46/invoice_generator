/**
 * Customer Store
 * Zustand store for managing customer state with local storage persistence
 */

import { create } from 'zustand'
import type { Customer } from '../types/entities'
import type { CustomerFormData } from '../types/forms'
import { LocalStorageRepository, LocalStorageError } from '../services/localStorage.service'

/**
 * Customer store state interface
 */
interface CustomerStore {
  // State
  customers: Customer[]
  loading: boolean
  error: string | null
  searchQuery: string
  sortBy: 'name' | 'createdAt'
  sortOrder: 'asc' | 'desc'

  // Actions
  addCustomer: (data: CustomerFormData) => Promise<void>
  updateCustomer: (id: string, data: Partial<CustomerFormData>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  loadCustomers: (userId: string) => Promise<void>
  getCustomer: (id: string) => Customer | null
  searchCustomers: (query: string) => void
  setSorting: (sortBy: 'name' | 'createdAt', sortOrder: 'asc' | 'desc') => void
  getFilteredCustomers: () => Customer[]
  clearError: () => void
  setLoading: (loading: boolean) => void
}

// Local storage repository for customers
const customerRepository = new LocalStorageRepository<Customer>('customers')

/**
 * Generate unique ID for customer
 */
const generateId = (): string => {
  return `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sort customers based on criteria
 */
const sortCustomers = (customers: Customer[], sortBy: 'name' | 'createdAt', sortOrder: 'asc' | 'desc'): Customer[] => {
  return [...customers].sort((a, b) => {
    let comparison = 0
    
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

/**
 * Filter customers based on search query
 */
const filterCustomers = (customers: Customer[], searchQuery: string): Customer[] => {
  if (!searchQuery.trim()) {
    return customers
  }
  
  const query = searchQuery.toLowerCase()
  return customers.filter(customer => 
    customer.name.toLowerCase().includes(query) ||
    customer.email.toLowerCase().includes(query) ||
    customer.phone.includes(query) ||
    customer.address.toLowerCase().includes(query) ||
    customer.city.toLowerCase().includes(query)
  )
}

/**
 * Customer Zustand store
 */
export const useCustomerStore = create<CustomerStore>((set, get) => ({
  // Initial state
  customers: [],
  loading: false,
  error: null,
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',

  // Actions
  addCustomer: async (data: CustomerFormData) => {
    set({ loading: true, error: null })
    
    try {
      // Get current user ID from auth store
      const authUser = JSON.parse(localStorage.getItem('user') || 'null')
      if (!authUser?.id) {
        throw new Error('User not authenticated')
      }
      const userId = authUser.id
      
      const now = new Date()
      const newCustomer: Customer = {
        id: generateId(),
        userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        createdAt: now,
        updatedAt: now,
      }

      customerRepository.create(newCustomer)
      
      // Update local state
      const { customers, sortBy, sortOrder } = get()
      const updatedCustomers = [...customers, newCustomer]
      const sortedCustomers = sortCustomers(updatedCustomers, sortBy, sortOrder)
      
      set({ customers: sortedCustomers, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to add customer'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  updateCustomer: async (id: string, data: Partial<CustomerFormData>) => {
    set({ loading: true, error: null })

    try {
      const updatedCustomer = customerRepository.update(id, {
        ...data,
        updatedAt: new Date(),
      })

      if (!updatedCustomer) {
        throw new Error('Customer not found')
      }

      // Update local state
      const { customers, sortBy, sortOrder } = get()
      const updatedCustomers = customers.map(customer => 
        customer.id === id ? updatedCustomer : customer
      )
      const sortedCustomers = sortCustomers(updatedCustomers, sortBy, sortOrder)
      
      set({ customers: sortedCustomers, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to update customer'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  deleteCustomer: async (id: string) => {
    set({ loading: true, error: null })

    try {
      const deleted = customerRepository.delete(id)
      
      if (!deleted) {
        throw new Error('Customer not found')
      }

      // Update local state
      const { customers } = get()
      const updatedCustomers = customers.filter(customer => customer.id !== id)
      
      set({ customers: updatedCustomers, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to delete customer'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  loadCustomers: async (userId: string) => {
    set({ loading: true, error: null })

    try {
      const allCustomers = customerRepository.getAll()
      const userCustomers = allCustomers.filter(customer => customer.userId === userId)
      
      const { sortBy, sortOrder } = get()
      const sortedCustomers = sortCustomers(userCustomers, sortBy, sortOrder)
      
      set({ customers: sortedCustomers, loading: false })
    } catch (error) {
      const errorMessage = error instanceof LocalStorageError 
        ? error.message 
        : 'Failed to load customers'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  getCustomer: (id: string) => {
    const { customers } = get()
    return customers.find(customer => customer.id === id) || null
  },

  searchCustomers: (query: string) => {
    set({ searchQuery: query })
  },

  setSorting: (sortBy: 'name' | 'createdAt', sortOrder: 'asc' | 'desc') => {
    const { customers } = get()
    const sortedCustomers = sortCustomers(customers, sortBy, sortOrder)
    set({ sortBy, sortOrder, customers: sortedCustomers })
  },

  getFilteredCustomers: () => {
    const { customers, searchQuery, sortBy, sortOrder } = get()
    const filtered = filterCustomers(customers, searchQuery)
    return sortCustomers(filtered, sortBy, sortOrder)
  },

  clearError: () => {
    set({ error: null })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },
}))