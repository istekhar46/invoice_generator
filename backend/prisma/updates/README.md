# Invoice schema rollout

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

## Products & Services catalog (2 November 2026)

For an existing database with the saved-defaults schema, stop application writes, take a backup, and apply `20261102_product_service_catalog.sql` once before starting the matching API/frontend. It renames the existing enum values MATERIAL→PRODUCT and LABOR→SERVICE in place, creates account-owned catalog items, and adds nullable catalog references to invoice rows. It does not reprice invoices, change numbers/statuses/payments, populate the catalog from old descriptions, or introduce stock movements.

Use the reviewed upgrade SQL for existing data rather than asking schema push to replace the old enum. Old API/frontend builds cannot write the renamed enum values: coordinate the schema/API/frontend rollout. New empty databases can use schema push, without subsequently running the upgrade SQL. Retain the pre-upgrade backup/code revision for rollback planning; no automatic destructive downgrade is provided.

Live rollout is currently on **user-directed hold**. The [current catalog cutover preparation](../../../docs/implementation/signed-in-dashboard-features.md#coordinated-catalog-rollout-preparation--3-november-2026) records verified Render settings, resolved runtime dependencies, tested backup restoration, maintenance/deployment sequencing, and the rollback boundary. The maintenance-enabled API can start on the old schema with business routes blocked; verify that gate and drain old writers before applying this SQL. A candidate build or merge alone does not lift the migration hold. Do not run automatic production schema push/migration jobs during this release; this manual enum upgrade requires stopped old-client/API writes and matching application artifacts.

After upgrading, regenerate the Prisma client and build the backend/frontend. Saved invoice rows retain their own description, type, unit, quantity, rate and amount snapshots; only explicit selection adds a catalog link. Existing guest drafts normalize their old item types before validation and keep their identity/financial values. If the browser cannot persist a valid draft upgrade, it retains the old draft and shows an explicit retry error rather than overwriting it.

Local verification:

- `CATALOG_TEST_DATABASE_URL=postgresql://... npm run test:catalog-integration` uses an explicitly supplied disposable localhost database with the current schema and cleans up its fixtures.
- For the **upgrade preservation test**, first prepare a disposable database from the previous saved-defaults schema, then run the same command with `-- --upgrade`. It seeds MATERIAL/LABOR fixtures, applies the one-time SQL, compares original invoice/row fields, and tests preserved historical rounding until a pricing edit. Do not use `--upgrade` on an already-upgraded database.
- The normal integration checks cover account ownership/search/SKU isolation, mixed quick/standard invoices, snapshots, archive/restore/reference rules, first-use type/unit locking, concurrent first use versus unit edits, and account deletion cascade.
- Prisma's read-only schema diff against the upgraded disposable database returned an empty migration. The live database has **not** received the catalog upgrade.

## Saved invoice defaults (2 November 2026)

For an existing database that already has the quick-editor schema, apply `20261102_saved_invoice_defaults.sql` once before deploying the saved-defaults API/frontend. It adds one user-keyed preference table with a cascading user foreign key; it does not update invoice records or company profiles. No backfill is needed: accounts without saved preferences use the current company tax rate and blank invoice text/USD until they save defaults.

Do not rerun the 1 November upgrade on an already-upgraded database, or run either SQL file after pushing the complete schema to a new database. The second upgrade was verified locally and subsequently applied to the user-supplied live Aiven database on 2 November 2026 after a fresh backup; preservation checks passed and the final Prisma diff was empty. Both upgrades are complete for that target. The repeatable invoice integration test requires the complete current schema, including `invoice_defaults`.
