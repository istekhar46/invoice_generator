# Implementation Plan: Hybrid JWT Authentication

## Overview

This implementation plan converts the hybrid JWT authentication design into discrete coding tasks. The approach follows a phased migration strategy to minimize risk:

1. **Phase 1**: Backend cookie infrastructure
2. **Phase 2**: Frontend token manager refactoring
3. **Phase 3**: Integration and migration
4. **Phase 4**: Security hardening and testing

Each task builds incrementally, ensuring the system remains functional throughout the migration.

## Tasks

- [x] 1. Backend: Implement refresh token cookie infrastructure
  - Modify AuthController to set HttpOnly cookies for refresh tokens
  - Update cookie configuration with security attributes (HttpOnly, Secure, SameSite=Strict, Path=/auth/refresh)
  - Ensure CORS configuration includes credentials: true
  - _Requirements: 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 8.1_

- [ ]* 1.1 Write property test for refresh token cookie attributes
  - **Property 8: Refresh token cookie attributes**
  - **Validates: Requirements 2.3, 2.4, 6.1, 6.2, 6.3, 6.4**

- [x] 2. Backend: Refactor refresh endpoint to read token from cookie
  - Modify POST /auth/refresh to extract refresh token from Cookie header instead of request body
  - Update RefreshTokenDto to make refreshToken optional (for backward compatibility during migration)
  - Add cookie parsing logic to extract refresh token value
  - _Requirements: 4.2, 9.3_

- [ ]* 2.1 Write property test for refresh token validation from cookie
  - **Property 15: Refresh token validation**
  - **Validates: Requirements 4.2**

- [x] 3. Backend: Update login and register endpoints to set refresh token cookies
  - Modify POST /auth/login to set refresh token as HttpOnly cookie in response
  - Modify POST /auth/register to set refresh token as HttpOnly cookie in response
  - Keep refresh token in response body temporarily for backward compatibility
  - _Requirements: 3.2, 9.5_

- [ ]* 3.1 Write property test for login response with cookie
  - **Property 10: Successful login response**
  - **Validates: Requirements 3.1, 3.2**

- [x] 4. Backend: Update logout endpoint to clear refresh token cookie
  - Modify POST /auth/logout to set refresh token cookie with Max-Age=0
  - Ensure all user refresh tokens are invalidated in database
  - _Requirements: 5.2, 5.3_

- [ ]* 4.1 Write property test for logout cookie clearing
  - **Property 23: Logout cookie clearing**
  - **Validates: Requirements 5.3**

- [x] 5. Backend: Implement token rotation on refresh
  - Ensure old refresh token is deleted from database before issuing new one
  - Generate new refresh token and store in database
  - Set new refresh token as HttpOnly cookie in response
  - _Requirements: 4.4, 7.1, 7.2_

- [ ]* 5.1 Write property test for token rotation
  - **Property 17: Token rotation on refresh**
  - **Validates: Requirements 4.4, 7.1, 7.2**

- [x] 6. Backend: Implement refresh token reuse detection
  - Add logic to detect when a deleted refresh token is reused
  - Invalidate all user refresh tokens when reuse is detected
  - Log security warning with user ID, token ID, and timestamp
  - Return 401 Unauthorized on reuse
  - _Requirements: 7.3, 7.4, 7.5_

- [ ]* 6.1 Write property test for token reuse detection
  - **Property 26: Token reuse detection**
  - **Validates: Requirements 7.3, 7.5**

- [ ]* 6.2 Write property test for token reuse logging
  - **Property 27: Token reuse logging**
  - **Validates: Requirements 7.4, 13.3**

- [x] 7. Backend: Add comprehensive logging for authentication events
  - Log successful logins with user ID, timestamp, and IP address
  - Log token refresh operations with user ID and timestamp
  - Log authentication failures with attempted email and reason
  - Log expired token cleanup with count of tokens removed
  - _Requirements: 13.1, 13.2, 13.4, 13.5_

- [ ]* 7.1 Write property test for login event logging
  - **Property 41: Login event logging**
  - **Validates: Requirements 13.1**

- [ ]* 7.2 Write property test for authentication failure logging
  - **Property 43: Authentication failure logging**
  - **Validates: Requirements 13.4**

- [x] 8. Backend: Update CORS configuration for cookie support
  - Set credentials: true in CORS configuration
  - Set allowed origin to FRONTEND_URL from environment
  - Add Authorization to allowedHeaders
  - Add Set-Cookie to exposedHeaders
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. Checkpoint - Backend cookie infrastructure complete
  - Ensure all backend tests pass
  - Verify cookies are set correctly in responses
  - Verify CORS configuration allows credentials
  - Ask the user if questions arise

