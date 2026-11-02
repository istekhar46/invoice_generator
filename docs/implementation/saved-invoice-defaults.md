# Saved invoice defaults — first release

## A. Original requirements

The user asked to complete the proposed first release: reuse existing company details/logo, remember currency, tax rate, payment terms and standard notes, provide **Save as default**, and prefill new invoices without changing existing invoices. This follows the completed quick-editor implementation; duplicate invoices, sending/sharing, quotes, payments, multiple templates/themes and editable labels are excluded.

Acceptance criteria:

1. One saved set of invoice settings per signed-in account; account isolation and validated values.
2. New invoices receive saved settings and reusable company branding. Existing invoices and restored/imported guest drafts retain their own snapshots.
3. Saving defaults does not save the current invoice or copy invoice numbers, customers, dates, items, discounts, shipping or payments into future invoices.
4. Saving/loading failures are explicit; inputs and drafts remain usable. Async profile/default loading must not overwrite user input.
5. Meaningful API, database, component and browser verification; related stale test/lint issues investigated and corrected where safe.

Confirmed by the user: sender/logo always come from the company profile; invoice settings are saved separately. Apply defaults to both new quick and new standard invoices for signed-in accounts only. Guest drafts and existing invoices retain their own values.

## B. Technical assessment

- React Hook Form 7, TanStack Query, Zod; NestJS/Prisma/PostgreSQL. Reuse existing authenticated API/query conventions, company profile and invoice snapshot fields.
- Before this release, fresh quick invoices initialized from invoice/draft data only. Standard invoices read the company tax rate; neither workflow had persisted invoice preferences.
- Company profile is optional for quick invoices and has required business fields. Account invoice preferences must be saveable without creating/requiring a complete company profile.
- Company logos are remote Cloudinary URLs (profile accepts PNG/JPEG/GIF up to 5 MB), while quick invoices persist bounded PNG/JPEG data URLs. Reuse must snapshot the logo into the existing invoice field so later company-logo replacement/deletion cannot rewrite saved invoices. Handle conversion/size/network failures explicitly.
- Saved preference values take precedence over profile tax defaults on new invoices. Existing invoices and guest drafts take precedence over both. No repricing of saved invoices.
- Official RHF reset documentation confirms dirty-value subscriptions are required for async resets. Prefer preparing initial defaults before mounting a fresh editor; do not reset active forms after settings refetch/save.
- Baseline frontend suite on 2 November 2026: **264 passed / 28 failed**, matching the previous implementation's disclosed failures. Report: `/tmp/invoiceo-defaults-baseline-tests.json`. Existing deployment database was upgraded for the quick editor only; this feature's schema rollout is separate.

## C. Implementation checklist

| ID    | Status | Task / completion criterion                                                                                          | Depends on  |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| SD-01 | DONE   | Inspect architecture, scope, initial defaults and logo constraints; capture baseline                                 | —           |
| SD-02 | DONE   | Confirmed company-profile branding and both authenticated workflows; separate per-account settings                   | SD-01       |
| SD-03 | DONE   | Preference model/validated GET+PUT API and upgrade SQL; local PostgreSQL isolation/persistence checks pass           | SD-02       |
| SD-04 | DONE   | Both builders prefill/save settings; quick logo snapshots and New invoice verified in browser                        | SD-03       |
| SD-05 | DONE   | Snapshot/account/loading/cache regressions pass; 28 baseline test failures and both route-state lint errors resolved | SD-04       |
| SD-06 | DONE   | Builds/lint/database/browser/PDF checks, actual diff review, synchronized documentation and recovery state           | SD-03–SD-05 |

## D. Work evidence

