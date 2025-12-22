/**
 * PDF Generation Service
 * Service for generating professional invoice PDFs using @react-pdf/renderer
 */

import React from 'react'
import { pdf } from '@react-pdf/renderer'
import type { Invoice, CompanyProfile, Customer } from '../../types/entities'

/**
 * PDF Generator Service interface
 */
export interface PDFGeneratorService {
  generateInvoicePDF(invoice: Invoice, company: CompanyProfile, customer: Customer): Promise<Blob>
  downloadPDF(blob: Blob, filename: string): void
  previewPDF(blob: Blob): void
}

/**
 * Generate filename for invoice PDF
 */
const generatePDFFilename = (invoiceNumber: string): string => {
  return `Invoice_${invoiceNumber}.pdf`
}

/**
 * PDF Generator Service implementation
 */
export class PDFGeneratorServiceImpl implements PDFGeneratorService {
  /**
   * Generate PDF blob for an invoice
   */
  async generateInvoicePDF(invoice: Invoice, company: CompanyProfile, customer: Customer): Promise<Blob> {
    try {
      // Import the PDF template component dynamically to avoid SSR issues
      const { InvoicePDFTemplate } = await import('./InvoicePDFTemplate')
      
      // Generate PDF using @react-pdf/renderer
      const pdfBlob = await pdf(
        React.createElement(InvoicePDFTemplate, { invoice, company, customer }) as any
      ).toBlob()
      
      return pdfBlob
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate PDF. Please try again.')
    }
  }

  /**
   * Download PDF file to user's device
   */
  downloadPDF(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      throw new Error('Failed to download PDF. Please try again.')
    }
  }

  /**
   * Open PDF in new tab for preview
   */
  previewPDF(blob: Blob): void {
    try {
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Note: URL will be cleaned up when the tab is closed
    } catch (error) {
      console.error('Error previewing PDF:', error)
      throw new Error('Failed to preview PDF. Please try again.')
    }
  }
}

/**
 * Singleton instance of PDF Generator Service
 */
export const pdfGeneratorService = new PDFGeneratorServiceImpl()

/**
 * Utility function to generate and download invoice PDF
 */
export const downloadInvoicePDF = async (
  invoice: Invoice, 
  company: CompanyProfile, 
  customer: Customer
): Promise<void> => {
  const pdfBlob = await pdfGeneratorService.generateInvoicePDF(invoice, company, customer)
  const filename = generatePDFFilename(invoice.invoiceNumber)
  pdfGeneratorService.downloadPDF(pdfBlob, filename)
}

/**
 * Utility function to generate and preview invoice PDF
 */
export const previewInvoicePDF = async (
  invoice: Invoice, 
  company: CompanyProfile, 
  customer: Customer
): Promise<void> => {
  const pdfBlob = await pdfGeneratorService.generateInvoicePDF(invoice, company, customer)
  pdfGeneratorService.previewPDF(pdfBlob)
}