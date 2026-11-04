// @vitest-environment node
import React from 'react'
import { Text } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { InvoicePDFTemplate } from './InvoicePDFTemplate'
import { PDFGeneratorServiceImpl } from './pdfGenerator.service'
import {
  invoicePdfFixtures,
  pdfCompany,
  pdfCustomer,
} from '../../test/fixtures/invoicePdfs'

// Inspect this pure template's Text nodes without substituting a DOM renderer.
function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (!React.isValidElement<{ children?: unknown }>(node)) return ''
  return textOf(node.props.children)
}
interface TextProps {
  children?: unknown
  fixed?: boolean
  render?: (props: { pageNumber: number; totalPages: number }) => string
}
function textNodes(node: unknown): TextProps[] {
  if (Array.isArray(node)) return node.flatMap(textNodes)
  if (!React.isValidElement<TextProps>(node)) return []
  return [
    ...(node.type === Text ? [node.props] : []),
    ...textNodes(node.props.children),
  ]
}
function content(index: number) {
  const invoice = invoicePdfFixtures[index].invoice
  const nodes = textNodes(
    InvoicePDFTemplate({ invoice, company: pdfCompany, customer: pdfCustomer })
  )
  return {
    invoice,
    nodes,
    text: nodes.map(node => textOf(node.children)).join('\n'),
  }
}

describe('Saved invoice PDF financial and cancellation contract', () => {
  it('shows partial payment, discount, tax and shipping without repricing saved rows', () => {
    const { text } = content(0)
    expect(text).toContain('1.25 m')
    expect(text).toContain('Subtotal\n250.00')
    expect(text).toContain('Discount\n-25.00')
    expect(text).toContain('Tax (18%)\n40.50')
    expect(text).toContain('Shipping\n12.50')
    expect(text).toContain('Total (INR)\n278.00')
    expect(text).toContain('Amount paid\n100.00')
    expect(text).toContain('Balance due (INR)\n178.00')
  })

  it('labels cancellation separately and repeats it with invoice identity on every page', () => {
    const { invoice, text, nodes } = content(5)
    expect(text).toContain('INVOICE\nVOIDED - No payment due')
    expect(text).toContain('Total (INR)\n647.20')
    expect(text).toContain('Balance due (INR)\n0.00')
    const footer = nodes.find(node => node.fixed && node.render)
    expect(footer?.render?.({ pageNumber: 3, totalPages: 8 })).toBe(
      `Invoice ${invoice.invoiceNumber} | VOIDED - No payment due | 3 / 8`
    )
  })

  it('preserves historical 0.335 row amounts and the saved 0.67 total for both Sent and Voided exports', () => {
    for (const index of [2, 3]) {
      const { text, invoice } = content(index)
      expect(text).toContain('Total (USD)\n0.67')
      expect(text).toContain(
        `Balance due (USD)\n${index === 3 ? '0.00' : '0.67'}`
      )
      expect(text).toContain('Saved Sender Snapshot')
      expect(text).toContain('Saved Customer Snapshot')
      expect(text).not.toContain('Fabric Studio')
      expect(invoice.lineItems.map(row => row.amount)).toEqual([0.335, 0.335])
    }
  })

  it('uses zero currency decimals for a fully paid JPY invoice', () => {
    const { text, nodes } = content(4)
    expect(text).toContain('Total (JPY)\n1,020')
    expect(text).toContain('Amount paid\n1,020')
    expect(text).toContain('Balance due (JPY)\n0')
    expect(text).not.toContain('VOIDED')
    expect(
      nodes
        .find(node => node.fixed && node.render)
        ?.render?.({ pageNumber: 1, totalPages: 1 })
    ).toBe('Invoice PAID-JPY-001 | 1 / 1')
  })

  it('exports actual account PDF bytes without mutating any saved invoice fields', async () => {
    const invoice = structuredClone(invoicePdfFixtures[1].invoice)
    const before = structuredClone(invoice)
    const blob = await new PDFGeneratorServiceImpl().generateInvoicePDF(
      invoice,
      pdfCompany,
      pdfCustomer
    )
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(1000)
    expect(invoice).toEqual(before)
  })
})
