# Invoiceo

An invoice generator with guest PDF downloads, saved invoices, customer management, and company profiles.

**Stack:** React, TypeScript, Vite, and Tailwind CSS on the frontend; NestJS, Prisma, and PostgreSQL in `backend/`.

## Local development

Install frontend dependencies and start Vite:

```bash
npm install
npm run dev
```

For the API, configure `backend/.env` using `backend/.env.example` and prepare your PostgreSQL database. Then run in a separate terminal:

```bash
cd backend
npm install
npm run db:generate
npm run start:dev
```

## Checks

From the project root, run `npm run build`, `npm test`, or `npm run lint`. Backend documentation is in [backend/README.md](backend/README.md).

## Frontend deployment on Render

Use the existing Render frontend service with the repository root as its root directory:

- Branch: `dev`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Build environment: `VITE_API_BASE_URL=https://invoice-generator-cpn8.onrender.com`

The app appends `/api/v1` to that API origin. Frontend environment variables are embedded during the build. Keep backend credentials in the backend's environment.

For a Render Static Site, configure a [rewrite](https://render.com/docs/redirects-rewrites) from `/*` to `/index.html` so dashboard URLs support direct navigation. The backend's `FRONTEND_URL` must match the frontend origin. This repository cleanup does not change hosting settings or deploy either service.

To inspect a production build locally:

```bash
npm run build
npm run preview
```
