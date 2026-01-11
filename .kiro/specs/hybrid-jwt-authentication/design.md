# Design Document: Hybrid JWT Authentication

## Overview

This design implements a **Hybrid JWT Authentication Pattern** that combines the security benefits of HttpOnly cookies with the flexibility of bearer token authentication. The system uses:

- **Access tokens**: Short-lived JWT tokens (15 minutes) stored in memory and sent via Authorization headers
- **Refresh tokens**: Long-lived tokens (7 days) stored in HttpOnly cookies and managed server-side

This approach provides defense-in-depth against both XSS and CSRF attacks while maintaining a stateless API design for horizontal scalability.

### Key Design Principles

1. **Defense in Depth**: Multiple layers of security (HttpOnly cookies, SameSite, token rotation, short TTLs)
2. **Separation of Concerns**: Access tokens for authorization, refresh tokens for session continuity
3. **Stateless API**: Access token validation requires no database lookup
4. **Graceful Degradation**: Automatic token refresh with fallback to login
5. **Industry Alignment**: Follows OAuth2/OIDC best practices for SPAs

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Token Manager (Memory)                              │  │
│  │  - Access Token: JWT (15min)                         │  │
│  │  - No Refresh Token Access                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HTTP Client (Axios)                                 │  │
│  │  - Adds Authorization: Bearer <token>                │  │
│  │  - Handles 401 → Refresh Flow                        │  │
│  │  - Credentials: include                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Browser Cookie Store                                │  │
│  │  - refreshToken (HttpOnly, Secure, SameSite=Strict)  │  │
│  │  - Path: /auth/refresh                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (NestJS)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Controller                                     │  │
│  │  - POST /auth/login                                  │  │
│  │  - POST /auth/register                               │  │
│  │  - POST /auth/refresh                                │  │
│  │  - POST /auth/logout                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  JWT Strategy                                        │  │
│  │  - Extract from Authorization header                 │  │
│  │  - Verify signature & expiration                     │  │
│  │  - Load user from payload                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Service                                        │  │
│  │  - Generate JWT access tokens                        │  │
│  │  - Generate & store refresh tokens                   │  │
│  │  - Validate & rotate refresh tokens                  │  │
│  │  - Invalidate tokens on logout                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (PostgreSQL)                               │  │
│  │  - RefreshToken table                                │  │
│  │    * id, userId, token, expiresAt                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow Sequence

#### Login Flow
```
User → Frontend: Submit credentials
Frontend → Backend: POST /auth/login {email, password}
Backend → Database: Validate user
Backend → Backend: Generate access token (JWT)
Backend → Backend: Generate refresh token (random)
Backend → Database: Store refresh token
Backend → Frontend: {accessToken} + Set-Cookie: refreshToken
Frontend → Memory: Store accessToken
Frontend → User: Redirect to dashboard
```

#### API Request Flow
```
Frontend → Memory: Get accessToken
Frontend → Backend: GET /api/resource
                    Authorization: Bearer <accessToken>
Backend → Backend: Verify JWT signature & expiration
Backend → Backend: Extract user from JWT payload
Backend → Frontend: Resource data
```

#### Token Refresh Flow
```
Frontend → Backend: GET /api/resource (with expired token)
Backend → Frontend: 401 Unauthorized
Frontend → Backend: POST /auth/refresh
                    Cookie: refreshToken=<token>
Backend → Database: Validate refresh token
Backend → Database: Delete old refresh token
Backend → Backend: Generate new access token
Backend → Backend: Generate new refresh token
Backend → Database: Store new refresh token
Backend → Frontend: {accessToken} + Set-Cookie: refreshToken
Frontend → Memory: Update accessToken
Frontend → Backend: Retry GET /api/resource
Backend → Frontend: Resource data
```

#### Logout Flow
```
User → Frontend: Click logout
Frontend → Backend: POST /auth/logout
                    Authorization: Bearer <accessToken>
Backend → Database: Delete all user refresh tokens
Backend → Frontend: Set-Cookie: refreshToken=; Max-Age=0
Frontend → Memory: Clear accessToken
Frontend → User: Redirect to login
```

## Components and Interfaces

### Backend Components

#### 1. Auth Controller

**Responsibilities:**
- Handle HTTP requests for authentication endpoints
- Set and clear HttpOnly cookies
- Return access tokens in response bodies

**Endpoints:**

