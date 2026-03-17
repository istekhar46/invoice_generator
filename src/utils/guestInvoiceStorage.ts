/**
 * Guest invoice storage utilities
 * Handles localStorage operations for guest invoice drafts
 */

import { LocalStorageService, LocalStorageError } from '../services/localStorage.service'
import type { GuestInvoiceData } from '../types/guest'
import { guestInvoiceDataSchema } from '../types/guestSchemas'

/**
 * Storage key for guest invoice drafts
 */
export const GUEST_INVOICE_STORAGE_KEY = 'guest_invoice_draft'

/**
 * Maximum storage size for guest invoice data (1MB)
 */
const MAX_STORAGE_SIZE = 1024 * 1024 // 1MB in bytes

/**
 * Saves guest invoice data to localStorage
 * Updates lastModified timestamp automatically
 * 
 * @param data - Guest invoice data to save
 * @throws LocalStorageError if storage fails or quota exceeded
 */
export function saveToLocalStorage(data: GuestInvoiceData): void {
  try {
    // Update lastModified timestamp
    const dataToSave: GuestInvoiceData = {
      ...data,
      lastModified: new Date(),
    }

    // Check storage size before saving
    const serialized = JSON.stringify(dataToSave)
    if (serialized.length > MAX_STORAGE_SIZE) {
      throw new LocalStorageError(
        `Guest invoice data exceeds maximum size of ${MAX_STORAGE_SIZE / 1024}KB`
      )
    }

    LocalStorageService.set(GUEST_INVOICE_STORAGE_KEY, dataToSave)
  } catch (error) {
    if (error instanceof LocalStorageError) {
      // Log error but don't throw - allow app to continue without auto-save
      console.error('Failed to save guest invoice draft:', error.message)
      throw error
    }
    throw new LocalStorageError(
      'Failed to save guest invoice draft',
      error as Error
    )
  }
}

/**
 * Loads guest invoice data from localStorage
 * Validates data structure and returns null if invalid
 * 
 * @returns Guest invoice data or null if not found/invalid
 */
export function loadFromLocalStorage(): GuestInvoiceData | null {
  try {
    const data = LocalStorageService.get<GuestInvoiceData>(GUEST_INVOICE_STORAGE_KEY)
    
    if (!data) {
      return null
    }

    // Validate data structure using Zod schema
    const validationResult = guestInvoiceDataSchema.safeParse(data)
    
    if (!validationResult.success) {
      console.warn('Invalid guest invoice data in localStorage, clearing:', validationResult.error)
      clearLocalStorage()
      return null
    }

    return validationResult.data
  } catch (error) {
    console.error('Failed to load guest invoice draft:', error)
    // Clear corrupted data
    try {
      clearLocalStorage()
    } catch {
      // Ignore errors when clearing
    }
    return null
  }
}

/**
 * Clears guest invoice data from localStorage
 */
export function clearLocalStorage(): void {
  try {
    LocalStorageService.remove(GUEST_INVOICE_STORAGE_KEY)
  } catch (error) {
    throw new LocalStorageError(
      'Failed to clear guest invoice draft',
      error as Error
    )
  }
}

/**
 * Checks if a guest invoice draft exists in localStorage
 * 
 * @returns true if draft exists, false otherwise
 */
export function hasStoredDraft(): boolean {
  try {
    return LocalStorageService.exists(GUEST_INVOICE_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to check for stored draft:', error)
    return false
  }
}

/**
 * Gets the size of the stored guest invoice data in bytes
 * 
 * @returns Size in bytes, or 0 if no data exists
 */
export function getStoredDraftSize(): number {
  try {
    const data = LocalStorageService.get<GuestInvoiceData>(GUEST_INVOICE_STORAGE_KEY)
    if (!data) {
      return 0
    }
    return JSON.stringify(data).length
  } catch (error) {
    console.error('Failed to get stored draft size:', error)
    return 0
  }
}

/**
 * Checks if localStorage has enough space for guest invoice data
 * 
 * @returns true if space is available, false otherwise
 */
export function hasStorageSpace(): boolean {
  try {
    const currentSize = LocalStorageService.getSize()
    const availableSpace = 5 * 1024 * 1024 - currentSize // Assume 5MB total quota
    return availableSpace > MAX_STORAGE_SIZE
  } catch (error) {
    console.error('Failed to check storage space:', error)
    return false
  }
}
