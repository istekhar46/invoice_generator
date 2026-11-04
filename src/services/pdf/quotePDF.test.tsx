// @vitest-environment node
import React from 'react'
import { describe, expect, it } from 'vitest'
import { InvoicePDFTemplate } from './InvoicePDFTemplate'
import { sampleQuote } from '../../test/fixtures/quotes'
import {
  quoteDocument,
  quoteParties,
  quoteStatusLabel,
} from '../../types/quotes'
import { generateQuotePDF } from './quotePDF'
function text(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  if (!React.isValidElement<{ children?: unknown }>(node)) return ''
  return text(node.props.children)
}
describe('Quotation export contract', () => {
  it('uses quotation/UTC labels and exact saved rates/amounts without payable invoice controls', () => {
    const value = text(
      InvoicePDFTemplate({
        invoice: quoteDocument(sampleQuote),
        ...quoteParties(sampleQuote),
        quotation: { status: quoteStatusLabel(sampleQuote) },
      })
    )
    expect(value).toContain('QUOTATION')
    expect(value).toContain('Valid until (UTC): 2026-12-05')
    expect(value).toContain('0.335')
    expect(value).toContain('76.16')
    expect(value).not.toContain('Amount paid')
    expect(value).not.toContain('Balance due')
    expect(value).not.toContain('PAY BY UPI')
  })
  it('generates an actual PDF without changing the saved quotation', async () => {
    const before = JSON.stringify(sampleQuote)
    const blob = await generateQuotePDF(sampleQuote)
    expect(
      new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5))
    ).toBe('%PDF-')
    expect(JSON.stringify(sampleQuote)).toBe(before)
  })
})
