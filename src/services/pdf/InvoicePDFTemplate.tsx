/**
 * Invoice PDF Template
 * React PDF component for rendering professional invoice PDFs
 * Uses built-in fonts to avoid browser compatibility issues
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { Invoice, CompanyProfile, Customer } from '../../types/entities'

// PDF Styles using built-in fonts
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', // Use built-in font instead of custom font
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 30,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  logo: {
    width: 80,
    height: 80,
    marginRight: 20,
    objectFit: 'contain',
  },
  companyInfo: {
    flex: 1,
  },
  invoiceHeader: {
    alignItems: 'flex-end',
    minWidth: 150,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1f2937',
    textAlign: 'right',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  column: {
    flex: 1,
    marginRight: 20,
  },
  columnLast: {
    flex: 1,
  },
  customerInfo: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 4,
  },
  invoiceDetails: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1f2937',
  },
  // Column widths for table
  colDescription: {
    flex: 3,
    marginRight: 10,
  },
  colQuantity: {
    flex: 1,
    marginRight: 10,
    textAlign: 'center',
  },
  colRate: {
    flex: 1,
    marginRight: 10,
    textAlign: 'right',
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsTable: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 600,
    color: '#1f2937',
  },
  totalLabelFinal: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  totalValueFinal: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
  },
  notesSection: {
    marginTop: 30,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
})

/**
 * Format date for display with error handling
 */
const formatDate = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  } catch (error) {
    console.warn('Error formatting date:', error)
    return 'Invalid Date'
  }
}

/**
 * Format tax rate as percentage with error handling
 */
const formatTaxRate = (rate: number): string => {
  try {
    const numRate = typeof rate === 'number' ? rate : parseFloat(rate as string)
    if (isNaN(numRate)) {
      return '0.0%'
    }
    return `${(numRate * 100).toFixed(1)}%`
  } catch (error) {
    console.warn('Error formatting tax rate:', error)
    return '0.0%'
  }
}

/**
 * Safe currency formatting with error handling
 */
const formatCurrency = (amount: number): string => {
  try {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount as string)
    if (isNaN(numAmount)) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount)
  } catch (error) {
    console.warn('Error formatting currency:', error)
    return '$0.00'
  }
}

/**
 * Props for the Invoice PDF Template
 */
interface InvoicePDFTemplateProps {
  invoice: Invoice
  company: CompanyProfile
  customer: Customer
}

/**
 * Invoice PDF Template Component
 */
export const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({
  invoice,
  company,
  customer,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          {company.logoUrl && (
            <View style={styles.logo}>
              <Image 
                src={company.logoUrl} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </View>
          )}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.businessName}</Text>
            <Text style={styles.companyDetails}>
              {company.address}
              {'\n'}
              {company.city}, {company.state} {company.zipCode}
              {'\n'}
              Phone: {company.phone}
              {'\n'}
              Email: {company.email}
              {'\n'}
              Tax ID: {company.taxNumber}
            </Text>
          </View>
        </View>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
        </View>
      </View>

      {/* Customer and Invoice Details */}
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerInfo}>
            {customer.address}
            {'\n'}
            {customer.city}, {customer.state} {customer.zipCode}
            {'\n'}
            Phone: {customer.phone}
            {'\n'}
            Email: {customer.email}
          </Text>
        </View>
        <View style={styles.columnLast}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <Text style={styles.invoiceDetails}>
            Service Date: {formatDate(invoice.serviceDate)}
            {'\n'}
            Due Date: {formatDate(invoice.dueDate)}
            {'\n'}
            Status: {(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1).toLowerCase()}
            {'\n'}
            Tax Rate: {formatTaxRate(invoice.taxRate)}
          </Text>
        </View>
      </View>

      {/* Line Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDescription]}>
            Description
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colQuantity]}>
            Qty
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colRate]}>
            Rate
          </Text>
          <Text style={[styles.tableHeaderCell, styles.colAmount]}>
            Amount
          </Text>
        </View>

        {/* Table Rows */}
        {invoice.lineItems && invoice.lineItems.length > 0 ? (
          invoice.lineItems.map((item, index) => {
            // Handle both uppercase (MATERIAL, LABOR) and lowercase (material, labor) type values
            const itemType = (item.type || '').toLowerCase()
            const isMaterial = itemType === 'material'
            
            return (
              <View key={item.id || `item-${index}`} style={styles.tableRow}>
                <View style={styles.colDescription}>
                  <Text style={styles.tableCellBold}>
                    {isMaterial ? '📦 ' : '🔧 '}
                    {item.description || 'No description'}
                  </Text>
                  <Text style={styles.tableCell}>
                    {isMaterial ? 'Material' : 'Labor'}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {item.quantity || 0}
                </Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatCurrency(item.rate || 0)}
                </Text>
                <Text style={[styles.tableCellBold, styles.colAmount]}>
                  {formatCurrency(item.amount || 0)}
                </Text>
              </View>
            )
          })
        ) : (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { textAlign: 'center', flex: 1, fontStyle: 'italic' }]}>
              No line items
            </Text>
          </View>
        )}
      </View>

      {/* Totals Section */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsTable}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Tax ({formatTaxRate(invoice.taxRate)}):
            </Text>
            <Text style={styles.totalValue}>
              {formatCurrency(invoice.taxAmount)}
            </Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total:</Text>
            <Text style={styles.totalValueFinal}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>
        </View>
      </View>

      {/* Notes Section */}
      {invoice.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{invoice.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business! • Generated on {formatDate(new Date())}
      </Text>
    </Page>
  </Document>
)