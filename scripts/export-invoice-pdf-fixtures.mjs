// Local QA: exports fictional fixtures through the real account and guest services.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const output = resolve(
  process.argv[2] || 'release-artifacts.local/invoice-pdf-20261103'
)
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
})
try {
  const { invoicePdfFixtures, pdfCompany, pdfCustomer, guestPdfFixture } =
    await server.ssrLoadModule('/src/test/fixtures/invoicePdfs.ts')
  const { PDFGeneratorServiceImpl } = await server.ssrLoadModule(
    '/src/services/pdf/pdfGenerator.service.ts'
  )
  const { generateInvoicePDF } = await server.ssrLoadModule(
    '/src/utils/guestPDFGeneration.ts'
  )
  const service = new PDFGeneratorServiceImpl()
  await mkdir(output, { recursive: true })
  const results = []
  for (const { name, invoice } of invoicePdfFixtures) {
    const before = JSON.stringify(invoice)
    const blob = await service.generateInvoicePDF(
      invoice,
      pdfCompany,
      pdfCustomer
    )
    const bytes = Buffer.from(await blob.arrayBuffer())
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    assert.equal(
      JSON.stringify(invoice),
      before,
      `${name}: export changed the saved invoice`
    )
    await writeFile(resolve(output, `${name}.pdf`), bytes)
    results.push({
      name,
      bytes: bytes.length,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency ?? 'USD',
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax: invoice.taxAmount,
      total: invoice.total,
      amountPaid: invoice.amountPaid ?? 0,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue ?? 0,
      shipping: invoice.shippingAmount ?? 0,
      taxRate: invoice.taxRate,
    })
  }
  const guestBefore = JSON.stringify(guestPdfFixture)
  const guest = Buffer.from(
    await (await generateInvoicePDF(guestPdfFixture)).arrayBuffer()
  )
  await writeFile(resolve(output, 'guest-inr.pdf'), guest)
  assert.equal(
    JSON.stringify(guestPdfFixture),
    guestBefore,
    'Export changed the guest draft'
  )
  // Independently hand-calculated expectations for the same guest fixture.
  results.push({
    name: 'guest-inr',
    bytes: guest.length,
    invoiceNumber: 'GUEST-001',
    currency: 'INR',
    status: 'draft',
    subtotal: 250,
    tax: 40.5,
    total: 278,
    amountPaid: 100,
    discountType: 'percentage',
    discountValue: 10,
    shipping: 12.5,
    taxRate: 0.18,
  })
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(results, null, 2) + '\n'
  )
  console.log(
    JSON.stringify({
      output,
      fixtures: results.length,
      preservedSnapshots: true,
    })
  )
} finally {
  await server.close()
}