```typescript
// POST /auth/login
interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  user: UserResponseDto
  accessToken: string
  // refreshToken sent via Set-Cookie header
}

// POST /auth/register
interface RegisterRequest {
  email: string
  password: string
  displayName: string
}

interface RegisterResponse {
  user: UserResponseDto
  accessToken: string
  // refreshToken sent via Set-Cookie header
}

// POST /auth/refresh
// No request body - refresh token from cookie
interface RefreshResponse {
  user: UserResponseDto
  accessToken: string
  // new refreshToken sent via Set-Cookie header
}

// POST /auth/logout
// No request body - uses access token from header
interface LogoutResponse {
  message: string
}
```

**Cookie Configuration:**
```typescript
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict' as const,
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
}
```

#### 2. Auth Service

**Responsibilities:**
- Generate and sign JWT access tokens
- Generate and store refresh tokens
- Validate refresh tokens
- Implement token rotation
- Detect and handle token reuse

**Key Methods:**

```typescript
class AuthService {
  // Generate both tokens for a user
  async generateTokens(user: User): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.generateRefreshToken(user)
    return { accessToken, refreshToken }
  }

  // Generate JWT access token
  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    }
    return this.jwtService.sign(payload, {
      expiresIn: '15m',
    })
  }

  // Generate and store refresh token
  private async generateRefreshToken(user: User): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })
    
    return token
  }

  // Validate and rotate refresh token
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken) {
      // Token reuse detected - invalidate all user tokens
      await this.handleTokenReuse(refreshToken)
      throw new UnauthorizedException('Invalid refresh token')
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      })
      throw new UnauthorizedException('Refresh token expired')
    }

    // Delete old token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    })

    // Generate new tokens
    return this.generateTokens(storedToken.user)
  }

  // Handle token reuse (security incident)
  private async handleTokenReuse(token: string): Promise<void> {
    // Log security warning
    this.logger.warn(`Refresh token reuse detected: ${token}`)
    
    // Find and invalidate all tokens for the user
    // (Implementation depends on whether we can identify the user)
  }

  // Invalidate all user tokens
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    })
  }

  // Clean up expired tokens (scheduled task)
  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`)
  }
}
```

#### 3. JWT Strategy

**Responsibilities:**
- Extract JWT from Authorization header
- Verify JWT signature and expiration
- Load user from JWT payload

**Implementation:**

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Note: We could skip the DB lookup for better performance
    // since the JWT already contains user info. However, we
    // validate to ensure the user still exists and is active.
    const user = await this.authService.validateUser(payload)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return user
  }
}
```

#### 4. CORS Configuration

**Configuration:**

```typescript
app.enableCors({
  origin: configService.get<string>('FRONTEND_URL'),
  credentials: true, // Allow cookies
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
})
```

### Frontend Components

#### 1. Token Manager (Refactored)

**Responsibilities:**
- Store access token in memory only
- Provide access token for API requests
- Clear access token on logout
- Never access or store refresh token

**Implementation:**

```typescript
class TokenManager {
  // In-memory storage (not persisted)
  private static accessToken: string | null = null

  // Get access token from memory
  static getAccessToken(): string | null {
    return this.accessToken
  }

  // Set access token in memory
  static setAccessToken(token: string): void {
    this.accessToken = token
  }

  // Clear access token from memory
  static clearAccessToken(): void {
    this.accessToken = null
  }

  // Check if token is expired
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp < Date.now() / 1000
    } catch {
      return true
    }
  }

  // Check if authenticated
  static isAuthenticated(): boolean {
    const token = this.getAccessToken()
    return !!token && !this.isTokenExpired(token)
  }

  // REMOVED: getRefreshToken() - no longer needed
  // REMOVED: setTokens() - refresh token handled by cookie
  // REMOVED: localStorage operations
}
```

#### 2. API Client (Refactored)

**Responsibilities:**
- Add Authorization header with access token
- Handle 401 responses with automatic refresh
- Send cookies with credentials: 'include'
- Retry failed requests after refresh

**Key Changes:**

