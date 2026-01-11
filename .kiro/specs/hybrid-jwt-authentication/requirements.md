# Requirements Document

## Introduction

This document defines the requirements for implementing a **Hybrid JWT Authentication Pattern** for the electrician invoice application. The system will use JWT access tokens in Authorization headers for API requests and secure HttpOnly cookies for refresh tokens, providing industry-standard security for a Single Page Application (SPA) with a Node.js backend.

## Glossary

- **Access_Token**: Short-lived JWT token used for API authorization, transported via Authorization header
- **Refresh_Token**: Long-lived token stored in HttpOnly cookie, used to obtain new access tokens
- **HttpOnly_Cookie**: Browser cookie that cannot be accessed by JavaScript, protecting against XSS attacks
- **SameSite_Attribute**: Cookie attribute that prevents CSRF attacks by controlling when cookies are sent
- **Token_Rotation**: Security practice of issuing new refresh tokens on each refresh operation
- **XSS**: Cross-Site Scripting attack where malicious scripts are injected into trusted websites
- **CSRF**: Cross-Site Request Forgery attack where unauthorized commands are transmitted from a user the web application trusts
- **Backend_API**: NestJS-based REST API server
- **Frontend_SPA**: React-based Single Page Application
- **Token_Manager**: Frontend service responsible for in-memory token storage and management

## Requirements

### Requirement 1: Access Token Management

**User Story:** As a developer, I want access tokens to be short-lived and stored in memory, so that XSS attack impact is minimized.

#### Acceptance Criteria

1. WHEN a user logs in or registers, THE Backend_API SHALL issue a JWT access token with a 15-minute expiration
2. WHEN the Backend_API issues an access token, THE Backend_API SHALL include user claims (sub, email, displayName) in the JWT payload
3. WHEN the Frontend_SPA receives an access token, THE Token_Manager SHALL store it only in JavaScript memory (not localStorage or sessionStorage)
4. WHEN the Frontend_SPA makes an API request, THE Token_Manager SHALL attach the access token to the Authorization header as "Bearer {token}"
5. WHEN the access token expires, THE Backend_API SHALL return a 401 Unauthorized response

### Requirement 2: Refresh Token Management

**User Story:** As a developer, I want refresh tokens to be stored in secure HttpOnly cookies, so that they are protected from XSS attacks.

#### Acceptance Criteria

1. WHEN a user logs in or registers, THE Backend_API SHALL issue a refresh token with a 7-day expiration
2. WHEN the Backend_API issues a refresh token, THE Backend_API SHALL store it in the database with the user ID and expiration timestamp
3. WHEN the Backend_API sends a refresh token to the client, THE Backend_API SHALL set it as an HttpOnly cookie with Secure and SameSite=Strict attributes
4. WHEN setting the refresh token cookie, THE Backend_API SHALL set the cookie path to "/auth/refresh" to limit exposure
5. WHEN the Frontend_SPA needs to refresh tokens, THE Browser SHALL automatically send the refresh token cookie with the request

### Requirement 3: Login Flow

**User Story:** As a user, I want to log in with my credentials, so that I can access the application securely.

#### Acceptance Criteria

1. WHEN a user submits valid credentials to POST /auth/login, THE Backend_API SHALL authenticate the user and return an access token in the response body
2. WHEN a user submits valid credentials to POST /auth/login, THE Backend_API SHALL set a refresh token as an HttpOnly cookie in the response
3. WHEN the Frontend_SPA receives a successful login response, THE Token_Manager SHALL store the access token in memory
4. WHEN the Frontend_SPA receives a successful login response, THE Frontend_SPA SHALL not attempt to access or store the refresh token cookie
5. WHEN a user submits invalid credentials, THE Backend_API SHALL return a 401 Unauthorized response without setting any cookies

### Requirement 4: Token Refresh Flow

**User Story:** As a user, I want my session to be automatically refreshed, so that I don't have to log in repeatedly during active use.

#### Acceptance Criteria

1. WHEN the Frontend_SPA receives a 401 response from an API call, THE Frontend_SPA SHALL automatically call POST /auth/refresh
2. WHEN POST /auth/refresh is called, THE Backend_API SHALL validate the refresh token from the HttpOnly cookie
3. WHEN the refresh token is valid, THE Backend_API SHALL issue a new access token in the response body and a new refresh token in an HttpOnly cookie
4. WHEN the refresh token is valid, THE Backend_API SHALL invalidate the old refresh token in the database
5. WHEN the refresh token is invalid or expired, THE Backend_API SHALL return a 401 Unauthorized response and clear the refresh token cookie
6. WHEN token refresh succeeds, THE Frontend_SPA SHALL retry the original failed request with the new access token
7. WHEN token refresh fails, THE Frontend_SPA SHALL clear the in-memory access token and redirect the user to the login page

### Requirement 5: Logout Flow

**User Story:** As a user, I want to log out securely, so that my session is properly terminated on both client and server.

#### Acceptance Criteria

1. WHEN a user initiates logout, THE Frontend_SPA SHALL call POST /auth/logout with the access token in the Authorization header
2. WHEN POST /auth/logout is called, THE Backend_API SHALL invalidate all refresh tokens for the user in the database
3. WHEN POST /auth/logout completes, THE Backend_API SHALL clear the refresh token cookie by setting Max-Age=0
4. WHEN logout completes, THE Frontend_SPA SHALL clear the access token from memory
5. WHEN logout completes, THE Frontend_SPA SHALL redirect the user to the login page

### Requirement 6: CSRF Protection

