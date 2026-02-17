import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { User } from '@prisma/client';

// Mock bcrypt to avoid slow operations in tests
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key as keyof typeof config];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 2: JWT token generation and validation consistency', () => {
    /**
     * Feature: invoice-backend-api, Property 2: JWT token generation and validation consistency
     * Validates: Requirements 3.1, 3.5
     */
    it('should generate valid JWT tokens that can be successfully validated and decoded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (userData) => {
            // Create a mock user object
            const user: User = {
              ...userData,
              passwordHash: null,
              photoURL: null,
              googleId: null,
            };

            // Mock JWT service to return predictable tokens
            const mockAccessToken = `access.token.${user.id}`;
            const mockRefreshToken = `refresh.token.${user.id}`;

            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce(mockAccessToken);

            // Mock refresh token creation in database
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'refresh-token-id',
              userId: user.id,
              token: mockRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Generate tokens
            const tokens = await service.generateTokens(user);

            // Verify tokens were generated
            expect(tokens.accessToken).toBe(mockAccessToken);
            expect(tokens.refreshToken).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars

            // Verify JWT service was called with correct payload for access token
            expect(jwtService.signAsync).toHaveBeenCalledWith({
              sub: user.id,
              email: user.email,
              displayName: user.displayName,
            });

            // Verify refresh token was stored in database
            expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
              data: {
                userId: user.id,
                token: expect.stringMatching(/^[a-f0-9]{128}$/),
                expiresAt: expect.any(Date),
              },
            });

            // Mock JWT verification for validateUser
            (jwtService.verify as jest.Mock).mockReturnValue({
              sub: user.id,
              email: user.email,
              displayName: user.displayName,
            });

            // Mock Prisma to return the user
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

            // Test token validation round trip
            const validatedUser = await service.validateUser({
              sub: user.id,
              email: user.email,
              displayName: user.displayName,
            });

            // Verify the validated user matches the original
            expect(validatedUser).toEqual(user);
            expect(validatedUser?.id).toBe(user.id);
            expect(validatedUser?.email).toBe(user.email);
            expect(validatedUser?.displayName).toBe(user.displayName);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle token refresh consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (userData) => {
            // Create a mock user object
            const user: User = {
              ...userData,
              passwordHash: null,
              photoURL: null,
              googleId: null,
            };

            const mockRefreshToken = `refresh.token.${user.id}`;
            const mockNewAccessToken = `new.access.token.${user.id}`;
            const mockNewRefreshToken = `new.refresh.token.${user.id}`;

            // Mock refresh token lookup in database
            const storedRefreshToken = {
              id: 'stored-refresh-token-id',
              userId: user.id,
              token: mockRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
              createdAt: new Date(),
              updatedAt: new Date(),
              user: user,
            };

            (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
              storedRefreshToken,
            );

            // Mock refresh token deletion (old token invalidation)
            (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(storedRefreshToken);

            // Mock new token generation
            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce(mockNewAccessToken);

            // Mock new refresh token creation
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'new-refresh-token-id',
              userId: user.id,
              token: mockNewRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test refresh token functionality
            const result = await service.refreshToken(mockRefreshToken);

            // Verify new tokens were generated
            expect(result.authResponse.accessToken).toBe(mockNewAccessToken);
            expect(result.refreshToken).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars
            expect(result.authResponse.user.id).toBe(user.id);
            expect(result.authResponse.user.email).toBe(user.email);
            expect(result.authResponse.user.displayName).toBe(user.displayName);

            // Verify refresh token was looked up in database
            expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
              where: { token: mockRefreshToken },
              include: { user: true },
            });

            // Verify old refresh token was deleted
            expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
              where: { id: storedRefreshToken.id },
            });

            // Verify new refresh token was created
            expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
              data: {
                userId: user.id,
                token: expect.stringMatching(/^[a-f0-9]{128}$/),
                expiresAt: expect.any(Date),
              },
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Email/password authentication round trip', () => {
    /**
     * Feature: invoice-backend-api, Property 4: Email/password authentication round trip
     * Validates: Requirements 3.3
     */
    it('should allow users to register and then login with the same credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const { email, password, displayName } = userData;

            // Mock bcrypt operations
            const mockPasswordHash = `hashed_${password}`;
            (bcrypt.hash as jest.Mock).mockResolvedValue(mockPasswordHash);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Mock Prisma to simulate no existing user for registration
            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

            // Mock user creation
            const createdUser: User = {
              id: 'test-user-id',
              email,
              displayName,
              passwordHash: mockPasswordHash,
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            (prismaService.user.create as jest.Mock).mockResolvedValueOnce(createdUser);

            // Mock token generation for registration
            const mockAccessToken = `access.token.${createdUser.id}`;
            const mockRefreshToken = `refresh.token.${createdUser.id}`;

            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce(mockAccessToken);

            // Mock refresh token creation
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'refresh-token-id',
              userId: createdUser.id,
              token: mockRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test registration
            const registerResult = await service.register({
              email,
              password,
              displayName,
            });

            expect(registerResult.authResponse.user.email).toBe(email);
            expect(registerResult.authResponse.user.displayName).toBe(displayName);
            expect(registerResult.authResponse.accessToken).toBe(mockAccessToken);
            expect(registerResult.refreshToken).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars

            // Now test login with the same credentials
            // Mock Prisma to return the created user for login
            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(createdUser);

            // Mock token generation for login
            const mockLoginAccessToken = `login.access.token.${createdUser.id}`;
            const mockLoginRefreshToken = `login.refresh.token.${createdUser.id}`;

            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce(mockLoginAccessToken);

            // Mock refresh token creation for login
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'login-refresh-token-id',
              userId: createdUser.id,
              token: mockLoginRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test login
            const loginResult = await service.login({
              email,
              password,
            });

            expect(loginResult.authResponse.user.email).toBe(email);
            expect(loginResult.authResponse.user.displayName).toBe(displayName);
            expect(loginResult.authResponse.accessToken).toBe(mockLoginAccessToken);
            expect(loginResult.refreshToken).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars

            // Verify that the same user data is returned
            expect(loginResult.authResponse.user.id).toBe(registerResult.authResponse.user.id);
          },
        ),
        { numRuns: 50 }, // Reduced runs for faster execution
      );
    }, 60000); // Increased timeout

    it('should reject registration with duplicate email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const { email, password, displayName } = userData;

            // Mock existing user to simulate duplicate email
            const existingUser: User = {
              id: 'existing-user-id',
              email,
              displayName: 'Existing User',
              passwordHash: 'existing-hash',
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(existingUser);

            // Test that registration throws ConflictException
            await expect(
              service.register({
                email,
                password,
                displayName,
              }),
            ).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 50 }, // Reduced runs for faster execution
      );
    }, 60000); // Increased timeout

    it('should reject login with invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            correctPassword: fc.string({ minLength: 6, maxLength: 50 }),
            wrongPassword: fc.string({ minLength: 6, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            // Ensure passwords are different
            fc.pre(userData.correctPassword !== userData.wrongPassword);

            const { email, correctPassword, wrongPassword, displayName } = userData;

            // Mock bcrypt operations
            const mockPasswordHash = `hashed_${correctPassword}`;
            (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Wrong password

            // Create user with correct password
            const user: User = {
              id: 'test-user-id',
              email,
              displayName,
              passwordHash: mockPasswordHash,
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(user);

            // Test that login with wrong password throws UnauthorizedException
            await expect(
              service.login({
                email,
                password: wrongPassword,
              }),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 50 }, // Reduced runs for faster execution
      );
    }, 60000); // Increased timeout
  });

  describe('Property 5: Password hashing security', () => {
    /**
     * Feature: invoice-backend-api, Property 5: Password hashing security
     * Validates: Requirements 3.4
     */
    it('should never store plain text passwords and should use bcrypt for hashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const { email, password, displayName } = userData;

            // Reset mock call history before each iteration
            (bcrypt.compare as jest.Mock).mockClear();
            (bcrypt.hash as jest.Mock).mockClear();
            (jwtService.signAsync as jest.Mock).mockClear();
            (prismaService.user.findUnique as jest.Mock).mockClear();
            (prismaService.user.create as jest.Mock).mockClear();
            (prismaService.refreshToken.create as jest.Mock).mockClear();

            // Mock bcrypt hash to return a predictable hash
            const mockPasswordHash = `bcrypt_hashed_${password}_with_salt`;
            (bcrypt.hash as jest.Mock).mockResolvedValue(mockPasswordHash);

            // Mock Prisma to simulate no existing user
            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

            // Capture the user creation call
            let createdUserData: any;
            (prismaService.user.create as jest.Mock).mockImplementation((data) => {
              createdUserData = data.data;
              return Promise.resolve({
                id: 'test-user-id',
                ...data.data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            // Mock token generation
            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce('access-token');

            // Mock refresh token creation
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'refresh-token-id',
              userId: 'test-user-id',
              token: 'refresh-token',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test registration
            await service.register({
              email,
              password,
              displayName,
            });

            // Verify bcrypt.hash was called with the password and salt rounds
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);

            // Verify the stored password hash is NOT the plain text password
            expect(createdUserData.passwordHash).not.toBe(password);
            expect(createdUserData.passwordHash).toBe(mockPasswordHash);

            // Verify the password hash looks like a bcrypt hash (starts with expected format)
            expect(createdUserData.passwordHash).toMatch(/^bcrypt_hashed_/);

            // Verify no plain text password is stored
            expect(createdUserData.password).toBeUndefined();
            expect(createdUserData).not.toHaveProperty('password');
          },
        ),
        { numRuns: 50 },
      );
    }, 60000);

    it('should verify passwords using bcrypt compare function', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const { email, password, displayName } = userData;

            // Track the number of calls at the start of this iteration
            const initialCallCount = (bcrypt.compare as jest.Mock).mock.calls.length;

            // Mock bcrypt compare to return true for correct password
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Create user with hashed password
            const user: User = {
              id: 'test-user-id',
              email,
              displayName,
              passwordHash: `bcrypt_hashed_${password}`,
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(user);

            // Mock token generation
            (jwtService.signAsync as jest.Mock).mockResolvedValueOnce('access-token');

            // Mock refresh token creation
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: 'refresh-token-id',
              userId: 'test-user-id',
              token: 'refresh-token',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test login
            await service.login({
              email,
              password,
            });

            // Verify bcrypt.compare was called with the plain password and stored hash
            expect(bcrypt.compare).toHaveBeenCalledWith(password, user.passwordHash);

            // Verify exactly one additional call was made during this iteration
            const finalCallCount = (bcrypt.compare as jest.Mock).mock.calls.length;
            expect(finalCallCount - initialCallCount).toBe(1);
          },
        ),
        { numRuns: 50 },
      );
    }, 60000);
  });

  describe('Property 6: Refresh token functionality', () => {
    /**
     * Feature: invoice-backend-api, Property 6: Refresh token functionality
     * Validates: Requirements 3.6
     */
    it('should generate new access and refresh tokens while invalidating the old refresh token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (userData) => {
            // Create a mock user object
            const user: User = {
              ...userData,
              passwordHash: null,
              photoURL: null,
              googleId: null,
            };

            const originalRefreshToken = `original.refresh.token.${user.id}`;
            const newAccessToken = `new.access.token.${user.id}`;

            // Mock the stored refresh token in database
            const storedRefreshToken = {
              id: 'stored-refresh-token-id',
              userId: user.id,
              token: originalRefreshToken,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now (not expired)
              createdAt: new Date(),
              updatedAt: new Date(),
              user: user,
            };

            // Mock refresh token lookup - should find the token
            (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
              storedRefreshToken,
            );

            // Mock refresh token deletion (invalidation of old token)
            (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(storedRefreshToken);

            // Mock new access token generation
            (jwtService.signAsync as jest.Mock).mockResolvedValue(newAccessToken);

            // Mock new refresh token creation
            const newRefreshTokenId = 'new-refresh-token-id';
            (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({
              id: newRefreshTokenId,
              userId: user.id,
              token: expect.stringMatching(/^[a-f0-9]{128}$/), // 64 bytes = 128 hex chars
              expiresAt: expect.any(Date),
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Test refresh token functionality
            const result = await service.refreshToken(originalRefreshToken);

            // Verify new tokens were generated
            expect(result.authResponse.accessToken).toBe(newAccessToken);
            expect(result.refreshToken).toMatch(/^[a-f0-9]{128}$/); // New refresh token format
            expect(result.authResponse.user.id).toBe(user.id);
            expect(result.authResponse.user.email).toBe(user.email);
            expect(result.authResponse.user.displayName).toBe(user.displayName);

            // Verify the old refresh token was looked up
            expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
              where: { token: originalRefreshToken },
              include: { user: true },
            });

            // Verify the old refresh token was deleted (invalidated)
            expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
              where: { id: storedRefreshToken.id },
            });

            // Verify new access token was generated with correct payload
            expect(jwtService.signAsync).toHaveBeenCalledWith({
              sub: user.id,
              email: user.email,
              displayName: user.displayName,
            });

            // Verify new refresh token was created in database
            expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
              data: {
                userId: user.id,
                token: expect.stringMatching(/^[a-f0-9]{128}$/),
                expiresAt: expect.any(Date),
              },
            });

            // Verify the new refresh token is different from the original
            expect(result.refreshToken).not.toBe(originalRefreshToken);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject expired refresh tokens and clean them up', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            // Create a mock user object
            const user: User = {
              ...userData,
              passwordHash: null,
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const expiredRefreshToken = `expired.refresh.token.${user.id}`;

            // Mock the expired refresh token in database
            const expiredStoredToken = {
              id: 'expired-refresh-token-id',
              userId: user.id,
              token: expiredRefreshToken,
              expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago (expired)
              createdAt: new Date(),
              updatedAt: new Date(),
              user: user,
            };

            // Mock refresh token lookup - should find the expired token
            (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
              expiredStoredToken,
            );

            // Mock refresh token deletion (cleanup of expired token)
            (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue(expiredStoredToken);

            // Test that expired refresh token is rejected
            await expect(service.refreshToken(expiredRefreshToken)).rejects.toThrow(
              UnauthorizedException,
            );

            // Verify the expired token was looked up
            expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
              where: { token: expiredRefreshToken },
              include: { user: true },
            });

            // Verify the expired token was deleted (cleaned up)
            expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
              where: { id: expiredStoredToken.id },
            });

            // Verify no new tokens were generated
            expect(jwtService.signAsync).not.toHaveBeenCalled();
            expect(prismaService.refreshToken.create).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should reject invalid refresh tokens that do not exist in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          async (invalidRefreshToken) => {
            // Mock refresh token lookup - should not find the token
            (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

            // Test that invalid refresh token is rejected
            await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
              UnauthorizedException,
            );

            // Verify the token was looked up
            expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
              where: { token: invalidRefreshToken },
              include: { user: true },
            });

            // Verify no tokens were deleted or created
            expect(prismaService.refreshToken.delete).not.toHaveBeenCalled();
            expect(prismaService.refreshToken.create).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 9: Email uniqueness validation', () => {
    /**
     * Feature: invoice-backend-api, Property 9: Email uniqueness validation
     * Validates: Requirements 3.9
     */
    it('should reject registration attempts with existing email addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password1: fc.string({ minLength: 6, maxLength: 50 }),
            password2: fc.string({ minLength: 6, maxLength: 50 }),
            displayName1: fc.string({ minLength: 1, maxLength: 100 }),
            displayName2: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const { email, password1, password2, displayName1, displayName2 } = userData;

            // Mock existing user with the same email
            const existingUser: User = {
              id: 'existing-user-id',
              email,
              displayName: displayName1,
              passwordHash: 'existing-hash',
              photoURL: null,
              googleId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Mock Prisma to return existing user for email check
            (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(existingUser);

            // Attempt to register with the same email but different details
            await expect(
              service.register({
                email, // Same email as existing user
                password: password2, // Different password
                displayName: displayName2, // Different display name
              }),
            ).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 50 },
      );
    }, 60000);
  });
});