```typescript
class BaseApiClient {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: ENV.API_BASE_URL,
      withCredentials: true, // Send cookies
      headers: {
        'Content-Type': 'application/json',
      },
    })
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (!config.skipAuth) {
          const token = TokenManager.getAccessToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      }
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Handle 401 with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue request
            return this.queueRequest(originalRequest)
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            // Call refresh endpoint (cookie sent automatically)
            const response = await this.axiosInstance.post(
              '/auth/refresh',
              null,
              { skipAuth: true }
            )

            const { accessToken } = response.data
            TokenManager.setAccessToken(accessToken)

            // Process queued requests
            this.processQueue(null, accessToken)

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return this.axiosInstance(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            this.handleAuthFailure()
            throw refreshError
          } finally {
            this.isRefreshing = false
          }
        }

        throw error
      }
    )
  }
}
```

#### 3. Auth API (Refactored)

**Key Changes:**

```typescript
class AuthApi {
  // Login - receive access token, cookie set automatically
  async login(credentials: LoginDto): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>(
      '/auth/login',
      credentials,
      { skipAuth: true }
    )
    // Store only access token
    TokenManager.setAccessToken(response.accessToken)
    return response
  }

  // Refresh - no body needed, cookie sent automatically
  async refreshToken(): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>(
      '/auth/refresh',
      null, // No body
      { skipAuth: true }
    )
    TokenManager.setAccessToken(response.accessToken)
    return response
  }

  // Logout - cookie cleared by server
  async logout(): Promise<void> {
    await apiClient.post<void>('/auth/logout')
    TokenManager.clearAccessToken()
  }

  // REMOVED: Manual refresh token handling
}
```

#### 4. Auth Hooks (Refactored)

**Key Changes:**

```typescript
// useLogin hook
export function useLogin() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (credentials: LoginDto) => authApi.login(credentials),
    onSuccess: (data: AuthResponseDto) => {
      // Token already stored by authApi.login
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
      cacheService.crossEntity.onLogin()
      success('Welcome back!', `Logged in as ${data.user.displayName}`)
    },
    onError: (err: any) => {
      error('Login failed', 'Please check your credentials')
    },
  })
}

// useRefreshToken hook - simplified
export function useRefreshToken() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authApi.refreshToken(), // No parameter needed
    onSuccess: (data: AuthResponseDto) => {
      // Token already stored by authApi.refreshToken
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.auth.updateProfile(data.user)
    },
    onError: () => {
      TokenManager.clearAccessToken()
      const cacheService = getCacheInvalidationService(queryClient)
      cacheService.crossEntity.onLogout()
      navigate('/login', { replace: true })
    },
    retry: false,
  })
}
```

## Data Models

### Database Schema

#### RefreshToken Table (Existing - No Changes Needed)

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

### JWT Payload

```typescript
interface JwtPayload {
  sub: string        // User ID
  email: string      // User email
  displayName: string // User display name
  iat: number        // Issued at (added by JWT library)
  exp: number        // Expiration (added by JWT library)
}
```

### Token Pair

```typescript
interface TokenPair {
  accessToken: string  // JWT token for Authorization header
  refreshToken: string // Random token for HttpOnly cookie
}
```

## Data Models

### Environment Configuration

**Backend (.env):**
```
JWT_SECRET=<strong-secret-key>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**
```
VITE_API_BASE_URL=http://localhost:3000
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Access Token Properties

**Property 1: Access token expiration time**
*For any* user login or registration, the issued JWT access token should have an expiration time of exactly 15 minutes from the time of issuance.
**Validates: Requirements 1.1**

**Property 2: Access token claims completeness**
*For any* access token issued by the backend, decoding the JWT payload should reveal all required claims: sub (user ID), email, and displayName.
**Validates: Requirements 1.2**

**Property 3: Access token memory-only storage**
*For any* access token stored by the Token Manager, both localStorage and sessionStorage should remain empty (no persistent storage used).
**Validates: Requirements 1.3**

**Property 4: Authorization header format**
*For any* API request made with an access token, the Authorization header should be present and formatted as "Bearer {token}".
**Validates: Requirements 1.4**

**Property 5: Expired token rejection**
*For any* expired access token sent to the backend, the response should be 401 Unauthorized.
**Validates: Requirements 1.5**

### Refresh Token Properties

**Property 6: Refresh token expiration time**
*For any* user login or registration, the refresh token stored in the database should have an expiration time of exactly 7 days from the time of issuance.
**Validates: Requirements 2.1**

**Property 7: Refresh token database storage**
*For any* refresh token issued, a corresponding record should exist in the database with userId, token value, and expiresAt timestamp.
**Validates: Requirements 2.2**

