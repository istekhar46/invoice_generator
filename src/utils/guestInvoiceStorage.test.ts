/**
 * Unit tests for guest invoice storage utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  hasStoredDraft,
  getStoredDraftSize,
  hasStorageSpace,
  GUEST_INVOICE_STORAGE_KEY,
} from './guestInvoiceStorage'
import { LocalStorageService } from '../services/localStorage.service'
import type { GuestInvoiceData } from '../types/guest'

// Mock LocalStorageService
vi.mock('../services/localStorage.service', () => ({
  LocalStorageService: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    exists: vi.fn(),
    getSize: vi.fn(),
  },
  LocalStorageError: class LocalStorageError extends Error {
    cause?: Error
    constructor(message: string, cause?: Error) {
      super(message)
      this.name = 'LocalStorageError'
      this.cause = cause
    }
  },
}))

describe('guestInvoiceStorage', () => {
  const mockGuestInvoiceData: GuestInvoiceData = {
    company: {
      businessName: 'Test Company',
      email: 'test@company.com',
    },
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    invoiceDetails: {
      serviceDate: new Date('2024-01-01'),
      dueDate: new Date('2024-01-31'),
      taxRate: 0.08,
    },
    lineItems: [
      {
        id: '1',
        type: 'material',
        description: 'Test service',
        unit: 'hrs',
        quantity: 1,
        rate: 100,
        amount: 100,
      },
    ],
    notes: 'Test notes',
    createdAt: new Date('2024-01-01'),
    lastModified: new Date('2024-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveToLocalStorage', () => {
    it('should save guest invoice data to localStorage', () => {
      saveToLocalStorage(mockGuestInvoiceData)

      expect(LocalStorageService.set).toHaveBeenCalledWith(
        GUEST_INVOICE_STORAGE_KEY,
        expect.objectContaining({
          company: mockGuestInvoiceData.company,
          customer: mockGuestInvoiceData.customer,
          invoiceDetails: mockGuestInvoiceData.invoiceDetails,
          lineItems: mockGuestInvoiceData.lineItems,
          notes: mockGuestInvoiceData.notes,
        })
      )
    })

    it('should update lastModified timestamp when saving', () => {
      const beforeSave = new Date()
      saveToLocalStorage(mockGuestInvoiceData)

      const savedData = (LocalStorageService.set as any).mock.calls[0][1]
      expect(savedData.lastModified).toBeInstanceOf(Date)
      expect(savedData.lastModified.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime())
    })

    it('should throw error if data exceeds maximum size', () => {
      const largeData: GuestInvoiceData = {
        ...mockGuestInvoiceData,
        notes: 'x'.repeat(2 * 1024 * 1024), // 2MB of data
      }

      expect(() => saveToLocalStorage(largeData)).toThrow()
    })

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(LocalStorageService.set).mockImplementation(() => {
        throw new Error('Storage full')
      })

      expect(() => saveToLocalStorage(mockGuestInvoiceData)).toThrow()
    })
  })

  describe('loadFromLocalStorage', () => {
    it('should load and return valid guest invoice data', () => {
      vi.mocked(LocalStorageService.get).mockReturnValue(mockGuestInvoiceData)

      const result = loadFromLocalStorage()

      expect(result).toEqual(mockGuestInvoiceData)
      expect(LocalStorageService.get).toHaveBeenCalledWith(GUEST_INVOICE_STORAGE_KEY)
    })

    it('should return null if no data exists', () => {
      vi.mocked(LocalStorageService.get).mockReturnValue(null)

      const result = loadFromLocalStorage()

      expect(result).toBeNull()
    })

    it('should return null and clear storage if data is invalid', () => {
      const invalidData = {
        ...mockGuestInvoiceData,
        customer: null, // Invalid: customer is required
      }
      vi.mocked(LocalStorageService.get).mockReturnValue(invalidData as any)

      const result = loadFromLocalStorage()

      expect(result).toBeNull()
      expect(LocalStorageService.remove).toHaveBeenCalledWith(GUEST_INVOICE_STORAGE_KEY)
    })

    it('should handle localStorage errors and return null', () => {
      vi.mocked(LocalStorageService.get).mockImplementation(() => {
        throw new Error('Storage error')
      })

      const result = loadFromLocalStorage()

      expect(result).toBeNull()
    })
  })

  describe('clearLocalStorage', () => {
    it('should remove guest invoice data from localStorage', () => {
      clearLocalStorage()

      expect(LocalStorageService.remove).toHaveBeenCalledWith(GUEST_INVOICE_STORAGE_KEY)
    })

    it('should throw error if removal fails', () => {
      vi.mocked(LocalStorageService.remove).mockImplementation(() => {
        throw new Error('Removal failed')
      })

      expect(() => clearLocalStorage()).toThrow()
    })
  })

  describe('hasStoredDraft', () => {
    it('should return true if draft exists', () => {
      vi.mocked(LocalStorageService.exists).mockReturnValue(true)

      const result = hasStoredDraft()

      expect(result).toBe(true)
      expect(LocalStorageService.exists).toHaveBeenCalledWith(GUEST_INVOICE_STORAGE_KEY)
    })

    it('should return false if draft does not exist', () => {
      vi.mocked(LocalStorageService.exists).mockReturnValue(false)

      const result = hasStoredDraft()

      expect(result).toBe(false)
    })

    it('should return false on error', () => {
      vi.mocked(LocalStorageService.exists).mockImplementation(() => {
        throw new Error('Check failed')
      })

      const result = hasStoredDraft()

      expect(result).toBe(false)
    })
  })

  describe('getStoredDraftSize', () => {
    it('should return size of stored draft in bytes', () => {
      vi.mocked(LocalStorageService.get).mockReturnValue(mockGuestInvoiceData)

      const result = getStoredDraftSize()

      expect(result).toBeGreaterThan(0)
      expect(typeof result).toBe('number')
    })

    it('should return 0 if no draft exists', () => {
      vi.mocked(LocalStorageService.get).mockReturnValue(null)

      const result = getStoredDraftSize()

      expect(result).toBe(0)
    })

    it('should return 0 on error', () => {
      vi.mocked(LocalStorageService.get).mockImplementation(() => {
        throw new Error('Size check failed')
      })

      const result = getStoredDraftSize()

      expect(result).toBe(0)
    })
  })

  describe('hasStorageSpace', () => {
    it('should return true if storage space is available', () => {
      vi.mocked(LocalStorageService.getSize).mockReturnValue(1024 * 1024) // 1MB used

      const result = hasStorageSpace()

      expect(result).toBe(true)
    })

    it('should return false if storage space is limited', () => {
      vi.mocked(LocalStorageService.getSize).mockReturnValue(4.5 * 1024 * 1024) // 4.5MB used

      const result = hasStorageSpace()

      expect(result).toBe(false)
    })

    it('should return false on error', () => {
      vi.mocked(LocalStorageService.getSize).mockImplementation(() => {
        throw new Error('Size check failed')
      })

      const result = hasStorageSpace()

      expect(result).toBe(false)
    })
  })
})
