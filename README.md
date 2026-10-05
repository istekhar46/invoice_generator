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
