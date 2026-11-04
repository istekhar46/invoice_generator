# Invoice schema rollout

The project currently uses `prisma db push` and has no baseline Prisma migration history. The editor requires the updated `schema.prisma` before the new API starts.

For an **existing database on the pre-editor schema**, back it up, stop writes, and apply `20261101_quick_invoice_editor.sql` once using your normal PostgreSQL deployment tooling. The transaction adds the editor fields, replaces global invoice-number uniqueness with `(userId, invoiceNumber)`, and records existing `PAID` invoices as fully paid. Existing numbers and invoice records are preserved. Review the generated SQL against the actual target schema before running it.

For a **new empty database**, push the current Prisma schema, then install both its inventory and payment invariants once as described below. Do not apply the upgrade SQL after pushing the new schema; its columns and indexes would already exist.

Then run `npm run db:generate`, build the API/frontend, and deploy them together. The API's retained dashboard scalar money fields now represent USD only; `currencyTotals` contains separate summaries for every currency. This avoids adding different denominations together. Automatic invoice numbers use UUIDs to avoid concurrent number allocation races; custom numbers remain supported per account.

Validation against a disposable local database:

1. Prepare the database with the editor schema.
2. Run `npm run build` in `backend/`.
3. Run `INVOICE_EDITOR_TEST_DATABASE_URL=postgresql://... npm run test:invoice-integration` in `backend/`.

The integration script requires an explicitly supplied localhost database, creates uniquely named test users, and removes its own fixtures. It covers persistence/editing, calculations, duplicate and ownership errors, concurrent creation/imports, payment status, separate currency summaries, and preservation of saved totals until pricing changes. The upgrade SQL/backfill was separately exercised against a database built from the pre-editor schema.

Existing saved financial totals remain authoritative for detail-only edits. Changes to line quantities/rates/count, tax, currency, discount, or shipping use the new calculation (round each line before summing). Receipts/reversals preserve charges and enforce the saved total as the payment cap. Direct account paid-amount edits retire with the payment increment below. No bulk repricing of existing invoices is required.

## Products & Services catalog (2 November 2026)

For an existing database with the saved-defaults schema, stop application writes, take a backup, and apply `20261102_product_service_catalog.sql` once before starting the matching API/frontend. It renames the existing enum values MATERIAL→PRODUCT and LABOR→SERVICE in place, creates account-owned catalog items, and adds nullable catalog references to invoice rows. It does not reprice invoices, change numbers/statuses/payments, populate the catalog from old descriptions, or introduce stock movements.

Use the reviewed upgrade SQL for existing data rather than asking schema push to replace the old enum. Old API/frontend builds cannot write the renamed enum values: coordinate the schema/API/frontend rollout. New empty databases can use schema push, without subsequently running the upgrade SQL. Retain the pre-upgrade backup/code revision for rollback planning; no automatic destructive downgrade is provided.

