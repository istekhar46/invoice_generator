/**
 * PDF Generation Hook
 * Custom hook for generating, downloading, and previewing invoice PDFs
 */

import { useState, useCallback } from 'react'
import { downloadInvoicePDF, previewInvoicePDF } from '../services/pdf'
import type { Invoice, Customer, CompanyProfile } from '../types/entities'

interface UsePDFGenerationReturn {
  isGenerating: boolean
  error: string | null
  downloadInvoicePDFDirect: (invoice: Invoice, customer: Customer, companyProfile: CompanyProfile) => Promise<void>
  previewInvoicePDFDirect: (invoice: Invoice, customer: Customer, companyProfile: CompanyProfile) => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for PDF generation functionality
 * Note: This hook now requires invoice, customer, and company data to be passed in
 * since we can't access the stores directly with TanStack Query
 */
export const usePDFGeneration = (): UsePDFGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Validate required data for PDF generation
   */
  const validatePDFData = useCallback((invoice: Invoice, customer: Customer, companyProfile: CompanyProfile) => {
    if (!companyProfile) {
      throw new Error('Company profile is required to generate PDF. Please set up your company profile in Settings first.')
    }

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
  }, [])

  /**
   * Download PDF for invoice object directly
   */
  const downloadInvoicePDFDirect = useCallback(async (invoice: Invoice, customer: Customer, companyProfile: CompanyProfile) => {
    setIsGenerating(true)
    setError(null)

    try {
      validatePDFData(invoice, customer, companyProfile)
      await downloadInvoicePDF(invoice, companyProfile, customer)
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
  const previewInvoicePDFDirect = useCallback(async (invoice: Invoice, customer: Customer, companyProfile: CompanyProfile) => {
    setIsGenerating(true)
    setError(null)

    try {
      validatePDFData(invoice, customer, companyProfile)
      await previewInvoicePDF(invoice, companyProfile, customer)
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
    downloadInvoicePDFDirect,
    previewInvoicePDFDirect,
    clearError,
  }
}