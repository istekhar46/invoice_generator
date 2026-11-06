# Quick invoice editor implementation

Updated: 7 November 2026. The item-entry follow-up below is implemented/verified on `fix/quick-invoice-item-flow`: quick invoices reuse the standard Add Item confirmation flow. Published in [PR #27](https://github.com/istekhar46/invoice_generator/pull/27) into `dev`; GitGuardian passed and the PR is open/non-draft/mergeable. No deployment has been performed for this follow-up.

## A. Original requirements

Replace Invoiceo's quick invoice generator with an improved version of the invoice-sheet editor in the user's screenshot of https://invoice-generator.com/. Create this implementation document before code changes. Continuously review this document against the code, resolve directly related stale/redundant behavior as it is encountered, and ask about consequential uncertainty before implementing it.

Confirmed on 1 November 2026:

- Full, single-page editor for guest and signed-in quick invoices: logo, sender/recipient, shipping address, invoice number, dates, payment terms, PO number, line items, currency, discounts, shipping charges, amount paid, notes/terms, save, and PDF download.
- Guest editor appears inline on the homepage. Signed-in users use the same editor.
- Discount applies before tax; shipping is added after tax. Amount paid cannot exceed total.
- Invoice numbers become unique per account. Preserve existing numbers; generate a number when the field is blank.
- Editing a Paid invoice to have a positive balance returns it to Sent / pending payment (confirmed during implementation).
- Preserve existing saved subtotal, tax, total, and line amounts for detail-only edits. Recalculate when quantities, rates, tax, currency, discount, or shipping change; changing only amount paid updates the balance and enforces the saved total as its cap (confirmed during final verification).
- Email delivery and online payment processing are deferred. Use accurate save/download action labels.

Confirmed follow-up, 7 November: replace the quick editor's automatically inserted editable rows with the normal invoice Add Item flow. Enter or select an item, review quantity/rate, and confirm before adding the row. Apply this to the shared guest/signed-in quick editor while keeping guest drafts local and catalog/stock access restricted to signed-in users.

The owner subsequently requested **“create pr of changes”**, authorizing commit/push and a PR into `dev`, including the retained public-read release notes. Merge/deployment remain separate.

Acceptance criteria:

1. Responsive invoice-sheet layout with direct line-item editing, accessible labels/errors, visible live totals, and usable mobile actions, retaining Invoiceo branding.
2. All new fields survive guest autosave/reload, signup/import, API save/reload/edit, preview, and PDF export.
3. Guest creation/download requires no authenticated API calls. Import remains idempotent; failed saves/downloads preserve the draft and show an actionable error.
4. Frontend/server/PDF calculations agree on discounts, tax, shipping, rounding, paid amount, and balance. Example: subtotal 1,000, discount 10%, zero tax, shipping 20, paid 300 gives total 920 and balance 620.
5. Distinct accounts can use the same invoice number; duplicates in one account are rejected clearly.
6. Existing standard invoices still open, edit, and export correctly. Mixed currencies are not added together in dashboard money totals.
7. Relevant tests/builds and browser/PDF verification are recorded; no production deployment or database update is implied.

## B. Technical assessment

Architecture: React 19, React Hook Form 7, Zod 4, TanStack Query, and React PDF 4; NestJS 11, Prisma 7, PostgreSQL. Existing guest data uses a single localStorage draft; signup imports it into an idempotent quick-invoice API. The existing standard invoice builder remains a separate workflow.

Verified pre-implementation issues in the affected path (resolved by the work below):

- `QuickInvoiceBuilder.tsx` uses a five-step wizard, duplicates form/line-item state and calculations, reconstructs API responses manually, and inserts an artificial 1.5-second success delay.
- The backend response exposes inline quick-invoice fields, but the frontend response type/transformer omits them. Reopening/exporting quick invoices can lose their identity/details.
- `PDFActions` and `InvoicesPage` require a saved customer/company even for quick invoices. `QuickInvoicePage` hides PDF failures behind `window.print()`.
- Calculations are repeated across builders and PDF paths; rounding assumptions differ. Existing calculation tests already expose incorrect negative half-value rounding.
- Currency is not persisted; UI/PDF/dashboard paths assume USD. Schema has no discount/shipping/paid/terms/PO/shipping-address/logo snapshot fields.
- Invoice numbers are globally unique. User approved account-scoped uniqueness.
- No Prisma migration history exists in this checkout; preserve the established schema-push workflow and document the schema rollout explicitly.

Approach:

- Replace the wizard with one shared quick editor; use the existing form/validation/query/PDF stack, inline line items, and a compact actions/settings panel.
- Extend the existing invoice contracts rather than creating another invoice persistence path. Preserve inline sender/customer snapshots and generated IDs/import keys.
- Consolidate affected calculation and mapping paths. Keep directly related cleanups tied to the acceptance criteria; discuss unrelated architectural changes before making them.
- Persist currency and currency-aware summaries. Update invoice viewing/editing/export so new data is not silently dropped.
- Store a bounded PNG/JPEG logo snapshot for quick invoices and guest drafts; validate type/size before accepting it. Reuse existing saved company branding where applicable.
- Provide real PDF output, with explicit errors and matching fields/totals. Use currency codes in PDFs where built-in fonts cannot render symbols reliably.

Design direction: a light invoice sheet, clear blue Invoiceo accents, restrained borders, direct editable rows, and a sticky desktop action panel that reflows on mobile. No competitor marketing claims or advertisements.

## C. Implementation checklist

| ID    | Status | Task and completion evidence                                                                                                 | Dependencies |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| QI-01 | DONE   | Inspect architecture and confirm scope/calculation/numbering decisions                                                       | —            |
| QI-02 | DONE   | Record baseline build and affected test results                                                                              | QI-01        |
| QI-03 | DONE   | Shared pricing/snapshot preservation, DTOs/schema, account numbering, API mapping; pricing tests and PostgreSQL checks below | QI-01        |
| QI-04 | DONE   | Shared invoice-sheet editor, inline homepage, local drafts/idempotent import; component and browser checks below             | QI-03        |
| QI-05 | DONE   | Shared preview/PDF document mapping, quick edit/reopen, currency/metadata/logo output; actual PDF verification below         | QI-03, QI-04 |
| QI-06 | DONE   | Currency-grouped dashboard and currency-aware list/recent invoices; tests and database aggregation checks below              | QI-03        |
| QI-07 | DONE   | Builds, focused tests, baseline regression comparison, database, desktop/mobile, and rendered PDF checks below               | QI-03–QI-06  |
| QI-08 | DONE   | Reviewed the affected diff; removed temporary captures; synchronized research, implementation, and rollout documentation     | QI-07        |
| QI-U01 | DONE | Standard Add Item flow reused in quick invoices; catalog quantity confirmation, guest drafts, mobile edit/cancel, reset, totals and saved financial snapshots verified. Full 518 frontend tests, build and changed-source lint/format pass. | Existing shared line-item component |
| QI-P01 | DONE | Implementation `dc0300e` pushed; PR #27 verified open/non-draft/mergeable into `dev` from the expected branch, with GitGuardian success. No merge or deployment. | QI-U01 |

## D. Work evidence

### Baseline (before application changes)

- `npm run build`: passed (Vite 7.3.0 resolved locally); existing large-bundle warning.
- Affected tests: 64 passed, 1 failed across 5 files. Guest builder/import/clear tests, guest storage/PDF tests, and invoice form tests pass. Failure: `InvoiceCalculationService.roundCurrency(-10.555)` returns `-10.55`, while its test expects `-10.56`. Resolve in the calculation work; do not misreport as a regression.
- Files inspected: quick builder/page, guest section/types/schemas/storage/PDF generation, standard invoice builder/list/preview, API DTOs/transformers/hooks, backend invoice service/controller/schema, and dashboard aggregation/display.
- User answered both clarification requests; no pending scope or numbering question.

### Implemented behavior (QI-03–QI-06)

- `backend/src/invoice/invoice-calculation.ts` is the framework-free arithmetic source used by the API and browser. Currency precision, rounded line amounts, discount-before-tax, shipping-after-tax, and paid/balance validation now share one implementation. Saved financial snapshots are preserved for non-pricing edits; payment-only edits validate against the saved total. Pricing changes normalize every line and recalculate totals. Standard and quick editors, PDF mapping, and API updates use that rule.
- Schema/DTO/service/transformer changes persist all editor fields and expose quick company/customer snapshots on reload. Numbers are unique per account; blank numbers use UUIDs. Database constraints handle concurrent duplicate/import collisions. Updates cannot change creation-only flags/import keys. PNG/JPEG logos are bounded to 256 KiB decoded and validated at upload/API boundaries.
- `QuickInvoiceBuilder.tsx` replaces the wizard and duplicate state with one React Hook Form source and direct line-item editing. `GuestInvoiceSection`, `HomePage`, and `QuickInvoicePage` provide the inline guest flow and shared authenticated editor. Draft errors are visible; failed saves/downloads retain the draft. Guest Enter/submit downloads locally without calling the invoice API.
- `invoiceDocument.ts`, `InvoicePreview`, and the shared PDF template retain sender/customer/shipping details, logo, terms, notes, PO, currency, and adjustments. Quick invoices can reopen/edit/export without a saved company profile. Removed duplicate guest PDF layout, preview scaffolding, fake placeholders, and print-on-error fallbacks. Standard invoices retain their separate builder and saved-profile workflow.
- List/dashboard views display invoice currency and quick customer snapshots. Server dashboard amounts are grouped by currency; retained scalar money fields describe USD only. No exchange conversion is implied. Removed unsupported growth percentages.
- Directly encountered defects fixed: public session refresh redirected guests to login; concurrent refreshes rotated the same cookie twice; the automatic API refresh read the wrong response envelope; signup could redirect before guest import; loading could remain stuck after mutation-cache clearing. Regression tests cover these paths. Prisma now owns/disposes its local pool, hourly auth housekeeping no longer keeps stopped processes alive, and Vitest excludes backend Jest tests. The affected standard editor also preserves empty notes, handles cleared dates/pricing errors, reuses typed customer responses, and avoids logging invoice form data.

### Verification (QI-07)

These are the original 1 November checks. The [saved invoice defaults follow-up](saved-invoice-defaults.md) subsequently resolves the baseline frontend test/lint failures and records current checks.

- Frontend and backend production builds passed. Vite retains its existing large-chunk warning.
- Focused frontend run: **139 passed, 0 failed** across editor, pricing, session restore/refresh, draft storage/PDF, form, dashboard, routes, and homepage navigation tests. Includes the existing 39 calculation tests and actual PDF byte generation. Report: `/tmp/invoiceo-final-focused-tests.json`.
- Full frontend run: **264 passed, 28 failed**. Every failing test name also fails on a clean HEAD archive at `/tmp/invoiceo-quick-editor-baseline`; no new failing names. Remaining failures concern old App/Header/Card/LineItemsTable assertions and localStorage mock isolation. Reports: `/tmp/invoiceo-final-all-frontend-tests.json`, `/tmp/invoiceo-baseline-tests.json`. These failures remain disclosed rather than expanding into unrelated component rewrites.
- Backend Jest: **149 passed, 0 failed**, all 18 suites, exit 0. HTTP tests require local-port permission; an initial sandbox run's eight `listen EPERM` failures passed when rerun with that permission. Report: `/tmp/invoiceo-final-backend-tests.json`.
- Scoped ESLint passes for new/replaced editor, preview, document/calculation, test, and backend pricing/DTO/dashboard code. Checking all changed frontend files also finds existing warnings and two `InvoicesPage` state-in-effect errors reproduced on clean HEAD. This is not a claim of a clean repository-wide lint run.
- Disposable PostgreSQL upgrade from the exact pre-editor schema passed, including existing PAID backfill and account-specific number uniqueness. Repeatable `backend/test/quick-invoice.integration.cjs` passed with exit 0: fields, edit/clear, ownership, duplicate/overpayment errors, concurrent auto-numbering/imports, Paid→Sent edits, grouped currencies, and legacy saved-total preservation/repricing. The legacy fixture preserves 0.67 with unchanged 0.335 lines; changing tax to 10% recalculates subtotal 0.68, tax 0.07, total 0.75.
- Browser checks: guest INR 1,000 less 10% discount plus 20 shipping with 300 paid displayed total 920/balance 620; autosave/reload and signup/import succeeded once. Signed-in invoices reopened without a profile, edited/saved shipping to 30, retained a real 205,830-character logo data URL, and downloaded with total 930/balance 630. Session reload/login checks passed. Desktop 1440 and mobile 390/320 layouts were checked; no horizontal overflow.
- Downloaded guest and saved PDFs were rendered and inspected. A 30-row, three-page fixture retained all rows, logo, notes/terms, PO/shipping, totals, and all three page numbers. This exposed and resolved inherited footer line-height expansion during pagination. Final saved-editor PDF also rendered correctly with logo, terms, INR 930 total and 630 balance.

### Rollout and limits

- Prepared the one-time transactional SQL and [schema rollout instructions](../../backend/prisma/updates/README.md). The original feature delivery did not modify an application database or deploy the application. A subsequent database upgrade was explicitly authorized and completed as recorded below. Other existing databases require the documented coordinated schema/API/frontend rollout; use schema push only for a new empty database.
- Email sending and online payments remain excluded as agreed. Templates/editable labels and estimates from the research are future proposals. PDFs use explicit currency codes because the built-in font cannot render every currency symbol.
- Preserving legacy snapshots can retain their historical line/subtotal rounding discrepancy. Pricing edits switch the whole invoice to the corrected rounding; detail-only edits do not silently change issued amounts.

### Authorized database upgrade follow-up — 1 November 2026

- The user supplied and explicitly authorized upgrading an Aiven PostgreSQL database. Read-only inspection and Prisma comparison confirmed the exact expected pre-editor schema. Connection details and backup contents are excluded from the repository.
- Took a full custom-format backup, verified archive readability and SHA-256 integrity, and kept it in the private, gitignored local directory `database-backups.local/aiven-pre-quick-editor-20261101/`. No connection credential is retained.
- Applied `20261101_quick_invoice_editor.sql` in one transaction with bounded lock/statement timeouts. Invoice writes were locked during the upgrade. Pre-commit assertions verified that every original invoice field and line-item record was preserved, along with the expected defaults and paid-invoice backfill.
- Post-commit SQL verification passed. Prisma's read-only schema comparison returned an empty migration with exit 0: the database matches the feature schema. Application deployment was not performed. Do not rerun the one-time SQL on this upgraded database.

### Standard item-entry follow-up — 7 November 2026

- `QuickInvoiceBuilder` now starts new invoices without a blank row and uses the existing `LineItemsTable` through React Hook Form. One-off/catalog selections are committed through Add Item; editing, cancellation and deletion reuse the standard flow. Removed the duplicate inline row editor and its field-array handling. Draft identity resets the pending item editor on Clear Draft/New Invoice.
- `LineItemsTable` accepts the existing guest/authenticated mode distinction so guest invoices mount neither catalog nor stock lookups. Existing standard-invoice and quotation callers retain their signed-in behavior. Saved totals/line amounts remain preserved on detail-only edits; quantity/rate/tax/adjustment changes keep existing recalculation behavior.
- Full frontend regression: **518 tests /65 files pass**. Production build, changed-source ESLint, Prettier and `git diff --check` pass; existing Vite bundle-size and test-environment warnings remain. Integrated coverage verifies confirmation before adding, catalog quantity in the account save payload, guest autosave/PDF data, empty-invoice validation, cancellation, fractional mobile edits, reset and historical rounding preservation. The mobile test initially asserted the dialog synchronously; awaited user interactions now verify its asynchronous lifecycle.
- Actual isolated local browser: desktop 1440px add/confirm displayed 2 hours ×100 =200; mobile edit to 1.25 hours displayed125; a new mobile product of 2 ×50 produced225. Reload restored the saved draft. At390px the item dialog and page had no horizontal overflow; guest catalog/stock requests were absent. Clear Draft removed rows/pending inputs and browser storage. Screenshots were visually reviewed inline; no new PDF artifact/render was checked because document rendering is unchanged. The isolated QA tab was closed and preview5193 stopped. No hosted data, service configuration or database was changed.
- Test logs and sanitized verification evidence are in ignored `release-artifacts.local/quick-invoice-item-flow-20261107/`. Existing public-read release-note edits in the working tree were preserved.

- Publication: current `dev` (`41eaa9e`) was merged into the fix branch without changing verified application source. Implementation/test/release-note commit `dc0300e73ed72a7e639874c7586b3f3808a8dbd9` was pushed and [PR #27](https://github.com/istekhar46/invoice_generator/pull/27) opened into `dev` from `fix/quick-invoice-item-flow`. GitHub confirmed the expected head/base, OPEN/non-draft, MERGEABLE and GitGuardian success. Private environment/CLI/QA artifacts remain ignored. This publication follow-up is documentation only; no source changed after the recorded verification.

## E. Recovery state

QI-01–QI-08, QI-U01 and QI-P01 are complete for implementation/publication scope. [PR #27](https://github.com/istekhar46/invoice_generator/pull/27) is open into `dev` from `fix/quick-invoice-item-flow`, with implementation `dc0300e` plus docs-only publication notes; expected head/base, mergeability and GitGuardian success were verified. Next release action after review/merge: verify matching Render auto-deploy and hosted guest/signed-in item entry. No merge/deployment was performed by this request. No backend change, migration, new dependency or environment variable is required. Tests/build/lint/browser checks are complete and task preview/tab are removed. Prior public-read release notes are retained in this PR; successful hosted public invoice/PDF verification after PR #26 remains separate/pending. Current platform/schema history is in [the dashboard roadmap](signed-in-dashboard-features.md); do not rerun applied upgrades.