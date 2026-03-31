/**
 * Guest Invoice PDF Template
 * React PDF component for rendering professional invoice PDFs for guest users
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { GuestInvoiceData } from '../../types/guest'
import { InvoiceCalculationService } from '../../services/invoiceCalculation.service'
import {
  formatDateForPDF,
  formatCurrencyForPDF,
  formatTaxRateForPDF,
  generateInvoiceNumber,
} from '../../utils/guestPDFGeneration'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
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

interface GuestInvoicePDFTemplateProps {
  data: GuestInvoiceData
  invoiceNumber?: string
}

export const GuestInvoicePDFTemplate: React.FC<GuestInvoicePDFTemplateProps> = ({
  data,
  invoiceNumber,
}) => {
  const invNumber = invoiceNumber || generateInvoiceNumber()
  const totals = InvoiceCalculationService.calculateInvoiceTotals(
    data.lineItems,
    data.invoiceDetails.taxRate
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {data.company?.businessName && (
              <>
                <Text style={styles.companyName}>{data.company.businessName}</Text>
                <Text style={styles.companyDetails}>
                  {data.company.address && `${data.company.address}\n`}
                  {data.company.city && data.company.state && data.company.zipCode && 
                    `${data.company.city}, ${data.company.state} ${data.company.zipCode}\n`}
                  {data.company.phone && `Phone: ${data.company.phone}\n`}
                  {data.company.email && `Email: ${data.company.email}\n`}
                  {data.company.taxNumber && `Tax ID: ${data.company.taxNumber}`}
                </Text>
              </>
            )}
          </View>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invNumber}</Text>
          </View>
        </View>

        {/* Customer and Invoice Details */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.customerInfo}>
              {data.customer.address && `${data.customer.address}\n`}
              {data.customer.city && data.customer.state && data.customer.zipCode && 
                `${data.customer.city}, ${data.customer.state} ${data.customer.zipCode}\n`}
              {data.customer.phone && `Phone: ${data.customer.phone}\n`}
              {data.customer.email && `Email: ${data.customer.email}`}
            </Text>
          </View>
          <View style={styles.columnLast}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <Text style={styles.invoiceDetails}>
              Service Date: {formatDateForPDF(data.invoiceDetails.serviceDate)}
              {'\n'}
              Due Date: {formatDateForPDF(data.invoiceDetails.dueDate)}
              {'\n'}
              Tax Rate: {formatTaxRateForPDF(data.invoiceDetails.taxRate)}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>
              Item Name
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>
              Rate
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>
              Qty
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
              Total Amount
            </Text>
          </View>

          {data.lineItems.map((item, index) => {
            return (
              <View key={item.id || `item-${index}`} style={styles.tableRow}>
                <View style={styles.colDescription}>
                  <Text style={styles.tableCellBold}>
                    {item.description}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatCurrencyForPDF(item.rate)}
                </Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {item.quantity} {item.unit || ''}
                </Text>
                <Text style={[styles.tableCellBold, styles.colAmount]}>
                  {formatCurrencyForPDF(item.amount)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyForPDF(totals.subtotal)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax ({formatTaxRateForPDF(data.invoiceDetails.taxRate)}):
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrencyForPDF(totals.taxAmount)}
              </Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total:</Text>
              <Text style={styles.totalValueFinal}>
                {formatCurrencyForPDF(totals.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! Generated on {formatDateForPDF(new Date())}
        </Text>
      </Page>
    </Document>
  )
}
