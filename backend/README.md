# Invoice Backend API

A comprehensive NestJS backend API for the Electrician Invoice Generation Web Application. This backend provides secure authentication, user management, and full CRUD operations for company profiles, customers, and invoices.

## Features

- 🔐 JWT-based authentication with Google OAuth integration
- 👤 User profile management
- 🏢 Company profile management with logo upload
- 👥 Customer management with search and pagination
- 📄 Invoice management with automatic calculations
- 🗄️ PostgreSQL database with Prisma ORM
- 🔒 Comprehensive security measures (CORS, rate limiting, input validation)
- 📚 Swagger/OpenAPI documentation
- 🐳 Docker support for development and production
- ✅ Comprehensive testing with property-based tests
- 🚀 Latest NestJS v11+ with TypeScript 5.9+

## Tech Stack

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20 LTS
- **Database**: PostgreSQL 16
- **ORM**: Prisma 7.x
- **Authentication**: JWT + Passport + Google OAuth 2.0
- **Validation**: class-validator + class-transformer
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate limiting
- **Testing**: Jest + fast-check (property-based testing)
- **Documentation**: Swagger/OpenAPI
- **Code Quality**: ESLint + Prettier + TypeScript strict mode

## Prerequisites

- Node.js 20+ (LTS recommended)
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker)

## Quick Start

1. **Clone and setup**
   ```bash
   cd backend
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start database**
   ```bash
   npm run docker:up
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3001`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 15m |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `API_DEV_SERVER_URL` | Development server URL for Swagger docs | http://localhost:{PORT} |
| `API_PROD_SERVER_URL` | Production server URL for Swagger docs | https://api.example.com |

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3001/api/docs`
- OpenAPI JSON: `http://localhost:3001/api/docs-json`

## Database Management

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Reset database (development only)
npm run db:migrate:reset

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed

# Format Prisma schema
npm run db:format
```

## Development

```bash
# Start development server with hot reload
npm run start:dev

# Start with debugging
npm run start:debug

# Build for production
npm run build

# Start production server
npm run start:prod
```

## Code Quality

```bash
# Lint code
npm run lint

# Check linting without fixing
npm run lint:check

# Format code
npm run format

# Check formatting
npm run format:check

# Run all quality checks
npm run precommit
```

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e

# E2E tests with coverage
npm run test:e2e:cov

# Debug tests
npm run test:debug
```

## Docker

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Clean up (remove volumes)
npm run docker:clean

# Build production image
docker build -t invoice-backend .
```

## Project Structure

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication
│   ├── users/        # User management
│   ├── company/      # Company profiles
│   ├── customers/    # Customer management
│   └── invoices/     # Invoice management
├── common/           # Shared utilities
├── config/           # Configuration
├── database/         # Database module
└── main.ts          # Application entry point
```

## Security Features

- JWT authentication with refresh tokens
- Google OAuth 2.0 integration
- Password hashing with bcrypt (12 rounds)
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Security headers with Helmet
- User data isolation
- SQL injection protection via Prisma

## Performance Features

- Database connection pooling
- Optimized Docker multi-stage builds
- Efficient TypeScript compilation
- Jest test parallelization
- Prisma query optimization

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation
4. Ensure all quality checks pass (`npm run precommit`)

## Version Requirements

- Node.js: 20.x LTS
- PostgreSQL: 16.x
- NestJS: 11.x
- Prisma: 7.x
- TypeScript: 5.9+

## License

This project is licensed under the UNLICENSED license.