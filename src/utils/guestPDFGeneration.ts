/**
 * Guest invoice PDF generation utilities
 * Handles PDF generation for guest invoices without authentication
 */

import type { GuestInvoiceData } from '../types/guest'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { GuestInvoicePDFTemplate } from '../components/guest/GuestInvoicePDFTemplate'

/**
 * Generates a unique invoice number based on timestamp
 * Format: INV-{timestamp}
 * 
 * @returns Generated invoice number
 */
export function generateInvoiceNumber(): string {
  const timestamp = Date.now()
  return `INV-${timestamp}`
}

/**
 * Generates filename for guest invoice PDF
 * Format: invoice-{timestamp}.pdf
 * 
 * @param invoiceNumber - Optional invoice number to include in filename
 * @returns Generated filename
 */
export function generatePDFFilename(invoiceNumber?: string): string {
  if (invoiceNumber) {
    return `${invoiceNumber}.pdf`
  }
  const timestamp = Date.now()
  return `invoice-${timestamp}.pdf`
}

/**
 * Downloads a PDF blob to the user's device
 * 
 * @param blob - PDF blob to download
 * @param filename - Filename for the downloaded file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading PDF:', error)
    throw new Error('Failed to download PDF. Please try again.')
  }
}

/**
 * Opens a PDF blob in a new browser tab for preview
 * 
 * @param blob - PDF blob to preview
 */
export function previewPDF(blob: Blob): void {
  try {
    const url = URL.createObjectURL(blob)
    const newWindow = window.open(url, '_blank')
    
    if (!newWindow) {
      throw new Error('Failed to open preview window. Please check your popup blocker settings.')
    }
    
    // Note: URL will be cleaned up when the tab is closed
  } catch (error) {
    console.error('Error previewing PDF:', error)
    throw new Error('Failed to preview PDF. Please try again.')
  }
}

/**
 * Validates guest invoice data before PDF generation
 * 
 * @param data - Guest invoice data to validate
 * @throws Error if data is invalid
 */
export function validatePDFData(data: GuestInvoiceData): void {
  if (!data.customer || !data.customer.name) {
    throw new Error('Customer name is required to generate PDF.')
  }

  if (!data.invoiceDetails) {
    throw new Error('Invoice details are required to generate PDF.')
  }

  if (!data.invoiceDetails.serviceDate || !data.invoiceDetails.dueDate) {
    throw new Error('Service date and due date are required to generate PDF.')
  }

  if (!data.lineItems || data.lineItems.length === 0) {
    throw new Error('At least one line item is required to generate PDF.')
  }

  // Validate each line item
  for (const item of data.lineItems) {
    if (!item.description || item.description.trim() === '') {
      throw new Error('All line items must have a description.')
    }
    if (item.quantity <= 0) {
      throw new Error('All line items must have a quantity greater than 0.')
    }
    if (item.rate < 0) {
      throw new Error('All line items must have a non-negative rate.')
    }
  }
}

/**
 * Formats a date for display in PDF
 * 
 * @param date - Date to format
 * @returns Formatted date string (MM/DD/YYYY)
 */
export function formatDateForPDF(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

/**
 * Formats currency for display in PDF
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string ($X,XXX.XX)
 */
export function formatCurrencyForPDF(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Formats tax rate as percentage for display
 * 
 * @param taxRate - Tax rate as decimal (e.g., 0.08)
 * @returns Formatted percentage string (8%)
 */
export function formatTaxRateForPDF(taxRate: number): string {
  return `${(taxRate * 100).toFixed(2)}%`
}

/**
 * Generates a PDF blob for a guest invoice
 * 
 * @param data - Guest invoice data
 * @param invoiceNumber - Optional invoice number (generated if not provided)
 * @returns Promise resolving to PDF blob
 */
export async function generateInvoicePDF(
  data: GuestInvoiceData,
  invoiceNumber?: string
): Promise<Blob> {
  try {
    // Validate data before generation
    validatePDFData(data)

    // Generate invoice number if not provided
    const invNumber = invoiceNumber || generateInvoiceNumber()

    // Create the PDF document element
    const element = React.createElement(GuestInvoicePDFTemplate, {
      data,
      invoiceNumber: invNumber,
    })

    // Generate PDF blob
    const pdfBlob = await pdf(element as any).toBlob()

    return pdfBlob
  } catch (error) {
    console.error('Error generating guest invoice PDF:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

/**
 * Generates and downloads a guest invoice PDF
 * 
 * @param data - Guest invoice data
 * @param invoiceNumber - Optional invoice number
 */
export async function generateAndDownloadPDF(
  data: GuestInvoiceData,
  invoiceNumber?: string
): Promise<void> {
  const invNumber = invoiceNumber || generateInvoiceNumber()
  const pdfBlob = await generateInvoicePDF(data, invNumber)
  const filename = generatePDFFilename(invNumber)
  downloadPDF(pdfBlob, filename)
}

/**
 * Generates and previews a guest invoice PDF
 * 
 * @param data - Guest invoice data
 * @param invoiceNumber - Optional invoice number
 */
export async function generateAndPreviewPDF(
  data: GuestInvoiceData,
  invoiceNumber?: string
): Promise<void> {
  const invNumber = invoiceNumber || generateInvoiceNumber()
  const pdfBlob = await generateInvoicePDF(data, invNumber)
  previewPDF(pdfBlob)
}