- [ ] 10. Frontend: Refactor TokenManager to use memory-only storage
  - Remove all localStorage operations from TokenManager
  - Store access token in private class variable (memory only)
  - Remove getRefreshToken() method (no longer needed)
  - Remove setTokens() method, replace with setAccessToken()
  - Update clearTokens() to clearAccessToken()
  - _Requirements: 1.3, 9.1, 9.2_

- [ ]* 10.1 Write property test for memory-only storage
  - **Property 3: Access token memory-only storage**
  - **Validates: Requirements 1.3**

- [ ] 11. Frontend: Update API client to send cookies with requests
  - Set withCredentials: true in axios configuration
  - Ensure Authorization header is still added for access tokens
  - Update request interceptor to handle memory-based token storage
  - _Requirements: 8.5_

- [ ]* 11.1 Write property test for Authorization header format
  - **Property 4: Authorization header format**
  - **Validates: Requirements 1.4**

- [ ] 12. Frontend: Refactor refresh flow to use cookie-based refresh tokens
  - Update POST /auth/refresh call to send no request body
  - Rely on browser to automatically send refresh token cookie
  - Update response handling to store only access token in memory
  - Remove manual refresh token handling from request body
  - _Requirements: 4.1, 9.4_

- [ ]* 12.1 Write property test for automatic refresh on 401
  - **Property 14: Automatic refresh on 401**
  - **Validates: Requirements 4.1**

- [ ]* 12.2 Write property test for request retry after refresh
  - **Property 19: Request retry after refresh**
  - **Validates: Requirements 4.6**

- [ ] 13. Frontend: Update login flow to use cookie-based refresh tokens
  - Update login response handling to store only access token in memory
  - Remove manual refresh token storage from login flow
  - Verify browser automatically stores refresh token cookie
  - _Requirements: 3.3, 3.4_

- [ ]* 13.1 Write property test for login token storage
  - **Property 11: Login token storage**
  - **Validates: Requirements 3.3**

- [ ]* 13.2 Write property test for no client-side cookie access
  - **Property 12: No client-side cookie access**
  - **Validates: Requirements 3.4**

- [ ] 14. Frontend: Update logout flow to clear memory-only tokens
  - Update logout to call POST /auth/logout (cookie cleared by server)
  - Clear access token from memory using clearAccessToken()
  - Ensure navigation to login page after logout
  - _Requirements: 5.1, 5.4, 5.5_

- [ ]* 14.1 Write property test for logout memory cleanup
  - **Property 24: Logout memory cleanup**
  - **Validates: Requirements 5.4**

- [ ]* 14.2 Write property test for logout navigation
  - **Property 25: Logout navigation**
  - **Validates: Requirements 5.5**

- [ ] 15. Frontend: Update auth hooks to use refactored TokenManager
  - Update useLogin to use setAccessToken() instead of setTokens()
  - Update useLogout to use clearAccessToken() instead of clearTokens()
  - Update useRefreshToken to call refresh endpoint without body
  - Update useAuthStatus to check memory-only token
  - _Requirements: 3.3, 5.4_

- [ ] 16. Frontend: Implement retry logic for network errors during refresh
  - Add exponential backoff retry for network errors (up to 2 retries)
  - Skip retry for 401 errors (invalid token)
  - Redirect to login immediately on invalid token
  - _Requirements: 12.1, 12.2_

- [ ]* 16.1 Write property test for network error retry
  - **Property 36: Network error retry**
  - **Validates: Requirements 12.1**

- [ ]* 16.2 Write property test for invalid token no retry
  - **Property 37: Invalid token no retry**
  - **Validates: Requirements 12.2**

- [ ] 17. Frontend: Implement offline request queueing for 401 errors
  - Queue requests that fail with 401 while offline
  - Retry queued requests when connection is restored
  - Integrate with existing offline queue service
  - _Requirements: 12.4_

- [ ]* 17.1 Write property test for offline request queueing
  - **Property 39: Offline request queueing**
  - **Validates: Requirements 12.4**

- [ ] 18. Frontend: Update error messages to be user-friendly
  - Replace technical error messages with user-friendly alternatives
  - Ensure no technical details are exposed in UI
  - Map error types to appropriate user messages
  - _Requirements: 12.5_

- [ ]* 18.1 Write property test for user-friendly error messages
  - **Property 40: User-friendly error messages**
  - **Validates: Requirements 12.5**

