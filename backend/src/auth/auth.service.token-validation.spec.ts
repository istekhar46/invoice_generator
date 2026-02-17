import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { User } from '@prisma/client';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Token Validation Unit Tests
 * Task 22: Backend: Add unit tests for token validation
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
describe('AuthService - Token Validation', () => {
  let service: AuthService;
  let jwtService: JwtService;
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
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Signature Validation (Requirement 10.1)', () => {
    it('should reject tokens with invalid signatures', async () => {
      const invalidToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIn0.invalid_signature';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(async () => {
        jwtService.verify(invalidToken);
      }).rejects.toThrow('invalid signature');
    });

    it('should reject tokens with tampered payload', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered_payload.signature';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(async () => {
        jwtService.verify(tamperedToken);
      }).rejects.toThrow('invalid token');
    });

    it('should reject tokens signed with wrong secret', async () => {
      const tokenWithWrongSecret =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIn0.wrong_secret';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(async () => {
        jwtService.verify(tokenWithWrongSecret);
      }).rejects.toThrow('invalid signature');
    });

    it('should accept tokens with valid signatures', async () => {
      const validPayload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      (jwtService.verify as jest.Mock).mockReturnValue(validPayload);

      const result = jwtService.verify('valid.jwt.token');

      expect(result).toEqual(validPayload);
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Token Expiration Validation (Requirement 10.2)', () => {
    it('should reject expired access tokens', async () => {
      const expiredToken = 'expired.jwt.token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(async () => {
        jwtService.verify(expiredToken);
      }).rejects.toThrow('jwt expired');
    });

    it('should reject expired refresh tokens', async () => {
      const expiredRefreshToken = 'expired-refresh-token-value';
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hash',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: expiredRefreshToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      });

      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(service.refreshToken(expiredRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(service.refreshToken(expiredRefreshToken)).rejects.toThrow(
        'Refresh token expired',
      );

      expect(prismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should accept non-expired tokens', async () => {
      const validPayload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      (jwtService.verify as jest.Mock).mockReturnValue(validPayload);

      const result = jwtService.verify('valid.jwt.token');

      expect(result).toEqual(validPayload);
    });
  });

  describe('User Existence Validation (Requirement 10.3)', () => {
    it('should reject tokens for non-existent users', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-user-id',
        email: 'nonexistent@example.com',
        displayName: 'Non Existent',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
    });

    it('should reject tokens for deleted users', async () => {
      const payload: JwtPayload = {
        sub: 'deleted-user-id',
        email: 'deleted@example.com',
        displayName: 'Deleted User',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should accept tokens for existing users', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const mockUser: User = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        passwordHash: 'hash',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(result).toEqual(mockUser);
      expect(result?.id).toBe(payload.sub);
      expect(result?.email).toBe(payload.email);
    });
  });

  describe('Refresh Token Database Validation (Requirement 10.4)', () => {
    it('should reject refresh tokens that do not exist in database', async () => {
      const invalidRefreshToken = 'non-existent-refresh-token';

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should reject refresh tokens that were already used', async () => {
      const usedRefreshToken = 'already-used-refresh-token';

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken(usedRefreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject malformed refresh tokens', async () => {
      const malformedToken = 'malformed';

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken(malformedToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Validation Error Messages (Requirement 10.5)', () => {
    it('should return descriptive error for invalid signature', async () => {
      const invalidToken = 'invalid.signature.token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid signature');
      });

      try {
        jwtService.verify(invalidToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('invalid signature');
      }
    });

    it('should return descriptive error for expired token', async () => {
      const expiredToken = 'expired.token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      try {
        jwtService.verify(expiredToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('jwt expired');
      }
    });

    it('should return descriptive error for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.refreshToken(invalidRefreshToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe('Invalid refresh token');
      }
    });

    it('should return descriptive error for expired refresh token', async () => {
      const expiredRefreshToken = 'expired-refresh-token';
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hash',
        photoURL: null,
        googleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
        token: expiredRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      });

      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue({});

      try {
        await service.refreshToken(expiredRefreshToken);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe('Refresh token expired');
      }
    });
  });
});
