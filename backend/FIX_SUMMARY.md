# Database Connection Issue Fix Summary

## Problem
The application was failing to connect to the PostgreSQL database on login with the error:
```
PrismaClientKnownRequestError:
Can't reach database server at pg-b9c796-invoice-app-db1.i.aivencloud.com
```

## Root Cause
The `prisma/schema.prisma` file was missing the `url` field in the datasource block. Even though the application uses a custom Prisma adapter with SSL configuration (in `PrismaService`), the schema file must still define the `url` field for proper Prisma functionality including:
- Schema generation
- Database introspection
- Migration operations
- Client generation

## Changes Made

### 1. Fixed schema.prisma
**File**: `backend/prisma/schema.prisma`

**Before**:
```prisma
datasource db {
  provider = "postgresql"
}
```

**After**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Added Missing health-check.js
**File**: `backend/health-check.js`

Created the health check script referenced in the Dockerfile but was missing. This script is used by the Docker health check to verify the application is running correctly.

### 3. Created Deployment Guide
**File**: `backend/DEPLOYMENT.md`

Comprehensive guide for configuring environment variables on Render with Aiven PostgreSQL, including:
- Required environment variables
- SSL configuration for Aiven
- Troubleshooting steps
- Security best practices

## Required Environment Variables

For the application to work correctly in production, the following environment variables must be configured on Render:

### Database (Required)
- `DATABASE_URL` - PostgreSQL connection string with `sslmode=require`
- `PG_SSL` - Set to `true` for Aiven databases
- `PG_CA_CERT` - Aiven CA certificate (single line with `\n` instead of newlines)

### JWT (Required)
- `JWT_SECRET` - Strong random secret for access tokens
- `JWT_EXPIRES_IN` - Access token expiration (e.g., `15m`)
- `JWT_REFRESH_SECRET` - Strong random secret for refresh tokens
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (e.g., `7d`)

### Application (Required)
- `PORT` - Application port (e.g., `3001`)
- `NODE_ENV` - Set to `production`
- `FRONTEND_URL` - Frontend application URL for CORS

### Cookies (Required)
- `COOKIE_PATH` - `/api/v1/auth/refresh`
- `COOKIE_SECURE` - `true` for production
- `COOKIE_SAME_SITE` - `lax` or `strict`
- `COOKIE_MAX_AGE` - `604800000` (7 days)

## Deployment Steps

1. **Rebuild the application**:
   ```bash
   cd backend
   npm run build
   ```

   This will regenerate the Prisma client with the updated schema.

2. **Configure environment variables on Render**:
   - Go to your Render service dashboard
   - Navigate to Environment tab
   - Add all required environment variables (see DEPLOYMENT.md for details)
   - **Important**: For `PG_CA_CERT`, copy the Aiven CA certificate and replace all newlines with `\n`

3. **Deploy to Render**:
   - Push the changes to your repository
   - Render will automatically build and deploy
   - Monitor the logs to ensure the database connection succeeds

4. **Verify the deployment**:
   - Check health endpoint: `https://your-app.onrender.com/api/v1/health`
   - Test login with valid credentials
   - Check for any errors in Render logs

## Troubleshooting

If you still encounter database connection errors after applying these fixes:

1. **Verify DATABASE_URL format**:
   - Must include `?sslmode=require` at the end
   - Example: `postgresql://user:pass@host:port/db?sslmode=require`

2. **Check SSL configuration**:
   - Ensure `PG_SSL=true` is set
   - Verify `PG_CA_CERT` is properly formatted as a single line

3. **Get fresh CA certificate from Aiven**:
   - Go to your Aiven service page
   - Copy the latest CA certificate
   - Update the `PG_CA_CERT` environment variable

4. **Test connection locally**:
   ```bash
   psql "$DATABASE_URL"
   ```

5. **Check Render logs**:
   - Look for detailed error messages
   - Verify environment variables are being loaded correctly

## Additional Notes

- The `PrismaService` in `src/database/prisma.service.ts` is correctly configured with SSL support for Aiven databases
- The custom adapter approach used is the recommended way to connect to Aiven PostgreSQL with SSL
- After these fixes, the build script `npm run build` will automatically regenerate the Prisma client
- The health-check.js script ensures the Docker container health monitoring works correctly

## Related Files

- `backend/prisma/schema.prisma` - Fixed datasource configuration
- `backend/src/database/prisma.service.ts` - Prisma client with SSL configuration
- `backend/health-check.js` - Health check script (newly added)
- `backend/DEPLOYMENT.md` - Complete deployment guide (newly added)
- `backend/.env.example` - Environment variable reference
