/**
 * Dashboard Statistics Service Tests
 * Tests for dashboard statistics calculations and data aggregation
 */

import { describe, it, expect } from 'vitest'
import { DashboardStatisticsService } from './dashboardStatistics.service'
import type { Invoice } from '../types/entities'

// Mock invoice data for testing
const createMockInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: `invoice_${Math.random()}`,
  userId: 'test_user',
  customerId: 'test_customer',
  invoiceNumber: 'INV-001',
  serviceDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  lineItems: [],
  subtotal: 100,
  taxRate: 0.08,
  taxAmount: 8,
  total: 108,
  status: 'draft',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
})

describe('DashboardStatisticsService', () => {
  describe('calculateStatistics', () => {
    it('should return zero statistics for empty invoice array', () => {
      const statistics = DashboardStatisticsService.calculateStatistics([])
      
      expect(statistics).toEqual({
        totalInvoices: 0,
        totalRevenue: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        draftInvoices: 0,
        averageInvoiceValue: 0,
      })
    })

    it('should calculate correct statistics for mixed invoice statuses', () => {
      const invoices = [
        createMockInvoice({ status: 'paid', total: 100 }),
        createMockInvoice({ status: 'paid', total: 200 }),
        createMockInvoice({ status: 'sent', total: 150 }),
        createMockInvoice({ status: 'draft', total: 75 }),
      ]

      const statistics = DashboardStatisticsService.calculateStatistics(invoices)
      
      expect(statistics.totalInvoices).toBe(4)
      expect(statistics.totalRevenue).toBe(300) // Only paid invoices
      expect(statistics.paidInvoices).toBe(2)
      expect(statistics.pendingInvoices).toBe(1) // sent status
      expect(statistics.draftInvoices).toBe(1)
      expect(statistics.averageInvoiceValue).toBe(131.25) // (100+200+150+75)/4
    })

    it('should round currency values to 2 decimal places', () => {
      const invoices = [
        createMockInvoice({ status: 'paid', total: 100.333 }),
        createMockInvoice({ status: 'paid', total: 200.666 }),
      ]

      const statistics = DashboardStatisticsService.calculateStatistics(invoices)
      
      expect(statistics.totalRevenue).toBe(300.33) // Rounded
      expect(statistics.averageInvoiceValue).toBe(150.5) // Rounded
    })
  })

  describe('getPendingInvoices', () => {
    it('should return only invoices with sent status', () => {
      const invoices = [
        createMockInvoice({ status: 'paid', invoiceNumber: 'INV-001' }),
        createMockInvoice({ status: 'sent', invoiceNumber: 'INV-002' }),
        createMockInvoice({ status: 'draft', invoiceNumber: 'INV-003' }),
        createMockInvoice({ status: 'sent', invoiceNumber: 'INV-004' }),
      ]

      const pending = DashboardStatisticsService.getPendingInvoices(invoices)
      
      expect(pending).toHaveLength(2)
      expect(pending.every(invoice => invoice.status === 'sent')).toBe(true)
    })

    it('should sort pending invoices by creation date descending', () => {
      const invoices = [
        createMockInvoice({ 
          status: 'sent', 
          invoiceNumber: 'INV-001',
          createdAt: new Date('2024-01-01')
        }),
        createMockInvoice({ 
          status: 'sent', 
          invoiceNumber: 'INV-002',
          createdAt: new Date('2024-01-03')
        }),
        createMockInvoice({ 
          status: 'sent', 
          invoiceNumber: 'INV-003',
          createdAt: new Date('2024-01-02')
        }),
      ]

      const pending = DashboardStatisticsService.getPendingInvoices(invoices)
      
      expect(pending[0].invoiceNumber).toBe('INV-002') // Most recent
      expect(pending[1].invoiceNumber).toBe('INV-003')
      expect(pending[2].invoiceNumber).toBe('INV-001') // Oldest
    })
  })

  describe('getRecentInvoices', () => {
    it('should return invoices sorted by creation date descending', () => {
      const invoices = [
        createMockInvoice({ 
          invoiceNumber: 'INV-001',
          createdAt: new Date('2024-01-01')
        }),
        createMockInvoice({ 
          invoiceNumber: 'INV-002',
          createdAt: new Date('2024-01-03')
        }),
        createMockInvoice({ 
          invoiceNumber: 'INV-003',
          createdAt: new Date('2024-01-02')
        }),
      ]

      const recent = DashboardStatisticsService.getRecentInvoices(invoices, 5)
      
      expect(recent[0].invoiceNumber).toBe('INV-002') // Most recent
      expect(recent[1].invoiceNumber).toBe('INV-003')
      expect(recent[2].invoiceNumber).toBe('INV-001') // Oldest
    })

    it('should limit results to specified count', () => {
      const invoices = Array.from({ length: 10 }, (_, i) => 
        createMockInvoice({ 
          invoiceNumber: `INV-${i.toString().padStart(3, '0')}`,
          createdAt: new Date(`2024-01-${(i + 1).toString().padStart(2, '0')}`)
        })
      )

      const recent = DashboardStatisticsService.getRecentInvoices(invoices, 3)
      
      expect(recent).toHaveLength(3)
      expect(recent[0].invoiceNumber).toBe('INV-009') // Most recent
    })
  })

  describe('getRecentInvoiceSummaries', () => {
    it('should include customer names from lookup function', () => {
      const invoices = [
        createMockInvoice({ 
          customerId: 'customer_1',
          invoiceNumber: 'INV-001'
        }),
        createMockInvoice({ 
          customerId: 'customer_2',
          invoiceNumber: 'INV-002'
        }),
      ]

      const customerLookup = (customerId: string) => {
        const customers: Record<string, string> = {
          'customer_1': 'John Doe',
          'customer_2': 'Jane Smith',
        }
        return customers[customerId]
      }

      const summaries = DashboardStatisticsService.getRecentInvoiceSummaries(
        invoices,
        customerLookup,
        5
      )
      
      expect(summaries).toHaveLength(2)
      expect(summaries[0].customerName).toBe('Jane Smith')
      expect(summaries[1].customerName).toBe('John Doe')
    })

    it('should handle missing customer names gracefully', () => {
      const invoices = [
        createMockInvoice({ 
          customerId: 'nonexistent_customer',
          invoiceNumber: 'INV-001'
        }),
      ]

      const customerLookup = (_customerId: string) => undefined

      const summaries = DashboardStatisticsService.getRecentInvoiceSummaries(
        invoices,
        customerLookup,
        5
      )
      
      expect(summaries).toHaveLength(1)
      expect(summaries[0].customerName).toBeUndefined()
    })
  })

  describe('filterByStatus', () => {
    it('should filter invoices by specified status', () => {
      const invoices = [
        createMockInvoice({ status: 'paid' }),
        createMockInvoice({ status: 'sent' }),
        createMockInvoice({ status: 'draft' }),
        createMockInvoice({ status: 'paid' }),
      ]

      const paidInvoices = DashboardStatisticsService.filterByStatus(invoices, 'paid')
      const sentInvoices = DashboardStatisticsService.filterByStatus(invoices, 'sent')
      const draftInvoices = DashboardStatisticsService.filterByStatus(invoices, 'draft')
      
      expect(paidInvoices).toHaveLength(2)
      expect(sentInvoices).toHaveLength(1)
      expect(draftInvoices).toHaveLength(1)
      
      expect(paidInvoices.every(invoice => invoice.status === 'paid')).toBe(true)
      expect(sentInvoices.every(invoice => invoice.status === 'sent')).toBe(true)
      expect(draftInvoices.every(invoice => invoice.status === 'draft')).toBe(true)
    })
  })
})