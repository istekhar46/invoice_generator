# Invoiceo API

NestJS 11 / TypeScript / Prisma 7.10.1 / PostgreSQL API for authentication, company profiles, customers, invoice defaults, invoices, account-owned Products & Services, inventory, manual UPI receipts and Razorpay payment links.

## Local development

Use Node.js 22 (Prisma 7 requires 22.12 or newer on this release line). The production image uses its bundled npm 10; generate and verify dependency locks with that toolchain. The updated lock also passes the local npm 12 clean-install check.

```sh
cd backend
nvm use
npm ci
cp .env.example .env
```

Configure your local database and authentication/OAuth settings in `.env`. For a local database without TLS, set `PG_SSL=false`. To use the repository's disposable Docker databases:

```sh
docker compose up -d postgres postgres_test
```

For a **new empty local database** only (configure the PostgreSQL client's `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and private `PGPASSFILE` separately; psql does not read Prisma's `.env`):

```sh
npm run db:push
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/inventory.sql
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/payments.sql
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/razorpay.sql
psql -X -v ON_ERROR_STOP=1 --single-transaction -f prisma/constraints/quotations.sql
npm run build
npm run start:dev
```

`npm run build` generates the Prisma client before compiling. `PORT` determines the listen port (default 3001); every API route uses `/api/v1`.

Nest CLI and Prisma CLI are development/build dependencies. Install development dependencies before generating/building or running schema checks; production starts the compiled application directly. Keep Prisma CLI/client/adapter versions aligned. Parent-scoped security overrides currently select Multer 2.5.0 for the Nest Express adapter and js-yaml 5.4.1 for Swagger; their rationale, actual resolved versions and regression evidence are in the implementation document. Review/remove each override when its upstream parent declares a patched dependency.

## Existing database upgrades and releases

