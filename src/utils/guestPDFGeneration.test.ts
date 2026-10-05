// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GuestInvoiceData } from '../types/guest'
import { generateInvoicePDF } from './guestPDFGeneration'

const draft: GuestInvoiceData = {
  draftId: 'pdf-check',
  company: { businessName: 'Example Company' },
  customer: { name: 'Example Customer' },
  invoiceDetails: {
    serviceDate: new Date('2026-10-01'),
    dueDate: new Date('2026-10-31'),
    taxRate: 0.1,
  },
  lineItems: [{ id: 'line-1', type: 'material', description: 'Cable', quantity: 2, rate: 10, amount: 20, unit: 'm' }],
  notes: '',
  createdAt: new Date('2026-10-01'),
  lastModified: new Date('2026-10-01'),
}

describe('On-demand PDF generation', () => {
  it('loads the renderer and produces an actual PDF document', async () => {
    const blob = await generateInvoicePDF(draft, 'INV-TEST')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const decoder = new TextDecoder()
    expect(decoder.decode(bytes.subarray(0, 5))).toBe('%PDF-')
    expect(decoder.decode(bytes.subarray(-30))).toContain('%%EOF')
    expect(bytes.length).toBeGreaterThan(1000)
  })
})
