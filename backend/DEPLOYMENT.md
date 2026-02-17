# Production Deployment Guide

## Environment Variables Configuration for Render + Aiven PostgreSQL

This guide explains how to configure the required environment variables for deploying the backend application on Render with an Aiven PostgreSQL database.

### Required Environment Variables

#### Database Configuration

1. **DATABASE_URL**
   - **Source**: Get this from your Aiven PostgreSQL service details
   - **Format**: `postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require`
   - **Example**: `postgresql://avnadmin:password@pg-b9c796-invoice-app-db1.i.aivencloud.com:25432/defaultdb?sslmode=require`
   - **Note**: Always include `sslmode=require` for Aiven databases

2. **PG_SSL**
   - **Value**: `true` (required for Aiven PostgreSQL)
   - **Purpose**: Enables SSL connection to the database

3. **PG_CA_CERT**
   - **Source**: Get this from your Aiven PostgreSQL service page (Service URI section → CA Certificate)
   - **Format**: The entire certificate content as a single string, with newlines replaced by `\n`
   - **Example**: `-----BEGIN CERTIFICATE-----\nMIIBIjANBgkq...\n-----END CERTIFICATE-----`
   - **How to format**:
     1. Copy the CA certificate from Aiven
     2. Replace all newline characters with `\n`
     3. Paste as a single line in Render's environment variable

#### JWT Configuration

4. **JWT_SECRET**
   - **Value**: Generate a strong random secret (at least 32 characters)
   - **Example**: Use `openssl rand -base64 32` to generate
   - **Purpose**: Used to sign JWT access tokens

5. **JWT_EXPIRES_IN**
   - **Value**: `15m` (recommended)
   - **Purpose**: Access token expiration time

6. **JWT_REFRESH_SECRET**
   - **Value**: Generate a different strong random secret
   - **Example**: Use `openssl rand -base64 32` to generate
   - **Purpose**: Used to sign JWT refresh tokens

7. **JWT_REFRESH_EXPIRES_IN**
   - **Value**: `7d` (recommended)
   - **Purpose**: Refresh token expiration time

#### Google OAuth (Optional - required if using Google login)

8. **GOOGLE_CLIENT_ID**
   - **Source**: Google Cloud Console → OAuth 2.0 Client IDs
   - **Purpose**: Google OAuth client ID

9. **GOOGLE_CLIENT_SECRET**
   - **Source**: Google Cloud Console → OAuth 2.0 Client IDs
   - **Purpose**: Google OAuth client secret

10. **GOOGLE_CALLBACK_URL**
    - **Value**: `https://[your-render-app-url].onrender.com/api/v1/auth/google/callback`
    - **Purpose**: OAuth callback URL (must match exactly what's configured in Google Cloud Console)

#### Application Configuration

11. **PORT**
    - **Value**: `3001` (or as configured in your service)
    - **Purpose**: Application port

12. **NODE_ENV**
    - **Value**: `production`
    - **Purpose**: Environment mode

#### CORS Configuration

13. **FRONTEND_URL**
    - **Value**: Your frontend application URL
    - **Example**: `https://[your-frontend-app].onrender.com`
    - **Purpose**: Allowed origin for CORS

#### Cookie Configuration

14. **COOKIE_PATH**
    - **Value**: `/api/v1/auth/refresh`
    - **Purpose**: Path for the refresh token cookie

15. **COOKIE_SECURE**
    - **Value**: `true` (for production with HTTPS)
    - **Purpose**: Ensures cookies are only sent over HTTPS

16. **COOKIE_SAME_SITE**
    - **Value**: `lax` or `strict`
    - **Purpose**: CSRF protection for cookies

17. **COOKIE_MAX_AGE**
    - **Value**: `604800000` (7 days in milliseconds)
    - **Purpose**: Cookie expiration time

#### Rate Limiting Configuration

18. **THROTTLE_TTL**
    - **Value**: `60` (seconds)
    - **Purpose**: Time window for rate limiting

19. **THROTTLE_LIMIT**
    - **Value**: `100`
    - **Purpose**: Maximum requests per time window

#### API Documentation Configuration

20. **API_PROD_SERVER_URL**
    - **Value**: `https://[your-api-app].onrender.com`
    - **Purpose**: Production API server URL for Swagger documentation

## Setting Up Environment Variables on Render

1. Go to your Render service dashboard
2. Navigate to "Environment" tab
3. Add all the required environment variables listed above
4. Make sure to include `sslmode=require` in your DATABASE_URL
5. For PG_CA_CERT, format the certificate as a single line with `\n` instead of newlines

## Troubleshooting Database Connection Issues

If you see "Can't reach database server" errors:

1. **Verify DATABASE_URL format**:
   - Ensure it includes `sslmode=require`
   - Check that all credentials are correct
   - Verify the host and port match Aiven service details

2. **Check SSL configuration**:
   - Ensure `PG_SSL=true` is set
   - Verify `PG_CA_CERT` is properly formatted (single line with `\n`)
   - Get the latest CA certificate from Aiven if connection fails

3. **Verify Aiven service status**:
   - Check that your Aiven PostgreSQL service is running
   - Verify there are no service suspensions or issues

4. **Test the connection string**:
   - Use `psql` or a database client to test the connection string locally
   - Ensure all parameters are correct

5. **Check Render logs**:
   - Look for detailed error messages in Render service logs
   - Verify environment variables are being loaded correctly

## Testing the Deployment

After deployment:

1. Check the health endpoint: `https://[your-app].onrender.com/api/v1/health`
2. Access Swagger docs: `https://[your-app].onrender.com/api/v1/docs`
3. Test login endpoint with valid credentials
4. Verify database operations work correctly

## Security Best Practices

1. **Never commit environment variables to Git** - use `.env` for local development only
2. **Generate strong secrets** for JWT_SECRET and JWT_REFRESH_SECRET
3. **Rotate secrets periodically** - especially if they might have been exposed
4. **Use HTTPS** in production - set `COOKIE_SECURE=true`
5. **Keep dependencies updated** - run `npm audit` regularly
6. **Monitor logs** - set up log aggregation and monitoring
7. **Use environment-specific configs** - different settings for dev/staging/production