The hosted catalog/inventory cutover completed on **3 November 2026**. The [cutover evidence](../../../docs/implementation/signed-in-dashboard-features.md#authorized-live-cataloginventory-cutover--3-november-2026) records backup, exact SQL application, data/schema/invariant checks and reopened matching API. Do not rerun these upgrades on that database. The owner confirmed this is a development environment without actual users; keep future deployment/migration checks proportionate. For another old target, coordinate enum/schema changes with the matching API.

After upgrading, regenerate the Prisma client and build the backend/frontend. Saved invoice rows retain their own description, type, unit, quantity, rate and amount snapshots; only explicit selection adds a catalog link. Existing guest drafts normalize their old item types before validation and keep their identity/financial values. If the browser cannot persist a valid draft upgrade, it retains the old draft and shows an explicit retry error rather than overwriting it.

Local verification:

- `CATALOG_TEST_DATABASE_URL=postgresql://... npm run test:catalog-integration` uses an explicitly supplied disposable localhost database with the current schema and cleans up its fixtures.
- The historical catalog **upgrade preservation test** (`-- --upgrade`) was verified with the catalog-release API against the previous saved-defaults schema. It seeds MATERIAL/LABOR fixtures and applies the one-time catalog SQL. Current invoice code also requires payment tables/guards: use the catalog-release revision for that isolated old-schema rehearsal, or apply all subsequent upgrades before running current normal mode. Do not run the old isolated mode with the current API or on an already-upgraded database.
- The normal integration checks cover account ownership/search/SKU isolation, mixed quick/standard invoices, snapshots, archive/restore/reference rules, first-use type/unit locking, concurrent first use versus unit edits, and account deletion cascade.
- Prisma's read-only schema diffs were empty for the upgraded disposable and hosted databases; existing-data preservation was separately verified.

## Saved invoice defaults (2 November 2026)

For an existing database that already has the quick-editor schema, apply `20261102_saved_invoice_defaults.sql` once before deploying the saved-defaults API/frontend. It adds one user-keyed preference table with a cascading user foreign key; it does not update invoice records or company profiles. No backfill is needed: accounts without saved preferences use the current company tax rate and blank invoice text/USD until they save defaults.

Do not rerun the 1 November upgrade on an already-upgraded database, or run either SQL file after pushing the complete schema to a new database. The second upgrade was verified locally and subsequently applied to the user-supplied live Aiven database on 2 November 2026 after a fresh backup; preservation checks passed and the final Prisma diff was empty. Both upgrades are complete for that target. The repeatable invoice integration test requires the complete current schema, including `invoice_defaults`.

## Inventory schema foundation (3 November 2026)

This foundation migration provides inactive schema only and preserves the original three invoice statuses. The subsequent invoice-inventory increment below adds VOIDED and registers the integrated API module. Historical invoices are not replayed, repriced or assigned invented issue dates. Existing catalog items remain untracked and both history tables start empty when the foundation is applied.

For an existing database already on the **catalog schema**, back up, stop writes, verify the expected baseline and apply once from `backend/` with privately configured PostgreSQL client connection settings:

```sh
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261103_inventory_foundation.sql
```

The SQL owns its transaction, bounded locks and statement timeout. Keep `prisma/updates/` and `prisma/constraints/` together: psql resolves the shared invariants through `\ir ../constraints/inventory.sql`. Do not add `--single-transaction` to this upgrade, run it before the catalog upgrade, rerun it, or use schema push to upgrade existing data. The hosted catalog and inventory upgrades are complete for the approved target.

For a **new empty database**, use `npm run db:push`, then install the shared constraints once in a transaction:

```sh
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/inventory.sql
```

Do not subsequently apply the one-time upgrade. Configure psql's standard `PG*`/private `PGPASSFILE` inputs separately from Prisma's datasource `.env`. A bare schema push creates models but omits these required inventory CHECKs, triggers and deferred foreign-key properties. Prisma's diff ignores unsupported objects; verify them directly as the integration test does.

`StockAction` groups a single owner's request/source, payload hash, effective date, recorded time and optional reversal reference. Its internal BIGSERIAL sequence orders cutover actions without timestamp ties; it is not invoice numbering. Opening/issue/void source keys and request IDs are unique per owner. `StockMovement` stores signed `NUMERIC(18,3)` deltas, one per action/product, with same-owner foreign keys. No independently editable balance cache is introduced. The inventory API serializes decimal quantities and BigInt sequence values as strings.

Shared invariants keep history rows append-only, reject invalid sources/directions/non-finite deltas, and fix tracked units/kind/start time and recorded invoice issue time. Four source-reference FKs are checked at commit so whole-account cascades still work; ordinary invoice/product/customer deletion cannot remove retained history. PostgreSQL rounds excess input scale before NUMERIC row checks, so API callers must use strict quantity validation before writing. The integrated APIs enforce aggregate non-negative balances, retries/reversals and atomic posting under product row locks; schema guards alone do not enforce those aggregate rules.

Local schema tests require a disposable `stock_schema_*` localhost URL and compiled API/client:

```sh
INVENTORY_SCHEMA_TEST_DATABASE_URL=postgresql://... npm run test:inventory-schema -- --verify
```

For upgrade preservation, run `--seed-before` against an empty catalog-schema fixture with an explicit `INVENTORY_SCHEMA_SNAPSHOT_FILE`, apply the exact psql upgrade, then run `--verify-upgrade` with that same fixture snapshot. `--verify` checks fresh setup; `--verify-rollback` checks a catalog-schema fixture after a deliberately failed local upgrade. These modes are for fictional data only; they never authorize selecting a production target. Do not run them on live data.

## Invoice stock lifecycle (3 November 2026)

After the inventory foundation, apply `20261103_invoice_inventory.sql` once before deploying its API/frontend:

```sh
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261103_invoice_inventory.sql
```

It adds only VOIDED to InvoiceStatus, with no row updates/backfill. The enum addition commits before the API uses the new value. The generated Prisma schema diff confirms this is the only new supported-schema change. Do not rerun the foundation or this enum upgrade on an already-upgraded target. A fresh schema push includes VOIDED and still requires the shared inventory invariants once.

The enum upgrade and real JWT/HTTP issue/edit/void/cutover/concurrency flows were verified locally against PostgreSQL 17. This new upgrade is not yet applied to the hosted development database; the earlier catalog/foundation upgrades are complete there. Use `INVOICE_STOCK_TEST_DATABASE_URL=postgresql://... npm run test:invoice-stock` for a complete disposable stock_schema_* localhost fixture. Historical `-- --upgrade` mode isolates the pre-VOIDED inventory schema with the stock-release API revision; current normal mode requires payment tables/guards too. Foundation-only `--verify-upgrade` still checks its unchanged three-status contract; fresh `--verify` checks the current four-status schema.

## Manual UPI payment records (3 November 2026)

For an existing database with the inventory foundation and **committed VOIDED enum**, apply once from `backend/`, with privately configured PostgreSQL client settings:

```sh
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261103_payment_receipts.sql
```

The SQL owns its transaction and bounded locks. Keep `updates/` and `constraints/` together for `\ir ../constraints/payments.sql`. It creates account/invoice-owned signed minor-unit payment history, labels nonzero old `amountPaid` as MIGRATION openings with unknown method/date, and normalizes the paid cache through the established currency rounding. It preserves saved subtotal/tax/total/line snapshots and timestamps. Positive-total issued statuses reconcile to Paid only when fully paid, otherwise Sent; Draft/Voided and zero-total Sent/Paid labels remain. It never infers money from a Paid label or posts stock. Unsupported, non-finite, negative, overpaid or paid-voided data aborts the entire upgrade for explicit correction.

Apply the outstanding enum upgrade first, commit it, then apply this upgrade and deploy the matching API before the frontend. The old API accepts mutable paid amounts and direct Mark Paid; it is incompatible with the new guards. Stop that old API during the change. The owner confirms this is development without actual users; a simple coordinated schema/API/frontend update is sufficient. **Neither outstanding upgrade nor this matching deployment was performed in the payment increment.** No new secret, gateway connection or external provider configuration is required for manual records.

For a **new empty database**, push the complete schema and install all three shared files once:

```sh
npm run db:push
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/inventory.sql
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/payments.sql
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/razorpay.sql
```

Do not run one-time upgrades after schema push. Prisma models alone omit append-only/source/currency guards and deferred ledger/cache/status reconciliation. Native SQL and supported-schema diffs are separate checks.

Local verification requires the compiled API and a disposable `stock_schema_*` localhost database:

```sh
PAYMENTS_TEST_DATABASE_URL=postgresql://... npm run test:payments
```

The real HTTP/JWT suite covers strict decimal/date input, partial/full/overpayments, owner isolation, replay/collision, concurrency with edits/voids, once-only full reversals, guest openings, fixed currency, history/filters/paging, native immutability/cache/retention, no receipt stock movements and whole-account deletion. For a migration rehearsal, start with the **pre-payment, post-VOIDED schema**, run `npm run test:payment-migration -- --seed`, apply the exact upgrade via psql, then run `npm run test:payment-migration -- --verify`, supplying `PAYMENTS_TEST_DATABASE_URL` for both commands. Seed mode requires an empty fixture and writes fictional data only. A rejected invalid-data rehearsal separately verified transactional rollback.

Final local evidence: ten legacy cases and all 162 supported currency scales matched the application rounding; fresh/upgraded Prisma diffs were empty; six native functions, nine payment constraints and six triggers were identical between both setup paths. Receipt corrections retain originals and require a reason; historical openings remain visibly distinct from owner-recorded UPI. Razorpay links, settlement verification and refunds are later work.

## Razorpay merchant connections (4 November 2026)

For an existing database with the receipt schema, apply once from `backend/` with privately configured PostgreSQL client settings:

```sh
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261104_razorpay_connections.sql
```

This additive, transactional migration creates `RazorpayMode` and one owner/mode-unique `razorpay_connections` table with cascading user ownership, authenticated ciphertext, four-character key suffix, enabled flag, verification timestamps and a version counter for concurrent setup changes. It adds no connection backfill and changes no invoice/payment/stock records. The connection-only milestone had no native guards; the current full schema also requires the gateway guard installer below after inventory/payment guards. Do not apply this upgrade after fresh schema push or rerun it on an upgraded target.

Server-held `RAZORPAY_CREDENTIALS_KEY` is required only to save/read encrypted credentials and reverify connections; absent configuration disables setup without breaking existing invoice/manual-payment routes. Configure the key in the deployment secret store, never the database or frontend. Retain it across restarts and database restores. Wrong/lost encryption keys cause an explicit read failure; there is no plaintext fallback. Provider credentials are supplied by each signed-in business through Payment settings, and Test/Live records are separate. Connection verification is read-only. The subsequent gateway milestone below adds link and webhook processing; configure its endpoint only with the matching deployed API.

Local verification uses `RAZORPAY_TEST_DATABASE_URL=postgresql://... npm run test:razorpay-connections` with a disposable `stock_schema_*` localhost database and compiled API. It checks real JWT/DTO/owner/mode isolation, ciphertext and masked reads, failed replacement preservation, disable/re-enable, concurrent-disable protection, unchanged invoice/payment/stock data and account cascade. Provider verification is fictional in this fixture; SDK unit tests separately check its read-only call and sanitized errors/deadline. Exact upgrade preservation and a read-only Prisma comparison are recorded in the implementation document. No live migration or provider readiness is implied by fixture success.

## Razorpay payment links, capture and refund sources (4 November 2026)

For an existing receipt/merchant-connection database, apply these **once, in this order**, from `backend/`, using separately configured private PostgreSQL client settings:

```sh
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261104_gateway_payment_kinds.sql
psql -X -v ON_ERROR_STOP=1 -f prisma/updates/20261104_razorpay_gateway.sql
```

The first transaction commits RAZORPAY/REFUND enum labels before guards use them. The second transaction adds link intents and immutable request aliases, captured/refund source facts, source receipt references, webhook event digests and encrypted secret history, with bounded locks/timeouts and `\ir ../constraints/razorpay.sql`. It extends payment/source/currency guards, protects link identity/history, and defers owner/source FKs and source/ledger reconciliation until commit so normal account deletion still works. Keep `updates/` and `constraints/` together. No invoice, stock, existing receipt or merchant credential data is backfilled or repriced. Earlier outstanding hosted upgrades (VOIDED → receipts → connections) must precede these two. Deploy the matching API before frontend; the old manual-payment API cannot understand gateway receipts/refunds or active-link guards.

For a new empty target, push the complete schema then install `inventory.sql`, `payments.sql`, `razorpay.sql` once, each transactionally. Do not apply any one-time upgrade after schema push. Prisma alone cannot install native invariants. Fresh/upgraded local diffs are empty; 112 native objects (including 15 functions and 26 triggers) match. Existing invoice/receipt/credential/stock preservation was checked on the exact additive upgrade. `GATEWAY_TEST_DATABASE_URL=postgresql://... npm run test:gateway` requires a disposable `stock_schema_*` localhost database and compiled API; it never contacts the merchant. Real Test probes are separate and never authorize Live operations or hosted migrations.
