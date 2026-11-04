import type { Quote } from '../../types/quotes'
import {
  quoteDocument,
  quoteParties,
  quoteStatusLabel,
} from '../../types/quotes'
import { pdfGeneratorService } from './pdfGenerator.service'

export async function generateQuotePDF(quote: Quote) {
  const parties = quoteParties(quote)
  return pdfGeneratorService.generateInvoicePDF(
    quoteDocument(quote),
    parties.company,
    parties.customer,
    { status: quoteStatusLabel(quote) }
  )
}
export async function downloadQuotePDF(quote: Quote) {
  pdfGeneratorService.downloadPDF(
    await generateQuotePDF(quote),
    `Quotation_${quote.quoteNumber}.pdf`
  )
}