- Inspected quick/standard builders, company/profile API and logo storage, invoice math/document mapping, auth/query keys/cache cleanup, Prisma schema and baseline failing tests.
- Added `InvoiceDefaults` (user-keyed, cascading deletion), validated `/invoice-defaults` GET/PUT endpoints, and one-time `20261102_saved_invoice_defaults.sql`. Initially verified against disposable local PostgreSQL :55432, then applied to the explicitly authorized live target as recorded below. Integration checks pass for create/update/clear/isolation/one-record-per-account and unchanged saved invoices. Backend suite: 163 passed / 0 failed (including 14 defaults-contract cases).
- Added account-scoped query keys, an initialization gate that waits before showing fresh forms, settings-save cache updates, quick/standard form integration, and explicit retry/blank-start/continue-without-logo actions. Defaults never include customer, invoice number, dates, items, adjustments or paid amount. Quick invoices take a PNG/JPEG logo snapshot; larger/GIF profile logos are converted with browser canvas within the existing invoice limit.
- Resolved all 28 baseline frontend failures without weakening application behavior: responsive Card/Header assertions, actual homepage expectations, current line-item controls, real event propagation and isolated localStorage failure mocks. Storage mocks now reset implementations; old CSS/text assertions match the actual interface. These are test-fixture corrections; production storage behavior is unchanged.
- Removed duplicated URL/effect state in `InvoicesPage`: create mode and deep-link preview now derive from URL/query data. Focused regressions verify deep-link closing and switching from editing to a new invoice. The two previously disclosed lint errors are resolved.
- Standard review now downloads through the existing PDF service; removed its misleading print-only action. A regression verifies it receives the current invoice snapshot. Corrected the standard tax control so a saved 0% rate displays as `0` rather than blank.
- Browser: saved INR/0%/Net 14/text from a fresh quick invoice without a customer/items; profile branding and current one-off sender were unchanged. New invoice/reload reused the profile/logo and saved settings. Standard form received them, saved Net 21/updated notes as defaults, and created an INR 100 invoice with correct terms/notes/zero tax. Quick form then received those standard-saved settings. Guest browser made zero preferences/company API requests. Anonymous preferences GET returned 401; an authenticated attempt to supply another user ID returned 400 and left settings unchanged. Browser GIF-to-PNG logo normalization passed.
- Rendered and inspected the actual saved standard invoice PDF: company logo/details, INR 100 total/balance, 0% tax, Net 21, reusable notes and payment instructions all appear correctly. Mobile 390px layout has no overflow and the Save as default control is usable.
- Read-only Prisma diff against the upgraded disposable database is empty. Final verification: **315 frontend tests passed / 0 failed**, **163 backend tests passed / 0 failed** (19 suites), frontend/backend builds passed, and scoped frontend/backend ESLint has zero errors/warnings. Vite retains its existing large-chunk warning. Reports: `/tmp/invoiceo-defaults-final-frontend-tests.json`, `/tmp/invoiceo-defaults-final-backend-tests.json`, `/tmp/invoiceo-defaults-final-front-lint.json`, `/tmp/invoiceo-defaults-back-lint.json`; integration log: `/tmp/invoiceo-defaults-integration.log`.
- The prior quick-editor database-upgrade record was preserved. After local delivery, the user separately authorized the live database upgrade and a PR into `dev`. Publication uses `feat/saved-invoice-defaults`. Application deployment was not performed.

- Final cache checks: opening a new editor waits for a fresh profile/preferences read even with cached data. The gate then captures an initial snapshot so background refreshes cannot unmount an active form. Changing profile branding left the active sender untouched; clicking New invoice loaded the updated profile name and saved settings with blank customer/number. Standard edit/new transitions remount initialization deliberately.

### Authorized live database migration — 2 November 2026

- Applied only `20261102_saved_invoice_defaults.sql` to the previously supplied Aiven database under the user's explicit instruction. Preflight confirmed PostgreSQL 17.11 over TLS, the existing quick-editor upgrade, and a Prisma diff containing only the missing preferences table.
- Took a fresh full backup, verified archive readability/SHA-256, and retained it with migration evidence in private, gitignored `database-backups.local/aiven-pre-saved-defaults-20261102/`. Removed the temporary connection credential afterward.
- Applied the upgrade in one repeatable-read transaction with bounded lock/statement timeouts. Pre-commit counts/full-row hashes verified preservation across all six existing application tables. The new user primary key and cascading ownership foreign key were validated before commit.
- Post-commit checks passed: 2 invoices, 2 line items and 4 company profiles preserved; defaults table initially empty as expected; account invoice-number uniqueness retained. Prisma's read-only comparison returned an empty migration with exit 0. No application deployment was performed.

## E. Recovery state

All SD-01–SD-06 tasks are complete and verified. No implementation blocker or unanswered scope question remains. Publication branch: `feat/saved-invoice-defaults`; target: `dev`, as requested by the user. Application deployment remains separate.

The user-supplied live database is now upgraded and matches the current Prisma schema; no migration action remains for that target. Do not rerun either completed SQL upgrade there. API/frontend deployment remains separate and has not been performed here. For another environment, inspect its schema and follow `backend/prisma/updates/README.md`.

Local QA: API :3102, Vite :5175, disposable PostgreSQL :55432. Chrome DevTools isolated context invoice-defaults-qa (page 47) and guest page 49 were used because the Playwright profile was locked. Test reports/PDF artifacts are under `/tmp/invoiceo-defaults-*`. No temporary credentials or backup data were added to version control. Preserve the prior quick-editor migration record and the ignored private backup directory.