Read [schema rollout instructions](prisma/updates/README.md) and the [current release recovery state](../docs/implementation/signed-in-dashboard-features.md#e-recovery-state) before deployment.

**Last verified hosted development state (5 November 2026):** schema upgrades through public sharing are applied; API/frontend serve dev merge `a0d7aa6` containing invoice quantity/discount fix PR #23 and public-sharing PR #22. Hosted signed-out sharing/PDF/revocation and API readiness200 are verified. Both Render services auto-deploy dev commits. Secure/HttpOnly/SameSite=None refresh cookies and existing Razorpay Test setup are retained. No Live charge/refund was performed. Do not rerun applied upgrades or regenerate the sharing key. Guided payment setup is verified locally only on `feat/razorpay-guided-setup`; see its implementation document before publication.

This repository has no baseline Prisma migration history. Existing databases use the reviewed, one-time SQL upgrades in `prisma/updates/`; `npm run db:migrate` does not apply these files. Do not run schema push against an existing pre-catalog database to rename its enum. Do not rerun upgrades after a fresh schema push.

The inventory schema adds inactive tracking/issue timestamps and private action/movement models. For an existing **catalog-schema** database, `20261103_inventory_foundation.sql` includes shared invariants from `prisma/constraints/inventory.sql` in its transaction. For a new empty database, apply that invariants file once after schema push, as above. Prisma cannot model these CHECKs, triggers or deferred source foreign keys; schema push/diff alone does not install or verify them. Neither path enables stock tracking or backfills historical invoices.

For a native Node service, install with `npm ci --include=dev`, build with `npm run build`, and start with `npm run start:prod`. Set the actual database/authentication/provider configuration in the deployment's secret store. The catalog schema and matching API/frontend must be released in one coordinated window.

For the container:

```sh
docker build -t invoiceo-api:catalog .
```

The image uses Node 22, runs as a non-root user, and defaults to production mode. Build-time client generation uses an inert local URL; no production database credentials are needed to build. Supply the real `DATABASE_URL` and other required environment settings only when running the image. The container readiness probe uses the configured `PORT` and `/api/v1/health/ready`. No automatic database migration runs at build or startup.

The hosted catalog/inventory cutover completed on 3 November 2026: both upgrades applied once, existing data and invariant definitions verified, matching merged API reopened. See the [cutover evidence](../docs/implementation/signed-in-dashboard-features.md#authorized-live-cataloginventory-cutover--3-november-2026). This is currently a development environment with no actual users; use proportionate migration checks going forward. Do not rerun applied one-time SQL.

The current Render native build command must install compiler dependencies explicitly and prune them after compilation: `npm ci --include=dev && npm run build && npm prune --omit=dev`. A production-only `npm install` omits Nest CLI and fails with `nest: not found`. Keep the existing compiled start command; changing this provider setting can trigger deployment, so apply it only during the coordinated rollout.

### API maintenance mode

`MAINTENANCE_MODE` defaults to off when absent or `false`. Deploy with `true` to return HTTP 503, `Cache-Control: no-store` and `Retry-After: 60` for business requests before controllers run. CORS still applies. Only GET/HEAD requests to `/api/v1/health/ready`, `/api/v1/health/live`, `/api/v1/docs-json` and `/api/v1/docs-yaml` bypass the gate; requests with other methods do not. Invalid flag values prevent startup. On Render, use **Save and deploy** to apply environment changes to the existing build; Restart service reuses its previous environment. Verify actual HTTP responses after changing the flag.

Use this switch when a breaking schema/API cutover needs writes stopped. Verify the schema and OpenAPI separately, then deploy with the flag `false` to reopen business routes. It does not pause external writers or background jobs; the current API has no scheduled database writer. Routine development changes do not need the full cutover procedure.

## Runtime configuration

See [.env.example](.env.example) and the existing configuration modules for supported settings. Key release inputs:

| Setting                                                                | Purpose                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`, `PG_SSL`, `PG_CA_CERT`, `PG_SSL_REJECT_UNAUTHORIZED`   | Database connection and the existing TLS configuration         |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`                                     | Access/refresh token signing                                   |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`      | Existing Google sign-in integration                            |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Existing logo provider settings required for logo operations   |
| `PORT`, `NODE_ENV`                                                     | Listen port and environment                                    |
| `MAINTENANCE_MODE`                                                     | Default-off business-request gate; literal `true` or `false`   |
| `RAZORPAY_CREDENTIALS_KEY`                                              | Optional 32-byte canonical base64 key for merchant credential encryption; absent disables setup |
| `FRONTEND_URL`                                                         | Exact frontend origin allowed by CORS                          |
| `API_PROD_SERVER_URL`                                                  | Public API origin displayed in Swagger                         |
| `COOKIE_*`                                                             | Existing refresh-cookie configuration for the deployed origins |

Preserve established production settings during this catalog release; it adds no runtime secret or provider requirement. The frontend's `VITE_API_BASE_URL` is a **build-time API origin**, without `/api/v1` (the client adds that prefix).

## Verification

```sh
npm run test -- --runInBand
npm run lint:check
npm run build
```

Also inspect `npm audit --omit=dev` and the full `npm audit`; development findings must stay visible. The 2 November remediation records zero production findings, with lower-severity build/test findings assessed separately. Full-repository lint has existing failures; the implementation document records the identical before/after baseline rather than claiming that check passes.

Database integrations require explicitly supplied **disposable localhost** URLs and the compiled API. They create and clean up their own fixtures:

```sh
CATALOG_TEST_DATABASE_URL=postgresql://... npm run test:catalog-integration
INVOICE_EDITOR_TEST_DATABASE_URL=postgresql://... npm run test:invoice-integration
INVENTORY_SCHEMA_TEST_DATABASE_URL=postgresql://... npm run test:inventory-schema -- --verify
INVENTORY_API_TEST_DATABASE_URL=postgresql://... npm run test:inventory-api
INVOICE_STOCK_TEST_DATABASE_URL=postgresql://... npm run test:invoice-stock
PAYMENTS_TEST_DATABASE_URL=postgresql://... npm run test:payments
RAZORPAY_TEST_DATABASE_URL=postgresql://... npm run test:razorpay-connections
GATEWAY_TEST_DATABASE_URL=postgresql://... npm run test:gateway
```

The historical catalog `-- --upgrade` rehearsal uses the catalog-release revision on the previous saved-defaults schema; current invoice code requires subsequent inventory/payment models too. Run current normal mode on the complete schema. Never use these integration scripts against production. See the schema rollout instructions for upgrade rehearsals.

Inventory schema verification additionally requires a disposable `stock_schema_*` localhost database. Its `--seed-before`, `--verify-upgrade`, `--verify` and `--verify-rollback` modes exercise preservation, ownership, deduplication, history/source guards, account cascade and generated Prisma types. Upgrade modes use an explicitly supplied `INVENTORY_SCHEMA_SNAPSHOT_FILE` containing fictional fixtures only. The operator applies SQL separately with psql; the test does not select or migrate a live target.

The inventory API test uses the same disposable database contract with real HTTP/JWT/Prisma, checking strict decimal strings, bounds, owner isolation, retries, zero opening, reversals and concurrent postings. Opening/adjustment bodies require `requestId`, `quantity` (string), current `unit`, `reason` and `effectiveDate` (YYYY-MM-DD), plus `direction` IN/OUT for adjustments. Reversals take request ID/reason/date. Date is descriptive; current balance and action sequence govern posting. Quantities and action sequences serialize as strings.

`InventoryModule` is registered with invoice stock integration. Issue Draft → Sent before recording new receipts; stock deductions and invoice changes commit together. Issued quantity edits apply only net changes; unpaid Sent invoices can be voided once, returning actual posted stock and retaining immutable history. Only unpaid drafts without stock or payment history can be deleted. Historical issued invoices are exempt from posting, as are products whose opening follows an invoice's issue action. Detail-only edits preserve financial snapshots. The signed-in `/inventory` frontend now provides balances/timeline, opening stock, Stock In/Out, manual reversal, filters and source-invoice previews; catalog stock entry points are also implemented. See [PDF export verification](../src/services/pdf/README.md#verification) for shared cancellation/snapshot checks.

For an existing inventory-schema database, apply `prisma/updates/20261103_invoice_inventory.sql` once before deploying the matching API/frontend. It only adds the VOIDED enum value; the earlier catalog/inventory upgrades are already applied on the hosted development target. This enum upgrade was subsequently applied to hosting in the 4 November gateway rollout. The invoice-stock test's `-- --upgrade` mode expects a disposable fixture on the pre-VOIDED inventory schema and applies that exact SQL; normal mode expects the current complete schema.

### Manual UPI payment records

`PaymentModule` provides owner-scoped `/api/v1/payments` history, `/payments/invoices` payable selection, `/payments/invoices/:id` summary, POST `/payments/invoices/:id/receipts`, and POST `/payments/:id/reversal`. New receipts require a Sent INR invoice, positive exact decimal **string** amount, `requestId` and valid `paymentDate` (YYYY-MM-DD); reference/notes are optional. Reversals require `requestId`, correction `paymentDate` and nonblank `reason`, and negate the full original entry once. Keep one request ID through retries, including uncertain responses. Identical replay succeeds; reusing a committed request with changed details returns a conflict.

Amounts and recorded sequences serialize as strings. History supports invoice/search/kind/status/date filters and pagination; unknown-date openings are excluded by date filters. The paid Float in existing invoice responses is a checked cache derived atomically from signed minor-unit history. Direct account paid-amount edits and PATCH Paid are rejected. Explicit guest imports may preserve a labeled unknown-method/date opening balance; fully prepaid drafts still require issue. Currency stays fixed after history, including reversals. Payments never post stock or transfer/refund money; these are owner-recorded receipts, without Razorpay verification.

Existing databases require `prisma/updates/20261103_payment_receipts.sql` once **after** the committed VOIDED enum upgrade and before the matching API/frontend. Fresh databases require both shared invariants files after schema push. The payment schema and matching API were deployed in the 4 November gateway rollout; the matching frontend is deployed and signed-in page/API checks pass. See [payment rollout and preservation checks](prisma/updates/README.md#manual-upi-payment-records-3-november-2026).

### Razorpay merchant setup

The signed-in `/payments/settings` page has separate Test/Live API credentials. GET `/api/v1/razorpay/connections` returns availability and masked metadata; PUT `/:mode` verifies then saves/replaces keys; POST `/:mode/verify` checks and re-enables saved keys; DELETE `/:mode` disables the connection without deleting its credentials. Modes are uppercase TEST/LIVE. Verification uses the official Razorpay 2.9.8 SDK to fetch one Payment Link; it creates no link, charge or notification. API access does not establish merchant activation, settlement or checkout readiness. The gateway endpoints below create and synchronize links independently of this read-only check.

Set `RAZORPAY_CREDENTIALS_KEY` privately to exactly 32 random bytes in canonical base64, generated once, for example with `openssl rand -base64 32`. Keep it stable across deployments and protect it separately from the database/JWT secrets. Missing configuration leaves invoice/manual-payment functionality available and disables merchant setup; malformed nonempty configuration fails startup. AES-256-GCM ciphertext authenticates the owner and mode. Secrets are write-only to authenticated setup; reads expose only a four-character suffix and timestamps. Frontend credential requests suppress raw Axios error logs and do not use cached mutation variables. Invalid replacement checks preserve the old saved connection. Version checks prevent an earlier verification/replacement from undoing a concurrent disable.

Apply `prisma/updates/20261104_razorpay_connections.sql` once after the existing receipt schema before deploying the matching API. Fresh schema push requires the native guard files shown in setup above. Hosted migrations and matching API deployment were subsequently completed by the authorized 4 November Test webhook setup. The `test:razorpay-connections` fixture uses real HTTP/JWT/Prisma/PostgreSQL with a **fictional read-only provider**, and never contacts a merchant. Actual provider/checkout verification must be recorded separately. Development-only `RAZORPAY_TEST_KEY_ID`/`RAZORPAY_TEST_KEY_SECRET` in ignored `backend/.env` may be used for explicit Test verification (a separate `.env.local` is unnecessary); they are not automatically connected or read by the application setup API.


### Razorpay payment links and synchronization

The protected `/payments/links` workspace provides Test/Live history, create/reuse, copy/open, refresh/retry/cancel, captured funds, applied/unapplied amounts and refund details. Only Sent INR invoices with a balance qualify. The server chooses the full balance; browser redirects never mark invoices Paid. Standard links are configured for UPI only, with partial payments, notifications and reminders disabled.

Owner-scoped API: GET/POST `/api/v1/razorpay/links`, GET `/:id`, POST `/:id/refresh`, `/:id/retry`, `/:id/cancel`. Create requires `invoiceId`, `mode` and stable `requestId`. Every accepted request is retained as an immutable alias to its intent, including reuse; retrying after cancellation/refund replays the same link. An uncertain request reserves its reference and is explicitly recovered; no automatic second intent is created. Resolve active Live links before manual receipt/reversal, financial invoice edits or voids. Disable is blocked while active links exist. Replacement credentials must retain access to this merchant's history, including reference recovery for an uncertain first creation.

Captures/refunds are authenticated against the merchant API and stored once per connection/provider ID. Test sources never change real invoice rows or stock. Eligible Live UPI/INR captures apply only up to the balance; excess, late voided, unexpected method/currency and precision exceptions remain visible for owner review. Refunds consume original excess first, then append negative invoice adjustments when processed. Pending/failed refunds have no paid effect. No API initiates refunds; manage them in Razorpay and refresh. Real payment history fixes invoice currency, even after refunds. Gateway entries cannot be manually reversed. Only a matching active Live URL appears on invoice responses/previews/PDFs; saved PDF actions fetch current invoice data first.

POST `/api/v1/razorpay/connections/:mode/webhook` saves a write-only 16–256 character whitespace-free secret. Use the returned `webhookPath` under the deployed public HTTPS API origin in the same merchant/mode's Razorpay settings. Subscribe to `payment_link.paid`, `payment_link.partially_paid`, `payment_link.cancelled`, `payment_link.expired`, `payment.captured`, `refund.created`, `refund.processed`, `refund.failed`. Public POST `/api/v1/razorpay/webhooks/:connectionId` verifies raw-body HMAC SHA-256 and `x-razorpay-event-id`, refetches provider facts and deduplicates durable outcomes. Rotated secrets remain encrypted for the documented 24-hour retry window; no raw webhook bodies or secrets are stored in event history. Keep the credential encryption key stable.

Existing databases require the connection upgrade, committed gateway kinds upgrade, then gateway models/guards upgrade. See `prisma/updates/README.md`; never run upgrades after fresh schema push. Local `test:gateway` uses real HTTP/JWT/PostgreSQL with a controlled provider, including native source rollback, concurrent replay, delayed reference lookup, raw-body tampering, out-of-order refunds and account cascade. Actual Test-key/API/checkout observations and external verification limits are recorded in the implementation document. The actual hosted database/API/Test webhook release is recorded separately in the implementation document; local tests alone do not prove hosted provider readiness.

Useful endpoints:

- `/api/v1/health/ready`: database connectivity readiness.
- `/api/v1/health/live`: process liveness.
- `/api/v1/docs` and `/api/v1/docs-json`: Swagger UI/OpenAPI.
- `/api/v1/catalog`: authenticated catalog API; a successful health probe alone does not verify the catalog schema or account isolation.

### Quotations and account numbering

For an existing database upgraded through Razorpay, apply `prisma/updates/20261105_quotations.sql` once with `psql -X -v ON_ERROR_STOP=1 -f ...`, then deploy the matching API/frontend. It adds quotation snapshots/rows, account counters, retained number reservations and invoice source links, installs quotation invariants, and seeds counters/reservations from existing invoices without rewriting them. Used numbers remain reserved to their original document after draft deletion or renumbering. Schema push does not install the native guards. The migration was rehearsed locally and applied to the hosted development database on 5 November 2026; the matching merged API/frontend are deployed and the quotation workflow is verified. See `docs/implementation/signed-in-dashboard-features.md` for release evidence.

Run `QUOTES_TEST_DATABASE_URL=<disposable localhost stock_schema_* URL> npm run test:quotes` after a backend build. Conversion creates an unpaid draft, preserves the saved quote, and never issues stock or takes payment. Linked invoices are retained; an unissued converted draft can be cancelled without stock history. Quote validity ends after the selected UTC date.

### Public invoice sharing

For an existing database upgraded through quotations, apply `prisma/updates/20261105_invoice_sharing.sql` once before deploying the matching API/frontend. It adds only the account-bound active share table; existing invoices and amounts are unchanged. Fresh schema push includes this table and uses the same four existing native guard files. The hosted development target received this upgrade on 5 November 2026; all 22 existing tables retained identical data fingerprints. Do not rerun it there. The independent signing key and matching PR #22 code are deployed; actual owner share/signed-out view/PDF/revocation checks passed. See the [sharing implementation evidence](../docs/implementation/public-invoice-sharing.md).

Set `INVOICE_SHARE_SECRET` privately to 32 random bytes in canonical base64 (`openssl rand -base64 32`), separately from account JWT/payment encryption keys. Keep it stable: rotation invalidates existing public links. Missing configuration disables sharing only; malformed nonempty configuration fails startup. Signed capabilities use fixed algorithm/issuer/audience and a random share ID, without owner identities. No usable bearer token is stored in the database.

Authenticated `/invoices/:id/share` GET/POST/DELETE reads status, creates/reuses a link and revokes it. New shares require Sent/Paid status. Existing links continue showing current balances and an explicit cancellation after void; revocation immediately prevents subsequent reads. The customer route is `/shared/invoice#<token>`; the fragment is sent only as Authorization to public read-only `GET /api/v1/public/invoice`. Public reads use a restricted projection and no-store/no-referrer/noindex headers, with existing global rate limiting. Owner invoice/payment APIs remain protected. Downloads already saved or reads already in progress cannot be erased by revocation. No payment link, receipt, invoice status or stock movement is created by viewing/downloading.

POST requires a strict boolean `createIfMissing`: true for explicit create, false for copy-only. A stale copy returns409 if the link was revoked, preserving revocation until a new explicit create action. Run `SHARING_TEST_DATABASE_URL=<disposable localhost stock_schema_* URL> npm run test:invoice-sharing` after a backend build; its gateway is a controlled fixture and never contacts Razorpay. Full implementation/evidence: `docs/implementation/public-invoice-sharing.md`.

### Guided Razorpay setup (local implementation)

The setup read `GET /api/v1/razorpay/connections` now adds per-connection `lastWebhook: { receivedAt, event, outcome } | null`, selecting only the latest accepted signed callback from existing owned Test/Live event records. `SYNCED` means processed for a link; `IGNORED` is receipt evidence without invoice changes. Credential command metadata is unchanged. The UI uses the configured API base to display/copy the full endpoint, shows separate setup steps and receipt history, and refreshes application metadata without calling Razorpay. A saved secret or historical callback does not establish current provider configuration or Live settlement readiness. No migration, dependency or environment variable is added. This increment is not deployed yet; [implementation and verification](../docs/implementation/razorpay-guided-setup.md) record its release boundary.
