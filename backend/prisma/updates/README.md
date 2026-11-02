# Quick invoice editor schema rollout

The project currently uses `prisma db push` and has no baseline Prisma migration history. The editor requires the updated `schema.prisma` before the new API starts.

For an **existing database on the pre-editor schema**, back it up, stop writes, and apply `20261101_quick_invoice_editor.sql` once using your normal PostgreSQL deployment tooling. The transaction adds the editor fields, replaces global invoice-number uniqueness with `(userId, invoiceNumber)`, and records existing `PAID` invoices as fully paid. Existing numbers and invoice records are preserved. Review the generated SQL against the actual target schema before running it.

For a **new empty database**, use the established `npm run db:push` workflow. Do not apply the upgrade SQL after pushing the new schema; its columns and index would already exist.

Then run `npm run db:generate`, build the API/frontend, and deploy them together. The API's retained dashboard scalar money fields now represent USD only; `currencyTotals` contains separate summaries for every currency. This avoids adding different denominations together. Automatic invoice numbers use UUIDs to avoid concurrent number allocation races; custom numbers remain supported per account.

Validation against a disposable local database:

1. Prepare the database with the editor schema.
2. Run `npm run build` in `backend/`.
3. Run `INVOICE_EDITOR_TEST_DATABASE_URL=postgresql://... npm run test:invoice-integration` in `backend/`.

The integration script requires an explicitly supplied localhost database, creates uniquely named test users, and removes its own fixtures. It covers persistence/editing, calculations, duplicate and ownership errors, concurrent creation/imports, payment status, separate currency summaries, and preservation of saved totals until pricing changes. The upgrade SQL/backfill was separately exercised against a database built from the pre-editor schema.

Existing saved financial totals remain authoritative for detail-only edits. Changes to line quantities/rates/count, tax, currency, discount, or shipping use the new calculation (round each line before summing). Payment-only edits preserve charges and enforce the saved total as the payment cap. No bulk repricing of existing invoices is required.

## Saved invoice defaults (2 November 2026)

For an existing database that already has the quick-editor schema, apply `20261102_saved_invoice_defaults.sql` once before deploying the saved-defaults API/frontend. It adds one user-keyed preference table with a cascading user foreign key; it does not update invoice records or company profiles. No backfill is needed: accounts without saved preferences use the current company tax rate and blank invoice text/USD until they save defaults.

Do not rerun the 1 November upgrade on an already-upgraded database, or run either SQL file after pushing the complete schema to a new database. The second upgrade was verified locally and subsequently applied to the user-supplied live Aiven database on 2 November 2026 after a fresh backup; preservation checks passed and the final Prisma diff was empty. Both upgrades are complete for that target. The repeatable invoice integration test requires the complete current schema, including `invoice_defaults`.
