# Invoice PDF export

Standard, account quick and guest invoices share `InvoicePDFTemplate.tsx` through `@react-pdf/renderer`. The renderer/template are loaded on demand. No server or database is needed to render an export from an invoice object.

## Contracts

- Print saved line amounts, subtotal, tax and total; do not reprice a saved invoice. This preserves historical rounding snapshots until an actual pricing edit.
- Show discount, shipping, amount paid and remaining balance using the invoice currency's precision. Currency codes avoid unsupported currency-symbol glyphs in the built-in Helvetica font.
- Only a saved payable INR invoice with a server-selected active Live URL includes a clickable Pay by UPI link. Test links never enter the invoice contract. Saved list/preview PDF actions fetch current charges, paid balance and URL before export; unsaved editor/guest exports have no gateway URL.
- Voided invoices retain saved charges/terms but display `VOIDED - No payment due` and zero balance. Metadata and every page identify the invoice and its cancellation state.
- Quick invoices use saved sender/customer snapshots. Standard invoices use the provided company/customer. Guest drafts use `guestDocument` and the same template.
- Rows stay together across page breaks, table headings repeat while the table continues, and fixed footers contain invoice identity and page numbers.

## Application usage

`pdfGenerator.service.ts` generates a Blob and supplies download/preview helpers:

```ts
import { downloadInvoicePDF, previewInvoicePDF } from '@/services/pdf'

await downloadInvoicePDF(invoice, company, customer)
await previewInvoicePDF(invoice, company, customer)
```

The hook validates supplied data and exposes loading/error state; callers provide the current invoice and related parties:

```ts
const { downloadInvoicePDFDirect, isGenerating, error } = usePDFGeneration()
await downloadInvoicePDFDirect(invoice, customer, company)
```

`PDFActions.tsx` connects these actions to invoice lists/previews. Quick-invoice sender data can come from the invoice snapshot without a saved company profile.

## Verification

Run focused tests, including actual account and guest PDF generation:

```sh
npm test -- src/services/pdf/InvoicePDFTemplate.test.tsx src/utils/guestPDFGeneration.test.ts
```

Export eight deterministic fictional fixtures using the real services. Exporting must not mutate account invoices or the guest draft:

```sh
node scripts/export-invoice-pdf-fixtures.mjs release-artifacts.local/pdf-check
```

For independent PDF content/geometry checks and page PNGs, install inspection tools in an isolated environment, outside application dependencies:

```sh
python3 -m venv /tmp/invoice-pdf-verification-venv
/tmp/invoice-pdf-verification-venv/bin/python -m pip install pdfplumber pypdf
/tmp/invoice-pdf-verification-venv/bin/python scripts/verify-invoice-pdf-fixtures.py release-artifacts.local/pdf-check
```

The inspector checks actual saved totals/rows, discount/tax/shipping, partial/full/voided balances, INR/USD/JPY precision, metadata, invoice/cancellation context on every page, page numbering, text bounds and multi-page row preservation. It writes `verification.json` and renders all pages through PDFium for **manual visual review**. Passing content checks alone does not establish correct layout.

Fixtures cover partial-payment Sent, unpaid Voided, historical 0.335-row/0.67-total Sent/Voided, fully paid JPY, a long multi-page voided invoice a guest draft and a payable invoice with a fictional Live UPI URL. Generated artifacts are private/gitignored under `release-artifacts.local/`.

## Quotation exports

Quotations reuse this layout through `quotePDF.ts` and a presentation-only adapter. They show QUOTATION, owner-recorded status, quote date/valid-until in UTC, saved parties, exact unit rates and financial snapshots. They exclude invoice payment links, amount paid and balance due. Invoice/guest rendering is unchanged.

```sh
node scripts/export-quote-pdf-fixtures.mjs release-artifacts.local/quote-pdf-check
/tmp/invoice-pdf-verification-venv/bin/python scripts/verify-quote-pdf-fixtures.py release-artifacts.local/quote-pdf-check
```

Inspect the generated page PNGs as well as the text/geometry report. Fictional fixtures cover an accepted quote and a long cancelled quote; export must not mutate them.
