import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Link,
} from '@react-pdf/renderer'
import type { Invoice } from '../../types/entities'
import { invoiceParties } from '../../utils/invoiceDocument'
import type {
  InvoiceCompany,
  InvoiceCustomer,
} from '../../utils/invoiceDocument'
import {
  documentTotals,
  documentPaymentUrl,
  documentDirectUpi,
} from '../../utils/invoiceDocument'
import { currencyDigits } from '../invoiceCalculation.service'
import { formatDate } from '../../utils/formatters'

const styles = StyleSheet.create({
  page: {
    padding: 42,
    paddingBottom: 65,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 1,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  muted: { color: '#64748b', fontSize: 8 },
  voided: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#b91c1c',
    marginBottom: 8,
  },
  company: { width: '52%' },
  logo: {
    width: 120,
    height: 55,
    objectFit: 'contain',
    objectPosition: 'left',
    marginBottom: 12,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  meta: { width: '43%', textAlign: 'right' },
  block: { marginBottom: 20 },
  label: {
    color: '#64748b',
    fontSize: 8,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  columns: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  half: { width: '48%' },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 10,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  row: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    fontSize: 9,
  },
  item: { width: '47%', paddingRight: 10 },
  qty: { width: '17%', textAlign: 'right', paddingRight: 10 },
  rate: { width: '18%', textAlign: 'right', paddingRight: 10 },
  amount: { width: '18%', textAlign: 'right' },
  bottom: { flexDirection: 'row', gap: 28, marginTop: 24 },
  notes: { width: '51%' },
  totals: { width: '43%' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  total: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  balance: {
    backgroundColor: '#eff6ff',
    padding: 10,
    marginTop: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 42,
    right: 42,
    textAlign: 'center',
    height: 24,
    fontSize: 8,
    color: '#64748b',
  },
})

export interface InvoicePDFTemplateProps {
  invoice: Invoice
  company?: InvoiceCompany | null
  customer?: InvoiceCustomer | null
  quotation?: { status: string }
  paymentQr?: { url: string; dataUrl: string }
}

export const InvoicePDFTemplate: React.FC<InvoicePDFTemplateProps> = ({
  invoice,
  company,
  customer,
  quotation,
  paymentQr,
}) => {
  const parties = invoiceParties(invoice, company, customer)
  const currency = invoice.currency || 'USD'
  const dateLabel = (date: Date) =>
    quotation ? date.toISOString().slice(0, 10) : formatDate(date)
  // Codes are unambiguous and render with the built-in PDF fonts for every currency.
  const number = (value: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currencyDigits(currency),
      maximumFractionDigits: currencyDigits(currency),
    }).format(value)
  const totals = documentTotals(invoice)
  const paymentUrl = quotation ? null : documentPaymentUrl(invoice)
  const directUpi = quotation ? null : documentDirectUpi(invoice)
  const isVoided = !quotation && invoice.status === 'voided'
  const documentLabel = quotation ? 'Quotation' : 'Invoice'
  const partyLines = (party?: InvoiceCompany | InvoiceCustomer | null) =>
    party && (
      <>
        <Text>{party.address}</Text>
        <Text>
          {[party.city, party.state, party.zipCode].filter(Boolean).join(', ')}
        </Text>
        <Text>{party.email}</Text>
        <Text>{party.phone}</Text>
      </>
    )
  const totalRow = (label: string, value: number) => (
    <View style={styles.totalRow}>
      <Text>{label}</Text>
      <Text>{number(value)}</Text>
    </View>
  )
  return (
    <Document
      title={`${quotation ? 'Quotation' : isVoided ? 'Voided invoice' : 'Invoice'} ${invoice.invoiceNumber}`}
      author={parties.company?.businessName || 'Invoiceo'}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.company}>
            {parties.company?.logoUrl && (
              <Image src={parties.company.logoUrl} style={styles.logo} />
            )}
            <Text style={styles.name}>{parties.company?.businessName}</Text>
            {partyLines(parties.company)}
            {parties.company?.taxNumber && (
              <Text>Tax / VAT / GST ID: {parties.company.taxNumber}</Text>
            )}
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>
              {quotation ? 'QUOTATION' : 'INVOICE'}
            </Text>
            {quotation && (
              <Text style={{ marginBottom: 8 }}>{quotation.status}</Text>
            )}
            {isVoided && (
              <Text style={styles.voided}>VOIDED - No payment due</Text>
            )}
            <Text style={{ marginBottom: 12 }}>{invoice.invoiceNumber}</Text>
            <Text>
              {quotation ? 'Quotation date' : 'Invoice date'}:{' '}
              {dateLabel(invoice.serviceDate)}
            </Text>
            <Text>
              {quotation ? 'Valid until (UTC)' : 'Due date'}:{' '}
              {dateLabel(invoice.dueDate)}
            </Text>
            {invoice.paymentTerms && (
              <Text>Payment terms: {invoice.paymentTerms}</Text>
            )}
            {invoice.purchaseOrderNumber && (
              <Text>PO number: {invoice.purchaseOrderNumber}</Text>
            )}
            <Text style={styles.muted}>Currency: {currency}</Text>
          </View>
        </View>
        <View style={styles.columns}>
          <View style={styles.half}>
            <Text style={styles.label}>
              {quotation ? 'QUOTE FOR' : 'BILL TO'}
            </Text>
            <Text style={styles.name}>{parties.customer?.name}</Text>
            {partyLines(parties.customer)}
          </View>
          {invoice.shippingAddress && (
            <View style={styles.half}>
              <Text style={styles.label}>SHIP TO</Text>
              <Text>{invoice.shippingAddress}</Text>
            </View>
          )}
        </View>
        <View>
          <View style={styles.tableHead} fixed>
            <Text style={styles.item}>ITEM / SERVICE</Text>
            <Text style={styles.qty}>QUANTITY</Text>
            <Text style={styles.rate}>RATE ({currency})</Text>
            <Text style={styles.amount}>AMOUNT</Text>
          </View>
          {invoice.lineItems.map(item => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.item}>{item.description}</Text>
              <Text style={styles.qty}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={styles.rate}>
                {quotation ? String(item.rate) : number(item.rate)}
              </Text>
              <Text style={styles.amount}>{number(item.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.bottom}>
          <View style={styles.notes}>
            {invoice.notes && (
              <View style={styles.block}>
                <Text style={styles.label}>NOTES</Text>
                <Text>{invoice.notes}</Text>
              </View>
            )}
            {invoice.terms && (
              <View style={styles.block}>
                <Text style={styles.label}>TERMS & PAYMENT INSTRUCTIONS</Text>
                <Text>{invoice.terms}</Text>
              </View>
            )}
            {paymentUrl && (
              <View style={styles.block} wrap={false}>
                <Text style={styles.label}>PAY BY UPI</Text>
                {paymentQr?.url === paymentUrl && (
                  <View style={{ marginBottom: 6 }}>
                    <Image
                      src={paymentQr.dataUrl}
                      style={{ width: 96, height: 96 }}
                    />
                    <Text style={{ fontSize: 8, marginTop: 4 }}>
                      Scan to open secure payment page
                    </Text>
                  </View>
                )}
                <Link
                  src={paymentUrl}
                  style={{ color: '#2563eb', fontSize: 9 }}
                >
                  {paymentUrl}
                </Link>
              </View>
            )}
            {directUpi && (
              <View wrap={false} style={{ marginTop: 12 }}>
                <Text style={styles.label}>Pay directly by UPI</Text>
                {paymentQr?.url === directUpi.uri && (
                  <Image
                    src={paymentQr.dataUrl}
                    style={{ width: 112, height: 112, marginBottom: 4 }}
                  />
                )}
                {/* Bound unbroken receiving details without inserting hyphens into a UPI ID. */}
                <Text style={{ fontFamily: 'Courier', fontSize: 9 }}>
                  {directUpi.payeeName.match(/.{1,40}/g)?.join('\n')}
                </Text>
                <Text>UPI ID:</Text>
                <Text style={{ fontFamily: 'Courier', fontSize: 9 }}>
                  {directUpi.upiId.match(/.{1,40}/g)?.join('\n')}
                </Text>
                <Text>Amount: INR {number(directUpi.amount)}</Text>
                <Text>Reference: {directUpi.reference}</Text>
                <Text style={{ marginTop: 4 }}>
                  Scan with your UPI app. Check the recipient and amount before
                  paying. The sender confirms and records payment manually.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.totals} wrap={false}>
            {totalRow('Subtotal', invoice.subtotal)}
            {totals.discountAmount > 0 &&
              totalRow('Discount', -totals.discountAmount)}
            {totalRow(
              `Tax (${Number((invoice.taxRate * 100).toFixed(4))}%)`,
              invoice.taxAmount
            )}
            {(invoice.shippingAmount || 0) > 0 &&
              totalRow('Shipping', invoice.shippingAmount || 0)}
            <View style={styles.total}>
              {totalRow(`Total (${currency})`, invoice.total)}
            </View>
            {!quotation && totalRow('Amount paid', invoice.amountPaid || 0)}
            {!quotation && (
              <View style={styles.balance}>
                {totalRow(`Balance due (${currency})`, totals.balanceDue)}
              </View>
            )}
          </View>
        </View>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${documentLabel} ${invoice.invoiceNumber}${quotation ? ` | ${quotation.status}` : ''}${isVoided ? ' | VOIDED - No payment due' : ''} | ${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
