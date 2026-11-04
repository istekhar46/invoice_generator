// Fictional quotation PDF verification through the real application export service.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const output = resolve(
  process.argv[2] || 'release-artifacts.local/quotations-20261105/pdf'
)
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
})
try {
  const { sampleQuote, longQuote } = await server.ssrLoadModule(
    '/src/test/fixtures/quotes.ts'
  )
  const { generateQuotePDF } = await server.ssrLoadModule(
    '/src/services/pdf/quotePDF.ts'
  )
  await mkdir(output, { recursive: true })
  const manifest = []
  for (const [name, quote] of [
    ['accepted', sampleQuote],
    ['cancelled-multipage', longQuote],
  ]) {
    const before = JSON.stringify(quote)
    const bytes = Buffer.from(
      await (await generateQuotePDF(quote)).arrayBuffer()
    )
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    assert.equal(JSON.stringify(quote), before)
    await writeFile(resolve(output, `${name}.pdf`), bytes)
    manifest.push({
      name,
      quoteNumber: quote.quoteNumber,
      status: quote.status === 'ACCEPTED' ? 'Accepted' : 'Cancelled',
      quoteDate: quote.quoteDate,
      validUntil: quote.validUntil,
      currency: quote.currency,
      subtotal: quote.subtotal,
      total: quote.total,
      tax: quote.taxAmount,
      rows: quote.lineItems.length,
    })
  }
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  console.log(
    JSON.stringify({
      output,
      fixtures: manifest.length,
      preservedSnapshots: true,
    })
  )
} finally {
  await server.close()
}