**Property 8: Refresh token cookie attributes**
*For any* refresh token sent to the client, the Set-Cookie header should include all security attributes: HttpOnly, Secure, SameSite=Strict, and Path=/auth/refresh.
**Validates: Requirements 2.3, 2.4, 6.1, 6.2, 6.3, 6.4**

**Property 9: Automatic cookie transmission**
*For any* request to POST /auth/refresh, the browser should automatically include the refresh token cookie in the Cookie header.
**Validates: Requirements 2.5**

### Login Flow Properties

**Property 10: Successful login response**
*For any* valid credentials submitted to POST /auth/login, the response should include an access token in the body and a Set-Cookie header with the refresh token.
**Validates: Requirements 3.1, 3.2**

**Property 11: Login token storage**
*For any* successful login response, the Token Manager should store the access token in memory and make it retrievable via getAccessToken().
**Validates: Requirements 3.3**

**Property 12: No client-side cookie access**
*For any* successful login, the frontend code should not attempt to read or parse document.cookie for the refresh token.
**Validates: Requirements 3.4**

**Property 13: Invalid login response**
*For any* invalid credentials submitted to POST /auth/login, the response should be 401 Unauthorized with no Set-Cookie header present.
**Validates: Requirements 3.5**

### Token Refresh Properties

**Property 14: Automatic refresh on 401**
*For any* 401 Unauthorized response received from an API call, the frontend should automatically trigger a call to POST /auth/refresh.
**Validates: Requirements 4.1**

**Property 15: Refresh token validation**
*For any* request to POST /auth/refresh, the backend should validate the refresh token from the Cookie header before proceeding.
**Validates: Requirements 4.2**

**Property 16: Successful refresh response**
*For any* valid refresh token, the response should include a new access token in the body and a new refresh token in a Set-Cookie header.
**Validates: Requirements 4.3**

**Property 17: Token rotation on refresh**
*For any* successful token refresh, the old refresh token should be deleted from the database and a new one should be created.
**Validates: Requirements 4.4, 7.1, 7.2**

**Property 18: Invalid refresh token response**
*For any* invalid or expired refresh token sent to POST /auth/refresh, the response should be 401 Unauthorized with a Set-Cookie header that clears the cookie (Max-Age=0).
**Validates: Requirements 4.5**

**Property 19: Request retry after refresh**
*For any* successful token refresh triggered by a 401 response, the original failed request should be retried with the new access token.
**Validates: Requirements 4.6**

**Property 20: Refresh failure cleanup**
*For any* failed token refresh attempt, the Token Manager should clear the in-memory access token and the user should be redirected to the login page.
**Validates: Requirements 4.7**

### Logout Flow Properties

**Property 21: Logout request format**
*For any* logout operation, the frontend should call POST /auth/logout with the access token in the Authorization header.
**Validates: Requirements 5.1**

**Property 22: Logout token invalidation**
*For any* POST /auth/logout request, all refresh tokens for that user should be deleted from the database.
**Validates: Requirements 5.2, 11.3**

**Property 23: Logout cookie clearing**
*For any* POST /auth/logout response, the Set-Cookie header should include the refresh token cookie with Max-Age=0.
**Validates: Requirements 5.3**

**Property 24: Logout memory cleanup**
*For any* completed logout operation, calling TokenManager.getAccessToken() should return null.
**Validates: Requirements 5.4**

**Property 25: Logout navigation**
*For any* completed logout operation, the user should be navigated to the /login page.
**Validates: Requirements 5.5**

### Security Properties

**Property 26: Token reuse detection**
*For any* refresh token that is used more than once, the backend should invalidate all refresh tokens for that user and return 401 Unauthorized.
**Validates: Requirements 7.3, 7.5**

**Property 27: Token reuse logging**
*For any* detected refresh token reuse, a security warning should be logged with user ID, token ID, and timestamp.
**Validates: Requirements 7.4, 13.3**

### Token Validation Properties

**Property 28: JWT signature validation**
*For any* access token with an invalid signature, the backend should reject it and return 401 Unauthorized.
**Validates: Requirements 10.1**

**Property 29: Token expiration validation**
*For any* access token that has expired, the backend should reject it and return 401 Unauthorized.
**Validates: Requirements 10.2**

**Property 30: User existence validation**
*For any* access token referencing a non-existent user, the backend should reject it and return 401 Unauthorized.
**Validates: Requirements 10.3**