- [ ] 19. Checkpoint - Frontend refactoring complete
  - Ensure all frontend tests pass
  - Verify tokens are stored in memory only
  - Verify cookies are sent automatically with requests
  - Verify refresh flow works with cookies
  - Ask the user if questions arise

- [ ] 20. Backend: Remove refresh token from response body (breaking change)
  - Remove refreshToken field from AuthResponseDto
  - Update login, register, and refresh endpoints to not return refresh token in body
  - This completes the migration to cookie-only refresh tokens
  - _Requirements: 9.3_

- [ ] 21. Frontend: Remove backward compatibility code
  - Remove any remaining references to refresh token in request bodies
  - Remove old localStorage-based token storage code
  - Clean up deprecated methods in TokenManager
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 22. Backend: Add unit tests for token validation
  - Test JWT signature validation with invalid signatures
  - Test token expiration validation with expired tokens
  - Test user existence validation with non-existent users
  - Test refresh token database validation with invalid tokens
  - Test validation error messages
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 22.1 Write property test for JWT signature validation
  - **Property 28: JWT signature validation**
  - **Validates: Requirements 10.1**

- [ ]* 22.2 Write property test for token expiration validation
  - **Property 29: Token expiration validation**
  - **Validates: Requirements 10.2**

- [ ]* 22.3 Write property test for user existence validation
  - **Property 30: User existence validation**
  - **Validates: Requirements 10.3**

- [ ]* 22.4 Write property test for refresh token database validation
  - **Property 31: Refresh token database validation**
  - **Validates: Requirements 10.4**

- [ ] 23. Backend: Add unit tests for session management
  - Test multi-device session creation
  - Test single device logout (selective invalidation)
  - Test logout from all devices
  - Test expired token cleanup
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 23.1 Write property test for multi-device session isolation
  - **Property 33: Multi-device session isolation**
  - **Validates: Requirements 11.1**

- [ ]* 23.2 Write property test for single device logout
  - **Property 34: Single device logout**
  - **Validates: Requirements 11.2**

- [ ] 24. Backend: Implement scheduled cleanup job for expired tokens
  - Create a scheduled task to run cleanup on startup
  - Create a scheduled task to run cleanup periodically (e.g., daily)
  - Log the count of tokens removed
  - _Requirements: 11.4, 11.5_

- [ ]* 24.1 Write property test for expired token cleanup
  - **Property 35: Expired token cleanup**
  - **Validates: Requirements 11.4**

- [ ] 25. Integration: Write end-to-end authentication flow tests
  - Test complete registration → login → authenticated request → logout flow
  - Test token expiration → automatic refresh → request retry flow
  - Test multi-device session management
  - Test token reuse detection and invalidation
  - _Requirements: All_

- [ ]* 25.1 Write integration test for complete auth flow
  - Test registration, login, authenticated requests, and logout
  - Verify tokens are issued and validated correctly
  - Verify cookies are set and cleared appropriately

- [ ]* 25.2 Write integration test for token refresh flow
  - Test automatic refresh on 401
  - Test request retry after refresh
  - Test token rotation

- [ ]* 25.3 Write integration test for multi-device sessions
  - Test login from multiple devices
  - Test selective logout
  - Test logout from all devices

- [ ] 26. Security: Perform security testing
  - Test XSS protection (verify refresh token not accessible via JavaScript)
  - Test CSRF protection (verify SameSite=Strict prevents cross-site requests)
  - Test token tampering (verify invalid signatures are rejected)
  - Test token replay (verify token reuse is detected)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3, 10.1_

- [ ]* 26.1 Write security test for XSS protection
  - Verify refresh token is not accessible via document.cookie
  - Verify access token is cleared on page reload

- [ ]* 26.2 Write security test for CSRF protection
  - Verify SameSite=Strict prevents cross-site requests
  - Verify refresh endpoint only accepts same-origin requests

- [ ] 27. Documentation: Update API documentation
  - Document new cookie-based authentication flow
  - Update endpoint documentation for login, register, refresh, logout
  - Document cookie attributes and security considerations
  - Add migration guide for existing clients

- [ ] 28. Final checkpoint - Complete implementation
  - Ensure all tests pass (unit, property, integration, security)
  - Verify no tokens in localStorage/sessionStorage
  - Verify cookies are set with correct security attributes
  - Verify automatic refresh flow works correctly
  - Verify multi-device session management works
  - Verify token reuse detection works
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The migration is designed to be backward compatible until task 20
- Security testing is critical and should not be skipped
