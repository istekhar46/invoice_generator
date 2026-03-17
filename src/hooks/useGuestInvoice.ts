/**
 * Custom hook for managing guest invoice state
 * Handles form data, auto-save, validation, and localStorage persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GuestInvoiceData, ValidationErrors } from '../types/guest'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../utils/guestInvoiceStorage'
import { validateInvoiceData, getValidationErrors } from '../utils/guestInvoiceValidation'

/**
 * Auto-save debounce delay in milliseconds
 */
const AUTO_SAVE_DELAY = 500

/**
 * Return type for useGuestInvoice hook
 */
export interface UseGuestInvoiceReturn {
  data: GuestInvoiceData | null
  updateData: (updates: Partial<GuestInvoiceData>) => void
  clearData: () => void
  isValid: boolean
  errors: ValidationErrors
  isLoading: boolean
  lastSaved: Date | null
}

/**
 * Custom hook for managing guest invoice state with auto-save
 * 
 * @returns Guest invoice state and methods
 */
export function useGuestInvoice(): UseGuestInvoiceReturn {
  const [data, setData] = useState<GuestInvoiceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const loadedData = loadFromLocalStorage()
      if (loadedData) {
        setData(loadedData)
        setLastSaved(loadedData.lastModified)
      }
    } catch (error) {
      console.error('Failed to load guest invoice data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced auto-save function
  const debouncedSave = useCallback((dataToSave: GuestInvoiceData) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      try {
        saveToLocalStorage(dataToSave)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to auto-save guest invoice:', error)
      }
    }, AUTO_SAVE_DELAY)
  }, [])

  // Update data with partial updates
  const updateData = useCallback((updates: Partial<GuestInvoiceData>) => {
    setData(prevData => {
      if (!prevData) {
        // Initialize new data if none exists
        const now = new Date()
        const newData: GuestInvoiceData = {
          company: null,
          customer: { name: '' },
          invoiceDetails: {
            serviceDate: new Date(),
            dueDate: new Date(),
            taxRate: 0.08,
          },
          lineItems: [],
          notes: '',
          createdAt: now,
          lastModified: now,
          ...updates,
        }
        debouncedSave(newData)
        return newData
      }

      // Merge updates with existing data
      const updatedData: GuestInvoiceData = {
        ...prevData,
        ...updates,
        lastModified: new Date(),
      }
      
      debouncedSave(updatedData)
      return updatedData
    })
  }, [debouncedSave])

  // Clear all data
  const clearData = useCallback(() => {
    try {
      clearLocalStorage()
      setData(null)
      setLastSaved(null)
      
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    } catch (error) {
      console.error('Failed to clear guest invoice data:', error)
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Validate current data
  const validation = data ? validateInvoiceData(data) : { isValid: false, errors: [] }
  const errors = data ? getValidationErrors(data) : {}

  return {
    data,
    updateData,
    clearData,
    isValid: validation.isValid,
    errors,
    isLoading,
    lastSaved,
  }
}