**Property 31: Refresh token database validation**
*For any* refresh token that doesn't exist in the database or has expired, the backend should reject it and return 401 Unauthorized.
**Validates: Requirements 10.4**

**Property 32: Validation error messages**
*For any* token validation failure, the 401 response should include a descriptive error message.
**Validates: Requirements 10.5**

### Session Management Properties

**Property 33: Multi-device session isolation**
*For any* user logging in from multiple devices, each login should create a separate refresh token in the database.
**Validates: Requirements 11.1**

**Property 34: Single device logout**
*For any* logout operation with a specific refresh token, only that token should be invalidated while other user sessions remain active.
**Validates: Requirements 11.2**

**Property 35: Expired token cleanup**
*For any* refresh token with expiresAt < current time, the cleanup job should remove it from the database.
**Validates: Requirements 11.4**

### Error Handling Properties

**Property 36: Network error retry**
*For any* token refresh that fails due to network error, the frontend should retry up to 2 times with exponential backoff.
**Validates: Requirements 12.1**

**Property 37: Invalid token no retry**
*For any* token refresh that fails with 401 Unauthorized, the frontend should not retry and should immediately redirect to login.
**Validates: Requirements 12.2**

**Property 38: Database error response**
*For any* token operation that encounters a database error, the backend should return 500 Internal Server Error.
**Validates: Requirements 12.3**

**Property 39: Offline request queueing**
*For any* 401 error received while offline, the frontend should queue the request for retry when the connection is restored.
**Validates: Requirements 12.4**

**Property 40: User-friendly error messages**
*For any* authentication error, the frontend should display a user-friendly message without exposing technical implementation details.
**Validates: Requirements 12.5**

### Observability Properties

**Property 41: Login event logging**
*For any* successful login, the backend should create a log entry with user ID, timestamp, and IP address.
**Validates: Requirements 13.1**

**Property 42: Refresh event logging**
*For any* token refresh operation, the backend should create a log entry with user ID and timestamp.
**Validates: Requirements 13.2**

**Property 43: Authentication failure logging**
*For any* failed authentication attempt, the backend should create a log entry with attempted email and failure reason.
**Validates: Requirements 13.4**

**Property 44: Cleanup logging**
*For any* expired token cleanup operation, the backend should log the count of tokens removed.
**Validates: Requirements 13.5**

## Error Handling

### Backend Error Handling

#### Token Validation Errors

```typescript
// Invalid JWT signature
throw new UnauthorizedException('Invalid token signature')

// Expired token
throw new UnauthorizedException('Token has expired')

// User not found
throw new UnauthorizedException('User not found')

// Refresh token not found
throw new UnauthorizedException('Invalid refresh token')

// Refresh token expired
throw new UnauthorizedException('Refresh token expired')

// Token reuse detected
throw new UnauthorizedException('Token reuse detected - all sessions invalidated')
```

#### Database Errors

```typescript
try {
  await this.prisma.refreshToken.create(...)
} catch (error) {
  this.logger.error('Failed to store refresh token', error)
  throw new InternalServerErrorException('Failed to create session')
}
```

#### Cookie Errors

```typescript
// Cookie parsing errors are handled by NestJS middleware
// Invalid cookies result in undefined values, treated as missing tokens
```

### Frontend Error Handling

#### Network Errors

```typescript
// Retry with exponential backoff
const retryDelays = [1000, 2000, 4000] // 1s, 2s, 4s
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    return await apiClient.post('/auth/refresh')
  } catch (error) {
    if (attempt < 2 && isNetworkError(error)) {
      await delay(retryDelays[attempt])
      continue
    }
    throw error
  }
}
```

#### Authentication Errors

```typescript
// 401 errors trigger automatic refresh
if (error.response?.status === 401) {
  if (!originalRequest._retry) {
    originalRequest._retry = true
    try {
      await refreshTokens()
      return axios(originalRequest)
    } catch (refreshError) {
      // Refresh failed - logout
      clearTokens()
      navigate('/login')
      throw refreshError
    }
  }
}
```

#### Offline Handling

```typescript
// Queue requests when offline
if (!navigator.onLine && error.response?.status === 401) {
  return queueForRetry(originalRequest)
}
```

### Error Messages

#### User-Facing Messages

