import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController - Refresh Token Cookie Integration', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: null,
    photoURL: null,
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    authResponse: {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL || undefined,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      },
      accessToken: 'new-access-token',
    },
    refreshToken: 'new-refresh-token-value',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            refreshToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, string> = {
                NODE_ENV: 'test',
                FRONTEND_URL: 'http://localhost:5173',
                COOKIE_PATH: '/api/v1/auth/refresh',
                COOKIE_SECURE: 'false',
                COOKIE_SAME_SITE: 'lax',
                COOKIE_MAX_AGE: String(7 * 24 * 60 * 60 * 1000), // 7 days in ms
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/refresh', () => {
    it('should accept refresh token from cookie', async () => {
      // Mock the auth service to return new tokens
      jest.spyOn(authService, 'refreshToken').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=old-refresh-token-from-cookie'])
        .send({}) // Empty body
        .expect(200);

      // Verify the service was called with the token from cookie
      expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token-from-cookie');

      // Verify response contains new access token
      expect(response.body.accessToken).toBe('new-access-token');
      // Verify refresh token is NOT in response body (breaking change)
      expect(response.body.refreshToken).toBeUndefined();

      // Verify new refresh token is set as cookie
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('refreshToken=new-refresh-token-value');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('Path=/api/v1/auth/refresh');
    });

    it('should accept refresh token from request body (backward compatibility)', async () => {
      // Mock the auth service to return new tokens
      jest.spyOn(authService, 'refreshToken').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'old-refresh-token-from-body' })
        .expect(200);

      // Verify the service was called with the token from body
      expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token-from-body');

      // Verify response contains new access token
      expect(response.body.accessToken).toBe('new-access-token');
      // Verify refresh token is NOT in response body (breaking change)
      expect(response.body.refreshToken).toBeUndefined();
    });

    it('should prioritize cookie over request body', async () => {
      // Mock the auth service to return new tokens
      jest.spyOn(authService, 'refreshToken').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=token-from-cookie'])
        .send({ refreshToken: 'token-from-body' })
        .expect(200);

      // Verify the service was called with the token from cookie (priority)
      expect(authService.refreshToken).toHaveBeenCalledWith('token-from-cookie');
    });

    it('should return 401 when no refresh token is provided', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({}) // No token in body or cookie
        .expect(401);

      // Verify the service was not called
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });
});
