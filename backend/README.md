# Invoiceo API

NestJS 11 / TypeScript / Prisma 7.10.1 / PostgreSQL API for authentication, company profiles, customers, invoice defaults, invoices, and account-owned Products & Services.

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

For a **new empty local database** only:

```sh
npm run db:push
npm run build
npm run start:dev
```

`npm run build` generates the Prisma client before compiling. `PORT` determines the listen port (default 3001); every API route uses `/api/v1`.

Nest CLI and Prisma CLI are development/build dependencies. Install development dependencies before generating/building or running schema checks; production starts the compiled application directly. Keep Prisma CLI/client/adapter versions aligned. Parent-scoped security overrides currently select Multer 2.5.0 for the Nest Express adapter and js-yaml 5.4.1 for Swagger; their rationale, actual resolved versions and regression evidence are in the implementation document. Review/remove each override when its upstream parent declares a patched dependency.

## Existing database upgrades and releases

Read [schema rollout instructions](prisma/updates/README.md) and the [current catalog cutover checklist](../docs/implementation/signed-in-dashboard-features.md#coordinated-catalog-rollout-preparation--3-november-2026) before deployment.

This repository has no baseline Prisma migration history. Existing databases use the reviewed, one-time SQL upgrades in `prisma/updates/`; `npm run db:migrate` does not apply these files. Do not run schema push against an existing pre-catalog database to rename its enum. Do not rerun upgrades after a fresh schema push.

For a native Node service, install with `npm ci --include=dev`, build with `npm run build`, and start with `npm run start:prod`. Set the actual database/authentication/provider configuration in the deployment's secret store. The catalog schema and matching API/frontend must be released in one coordinated window.

For the container:

```sh
docker build -t invoiceo-api:catalog .
```

The image uses Node 22, runs as a non-root user, and defaults to production mode. Build-time client generation uses an inert local URL; no production database credentials are needed to build. Supply the real `DATABASE_URL` and other required environment settings only when running the image. The container readiness probe uses the configured `PORT` and `/api/v1/health/ready`. No automatic database migration runs at build or startup.

The live catalog migration is **on user-directed hold** until matching API/frontend deployment is ready. Preparing an image does not lift that hold.

The current Render native build command must install compiler dependencies explicitly and prune them after compilation: `npm ci --include=dev && npm run build && npm prune --omit=dev`. A production-only `npm install` omits Nest CLI and fails with `nest: not found`. Keep the existing compiled start command; changing this provider setting can trigger deployment, so apply it only during the coordinated rollout.

### API maintenance mode

`MAINTENANCE_MODE` defaults to off when absent or `false`. Set it to `true` and restart/deploy the API to return HTTP 503, `Cache-Control: no-store` and `Retry-After: 60` for business requests before controllers run. CORS still applies. Only GET/HEAD requests to `/api/v1/health/ready`, `/api/v1/health/live`, `/api/v1/docs-json` and `/api/v1/docs-yaml` bypass the gate; requests with other methods do not. Invalid flag values prevent startup.

Use the flag to keep writes blocked while deploying the matching API and migrating the database; wait for the old deployment to drain and verify the gate before changing the live schema. A successful connectivity probe does not prove that the catalog schema is present. Verify the schema and OpenAPI separately, then restart/deploy with the flag `false` to reopen business routes. This switch does not pause external writers or background jobs; the current API has no scheduled database writer. It introduces no secret bypass or public admin control. See the implementation document for the ordered cutover and rollback steps. Enabling maintenance or deploying remains a separately authorized live action.

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
```

The catalog `-- --upgrade` mode requires a disposable database on the previous saved-defaults schema, applies the one-time SQL, and verifies historical fields/totals. Never use these integration scripts against production. See the schema rollout instructions for the upgrade rehearsal.

Useful endpoints:

- `/api/v1/health/ready`: database connectivity readiness.
- `/api/v1/health/live`: process liveness.
- `/api/v1/docs` and `/api/v1/docs-json`: Swagger UI/OpenAPI.
- `/api/v1/catalog`: authenticated catalog API; a successful health probe alone does not verify the catalog schema or account isolation.
