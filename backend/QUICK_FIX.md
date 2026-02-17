# Quick Fix for Database Connection Error

## Immediate Action Required

Your production application on Render is experiencing database connection errors because the Prisma schema was missing the database URL configuration. This has been fixed.

## What Was Fixed

✅ Added `url = env("DATABASE_URL")` to `prisma/schema.prisma`
✅ Created missing `health-check.js` file for Docker health checks
✅ Created deployment guide and fix summary documentation

## What You Need to Do

### 1. Pull the Latest Changes
```bash
git pull origin your-branch
cd backend
```

### 2. Rebuild the Application
```bash
npm run build
```

This will regenerate the Prisma client with the updated schema.

### 3. Verify Environment Variables on Render

Go to your Render service dashboard → Environment tab and ensure these are set:

**Critical - Database:**
- ✅ `DATABASE_URL` - Must include `?sslmode=require` at the end
- ✅ `PG_SSL` - Set to `true`
- ✅ `PG_CA_CERT` - Aiven CA certificate as single line with `\n`

**Required - JWT:**
- ✅ `JWT_SECRET` - Strong random secret
- ✅ `JWT_REFRESH_SECRET` - Strong random secret

**Required - App:**
- ✅ `NODE_ENV` - Set to `production`
- ✅ `PORT` - Set to `3001`
- ✅ `FRONTEND_URL` - Your frontend URL

### 4. Get Aiven CA Certificate

1. Go to your Aiven PostgreSQL service page
2. Find "CA Certificate" in Service URI section
3. Copy the certificate
4. Replace all newlines with `\n` (e.g., `-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----`)
5. Set as `PG_CA_CERT` environment variable

### 5. Deploy to Render

```bash
git add .
git commit -m "fix: add DATABASE_URL to Prisma schema and fix database connection"
git push
```

Render will automatically build and deploy.

### 6. Verify the Fix

After deployment:
```bash
# Check health endpoint
curl https://your-app.onrender.com/api/v1/health

# Should return: {"status":"ok","timestamp":"..."}
```

Check Render logs - you should see:
```
Successfully connected to database
```

## Still Having Issues?

See `DEPLOYMENT.md` for detailed troubleshooting steps.

## Common Mistakes

❌ Missing `?sslmode=require` in DATABASE_URL
❌ Not formatting PG_CA_CERT as a single line (must use `\n` instead of actual newlines)
❌ Forgetting to set `PG_SSL=true`
❌ Not rebuilding after schema changes (Prisma client must be regenerated)

## Example DATABASE_URL Format

```
postgresql://avnadmin:yourpassword@pg-b9c796-invoice-app-db1.i.aivencloud.com:25432/defaultdb?sslmode=require
```

## Example PG_CA_CERT Format

```
-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----
```

Note: This should be ONE LINE with `\n` replacing newlines.
