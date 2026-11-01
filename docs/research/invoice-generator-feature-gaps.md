# Invoice-Generator.com: top feature gaps for Invoiceo

Historical baseline: the gap descriptions record Invoiceo before this implementation. Currency selection, discounts/shipping/payment balances, and the full quick editor are now implemented; see [implementation and validation](../implementation/quick-invoice-editor.md). Templates, estimates, sending, and payments remain future proposals.

Reviewed: **1 November 2026**. Scope: competitor public editor and official pages, compared with this repository's frontend, API, and database schema at the start of the work.

**Priority:** currency selection and flexible invoice totals were selected for the approved editor release. Reusable templates are the next candidate; quotes and invoice delivery require more backend work. Priorities reflect product fit and implementation scope; customer demand and conversion impact have not been measured.

At baseline, Invoiceo already supported guest PDF downloads, automatic guest draft saving, authenticated invoice history, customer management, company profiles/logos, tax rates, and manual draft/sent/paid statuses. These were existing capabilities. See the [project overview](../../README.md), [guest storage](../../src/utils/guestInvoiceStorage.ts), and [invoice list](../../src/components/features/invoices/InvoiceList.tsx).

## Top five recommendations

| Rank | Missing capability                        | Expected value                                         | Relative effort                           |
| ---- | ----------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| 1    | Multi-currency invoices                   | Bill customers in their actual currency                | Medium                                    |
| 2    | Discounts, shipping, and deposit balances | Represent real charges and the amount still owed       | Medium–large                              |
| 3    | Reusable templates and editable labels    | Reduce repeated setup and improve document consistency | Medium                                    |
| 4    | Quotes and estimates                      | Support pricing before work begins                     | Large                                     |
| 5    | Invoice delivery and online payments      | Let customers receive and settle invoices online       | Large; payments add external dependencies |

Effort is a comparative engineering assessment, not a delivery estimate.

### 1. Multi-currency invoices

**Competitor:** the editor has a currency selector; switching to INR changed displayed amounts to rupees. [Source: invoice editor](https://invoice-generator.com/).

**Invoiceo gap:** invoices have no stored currency. The shared formatter accepts a currency argument, but both [authenticated PDF formatting](../../src/services/pdf/InvoicePDFTemplate.tsx) and [guest PDF formatting](../../src/utils/guestPDFGeneration.ts) explicitly use USD; dashboard amounts also assume dollars.

**Suggested first scope:** persist currency per invoice and guest draft; apply it consistently to editing, previews, and PDFs. Group dashboard totals by currency. Include currency-specific precision; exchange-rate conversion can be a separate decision.

### 2. Discounts, shipping, and deposit balances

**Competitor:** exposes discounts, shipping, amount paid, and balance due. Browser check: ₹1,000 subtotal − 10% discount + ₹20 shipping, with zero tax and ₹300 paid, produced ₹920 total and ₹620 due. Its [API documentation](https://invoice-generator.com/developers) also documents percentage and fixed adjustments.

**Invoiceo gap:** the [schema](../../backend/prisma/schema.prisma) stores subtotal, tax, and total, with no adjustment or payment amounts. The [backend calculation](../../backend/src/invoice/invoice.service.ts) and both invoice builders only add tax to subtotal. A paid status cannot represent a deposit.

**Suggested first scope:** percentage/fixed discount, fixed shipping, manually recorded amount paid, and calculated balance due across guest and saved invoices. Confirm discount/tax ordering, shipping tax treatment, rounding, and overpayment behavior before implementation. Payment processing belongs to recommendation 5.

### 3. Reusable templates and editable labels

**Competitor:** offers editable field titles, Classic/Slate themes, and a visible “Save Default” control. Its [help page](https://invoice-generator.com/help) documents remembered sender details, logo, currency, terms, notes, and labels.

**Invoiceo gap:** [company profiles](../../src/components/features/company/CompanyProfileForm.tsx) already retain branding and tax defaults, but there is no reusable document-template model or saved terms/labels/theme selection. Invoice and guest PDF layouts use fixed labels.

**Suggested first scope:** one saved default with notes, payment terms, currency, and editable labels, reusing company branding. Keep defaults separate from individual invoice content so changing a template does not rewrite saved invoices.

### 4. Quotes and estimates

**Competitor:** provides dedicated [quote](https://invoice-generator.com/quote-template) and [estimate](https://invoice-generator.com/estimate-generator) generators with PDF output.

**Invoiceo gap:** [routes](../../src/routes/index.tsx), API contracts, and the database support invoices only; there is no document type or estimate validity date.

**Suggested first scope:** an estimate with a valid-until date and PDF, reusing line items and calculations; then create a linked draft invoice from it. Conversion is our proposed workflow, not a verified competitor action. Confirm document numbering and lifecycle before implementation.

### 5. Invoice delivery and online payments

**Competitor:** exposes “Save & Send.” Its [help documentation](https://invoice-generator.com/help) describes account-based sending and bank/card payments.

**Invoiceo gap:** “Mark as Sent” only updates status. The [invoice controller](../../backend/src/invoice/invoice.controller.ts) exposes CRUD/status operations; [PDF actions](../../src/components/features/invoices/PDFActions.tsx) provide preview/download. No customer-facing invoice route or payment integration was found.

**Suggested sequence:** shareable invoice view and email delivery first; hosted payment checkout afterward. Select a provider based on supported business countries/currencies, and reconcile payment status using verified payment events.

## Other gaps and verification limits

Guest history with spreadsheet export is another useful candidate: the competitor [documents both](https://invoice-generator.com/help), while Invoiceo keeps one guest draft. Existing authenticated history means this is a guest-history/export gap, not a general history gap.

Verified competitor currency switching and adjustment calculations using Playwright; inspected template controls and official quote/estimate pages. Template persistence, authenticated sending, and payment completion were not exercised; those claims are documentation-backed. Initial Invoiceo findings came from source inspection; subsequent runtime verification is recorded in the implementation document. Future suggested scopes remain proposals.