**User Story:** As a security engineer, I want CSRF protection on the refresh endpoint, so that attackers cannot abuse the refresh token cookie.

#### Acceptance Criteria

1. WHEN setting the refresh token cookie, THE Backend_API SHALL set the SameSite attribute to "Strict"
2. WHEN setting the refresh token cookie, THE Backend_API SHALL set the Secure attribute to true (HTTPS only)
3. WHEN setting the refresh token cookie, THE Backend_API SHALL set the HttpOnly attribute to true
4. WHEN setting the refresh token cookie, THE Backend_API SHALL set the Path attribute to "/auth/refresh"
5. WHEN the Backend_API receives a refresh request, THE Backend_API SHALL validate that the request originates from the same site

### Requirement 7: Token Rotation

**User Story:** As a security engineer, I want refresh tokens to be rotated on each use, so that token replay attacks are prevented.

#### Acceptance Criteria

1. WHEN a refresh token is used successfully, THE Backend_API SHALL delete the old refresh token from the database
2. WHEN a refresh token is used successfully, THE Backend_API SHALL generate and store a new refresh token in the database
3. WHEN a refresh token is reused, THE Backend_API SHALL detect the reuse and invalidate all refresh tokens for that user
4. WHEN refresh token reuse is detected, THE Backend_API SHALL log a security warning with user ID and timestamp
5. WHEN refresh token reuse is detected, THE Backend_API SHALL return a 401 Unauthorized response

### Requirement 8: CORS Configuration

**User Story:** As a developer, I want proper CORS configuration, so that the browser sends cookies with cross-origin requests.

#### Acceptance Criteria

1. WHEN configuring CORS, THE Backend_API SHALL set credentials to true
2. WHEN configuring CORS, THE Backend_API SHALL set the allowed origin to the frontend URL from environment configuration
3. WHEN configuring CORS, THE Backend_API SHALL allow the Authorization header in requests
4. WHEN configuring CORS, THE Backend_API SHALL expose the Set-Cookie header in responses
5. WHEN the Frontend_SPA makes API requests, THE Frontend_SPA SHALL set credentials: "include" in fetch/axios configuration

### Requirement 9: Migration from Current Implementation

**User Story:** As a developer, I want to migrate from the current localStorage-based token storage to the hybrid pattern, so that security is improved without breaking existing functionality.

#### Acceptance Criteria

1. WHEN the migration is complete, THE Token_Manager SHALL no longer store tokens in localStorage
2. WHEN the migration is complete, THE Token_Manager SHALL store access tokens only in memory (JavaScript variables)
3. WHEN the migration is complete, THE Backend_API SHALL send refresh tokens only via HttpOnly cookies
4. WHEN the migration is complete, THE Frontend_SPA SHALL remove all refresh token handling from the request body
5. WHEN existing users log in after migration, THE Backend_API SHALL issue tokens using the new hybrid pattern

### Requirement 10: Token Validation

**User Story:** As a developer, I want robust token validation, so that only valid tokens grant access to protected resources.

#### Acceptance Criteria

1. WHEN the Backend_API receives a request with an access token, THE Backend_API SHALL verify the JWT signature using the configured secret
2. WHEN the Backend_API validates an access token, THE Backend_API SHALL check that the token has not expired
3. WHEN the Backend_API validates an access token, THE Backend_API SHALL verify that the user referenced in the token exists in the database
4. WHEN the Backend_API validates a refresh token, THE Backend_API SHALL verify that the token exists in the database and has not expired
5. WHEN token validation fails, THE Backend_API SHALL return a 401 Unauthorized response with a descriptive error message

### Requirement 11: Session Management

**User Story:** As a user, I want my sessions to be managed securely, so that I can maintain multiple active sessions across devices.

#### Acceptance Criteria

1. WHEN a user logs in from multiple devices, THE Backend_API SHALL create separate refresh tokens for each session
2. WHEN a user logs out from one device, THE Backend_API SHALL invalidate only that device's refresh token
3. WHEN a user logs out from all devices, THE Backend_API SHALL invalidate all refresh tokens for that user
4. WHEN a refresh token expires, THE Backend_API SHALL automatically remove it from the database
5. WHEN the Backend_API starts up, THE Backend_API SHALL clean up all expired refresh tokens from the database

### Requirement 12: Error Handling

**User Story:** As a developer, I want comprehensive error handling, so that authentication failures are handled gracefully.

#### Acceptance Criteria

1. WHEN token refresh fails due to network error, THE Frontend_SPA SHALL retry the refresh request up to 2 times with exponential backoff
2. WHEN token refresh fails due to invalid token, THE Frontend_SPA SHALL immediately redirect to login without retrying
3. WHEN the Backend_API encounters a database error during token operations, THE Backend_API SHALL return a 500 Internal Server Error response
4. WHEN the Frontend_SPA is offline and receives a 401 error, THE Frontend_SPA SHALL queue the request for retry when online
5. WHEN authentication errors occur, THE Frontend_SPA SHALL display user-friendly error messages without exposing technical details

### Requirement 13: Observability

**User Story:** As a system administrator, I want authentication events to be logged, so that I can monitor security and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a user logs in successfully, THE Backend_API SHALL log the event with user ID, timestamp, and IP address
2. WHEN a token refresh occurs, THE Backend_API SHALL log the event with user ID and timestamp
3. WHEN a refresh token is reused, THE Backend_API SHALL log a security warning with user ID, token ID, and timestamp
4. WHEN authentication fails, THE Backend_API SHALL log the failure with attempted email and reason
5. WHEN expired tokens are cleaned up, THE Backend_API SHALL log the count of tokens removed
