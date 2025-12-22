/**
 * PDF Generation Hook
 * Custom hook for generating, downloading, and previewing invoice PDFs
 */

import { useState, useCallback } from 'react'
import { useInvoiceStore } from '../store/invoiceStore'
import { useCompanyStore } from '../store/companyStore'
import { useCustomerStore } from '../store/customerStore'
import { downloadInvoicePDF, previewInvoicePDF } from '../services/pdf'
import type { Invoice } from '../types/entities'

interface UsePDFGenerationReturn {
  isGenerating: boolean
  error: string | null
  downloadPDF: (invoiceId: string) => Promise<void>
  previewPDF: (invoiceId: string) => Promise<void>
  downloadInvoicePDFDirect: (invoice: Invoice) => Promise<void>
  previewInvoicePDFDirect: (invoice: Invoice) => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for PDF generation functionality
 */
export const usePDFGeneration = (): UsePDFGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store hooks
  const { getInvoice } = useInvoiceStore()
  const { profile: companyProfile } = useCompanyStore()
  const { getCustomer } = useCustomerStore()

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Validate required data for PDF generation
   */
  const validatePDFData = useCallback((invoice: Invoice) => {
    if (!companyProfile) {
      throw new Error('Company profile is required to generate PDF. Please set up your company profile in Settings first.')
    }

    const customer = getCustomer(invoice.customerId)
    if (!customer) {
      throw new Error('Customer information not found. Please ensure the customer exists.')
    }

    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item to generate PDF.')
    }

    // Validate invoice data completeness
    if (!invoice.invoiceNumber) {
      throw new Error('Invoice number is required for PDF generation.')
    }

    if (!invoice.serviceDate || !invoice.dueDate) {
      throw new Error('Service date and due date are required for PDF generation.')
    }

    return { customer, company: companyProfile }
  }, [companyProfile, getCustomer])

  /**
   * Download PDF for invoice by ID
   */
  const downloadPDF = useCallback(async (invoiceId: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const invoice = getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const { customer, company } = validatePDFData(invoice)
      await downloadInvoicePDF(invoice, company, customer)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF'
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [getInvoice, validatePDFData])

  /**
   * Preview PDF for invoice by ID
   */
  const previewPDF = useCallback(async (invoiceId: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const invoice = getInvoice(invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const { customer, company } = validatePDFData(invoice)
      await previewInvoicePDF(invoice, company, customer)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview PDF'
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [getInvoice, validatePDFData])

  /**
   * Download PDF for invoice object directly
   */
  const downloadInvoicePDFDirect = useCallback(async (invoice: Invoice) => {
    setIsGenerating(true)
    setError(null)

    try {
      const { customer, company } = validatePDFData(invoice)
      await downloadInvoicePDF(invoice, company, customer)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF'
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [validatePDFData])

  /**
   * Preview PDF for invoice object directly
   */
  const previewInvoicePDFDirect = useCallback(async (invoice: Invoice) => {
    setIsGenerating(true)
    setError(null)

    try {
      const { customer, company } = validatePDFData(invoice)
      await previewInvoicePDF(invoice, company, customer)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview PDF'
      setError(errorMessage)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [validatePDFData])

  return {
    isGenerating,
    error,
    downloadPDF,
    previewPDF,
    downloadInvoicePDFDirect,
    previewInvoicePDFDirect,
    clearError,
  }
}