```typescript
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  UNAUTHORIZED: 'You do not have permission to access this resource.',
}
```

#### Developer Messages (Logs)

```typescript
this.logger.error('Token refresh failed', {
  userId: user.id,
  error: error.message,
  stack: error.stack,
})

this.logger.warn('Refresh token reuse detected', {
  userId: user.id,
  tokenId: token.id,
  timestamp: new Date().toISOString(),
})
```

## Testing Strategy

### Dual Testing Approach

This feature will be tested using both **unit tests** and **property-based tests** to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary for comprehensive coverage. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

We will use **fast-check** for TypeScript property-based testing on both frontend and backend.

**Installation:**
```bash
npm install --save-dev fast-check @fast-check/jest
```

**Configuration:**
- Each property test will run a minimum of 100 iterations
- Each test will reference its design document property using a comment tag
- Tag format: `// Feature: hybrid-jwt-authentication, Property {number}: {property_text}`

**Example Property Test:**

```typescript
import fc from 'fast-check'

describe('Token Generation Properties', () => {
  // Feature: hybrid-jwt-authentication, Property 1: Access token expiration time
  it('should generate access tokens with 15-minute expiration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          displayName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (userData) => {
          const user = await createTestUser(userData)
          const { accessToken } = await authService.generateTokens(user)
          
          const decoded = jwt.decode(accessToken) as JwtPayload
          const issuedAt = decoded.iat
          const expiresAt = decoded.exp
          const expectedExpiration = issuedAt + (15 * 60) // 15 minutes
          
          expect(expiresAt).toBe(expectedExpiration)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Unit Testing Strategy

#### Backend Unit Tests

**Auth Service Tests:**
- Token generation with correct expiration times
- Token validation with various invalid inputs
- Token rotation on refresh
- Token reuse detection
- Logout token invalidation
- Expired token cleanup

**Auth Controller Tests:**
- Login endpoint with valid/invalid credentials
- Register endpoint with valid/invalid data
- Refresh endpoint with valid/invalid cookies
- Logout endpoint with token invalidation
- Cookie setting with correct attributes

**JWT Strategy Tests:**
- Token extraction from Authorization header
- Signature verification
- Expiration checking
- User loading from payload

#### Frontend Unit Tests

**Token Manager Tests:**
- Access token storage in memory only
- No localStorage/sessionStorage usage
- Token retrieval and clearing
- Token expiration checking

**API Client Tests:**
- Authorization header attachment
- 401 response handling
- Automatic refresh flow
- Request retry after refresh
- Cookie transmission with credentials

**Auth Hooks Tests:**
- Login mutation with token storage
- Logout mutation with cleanup
- Refresh mutation with error handling
- Auth status computation

### Integration Tests

**End-to-End Authentication Flow:**
1. User registers → tokens issued → cookies set
2. User makes authenticated request → token validated
3. Token expires → 401 received → refresh triggered → new tokens issued
4. User logs out → tokens invalidated → cookies cleared

**Multi-Device Session Management:**
1. User logs in from device A → session A created
2. User logs in from device B → session B created
3. User logs out from device A → only session A invalidated
4. User still authenticated on device B

**Token Reuse Detection:**
1. User logs in → refresh token issued
2. Token is refreshed → old token deleted, new token issued
3. Old token is reused → reuse detected → all sessions invalidated

### Security Testing

**XSS Protection:**
- Verify refresh token is not accessible via JavaScript
- Verify access token is cleared on page reload (memory only)
- Verify no tokens in localStorage/sessionStorage

**CSRF Protection:**
- Verify SameSite=Strict prevents cross-site requests
- Verify refresh endpoint only accepts same-origin requests
- Verify cookie path limits exposure

**Token Validation:**
- Test with tampered JWT signatures
- Test with expired tokens
- Test with tokens for deleted users
- Test with malformed tokens

### Performance Testing

**Token Validation Performance:**
- JWT verification should complete in < 10ms
- No database lookup required for access token validation
- Refresh token lookup should use indexed queries

**Scalability Testing:**
- Horizontal scaling with stateless access tokens
- Database performance with millions of refresh tokens
- Cleanup job performance with large token tables

### Test Coverage Goals

- **Unit test coverage**: > 80% for auth-related code
- **Property test coverage**: All correctness properties implemented
- **Integration test coverage**: All authentication flows
- **Security test coverage**: All attack vectors tested
