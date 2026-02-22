import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController - Login and Register Cookie Integration', () => {
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
      accessToken: 'test-access-token',
    },
    refreshToken: 'test-refresh-token',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
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

  describe('POST /auth/login', () => {
    it('should set refresh token as HttpOnly cookie', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Verify response contains access token in body
      expect(response.body.accessToken).toBe('test-access-token');
      // Verify refresh token is NOT in response body (breaking change)
      expect(response.body.refreshToken).toBeUndefined();

      // Verify refresh token is set as HttpOnly cookie
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('refreshToken=test-refresh-token');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('SameSite=Lax');
      expect(setCookieHeader[0]).toContain('Path=/api/v1/auth/refresh');
    });

    it('should not include refresh token in response body (breaking change)', async () => {
      jest.spyOn(authService, 'login').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Verify refresh token is NOT in response body
      expect(response.body.refreshToken).toBeUndefined();
      // Verify only access token and user are in response
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
    });
  });

  describe('POST /auth/register', () => {
    it('should set refresh token as HttpOnly cookie', async () => {
      jest.spyOn(authService, 'register').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User',
        })
        .expect(201);

      // Verify response contains access token in body
      expect(response.body.accessToken).toBe('test-access-token');
      // Verify refresh token is NOT in response body (breaking change)
      expect(response.body.refreshToken).toBeUndefined();

      // Verify refresh token is set as HttpOnly cookie
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('refreshToken=test-refresh-token');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('SameSite=Lax');
      expect(setCookieHeader[0]).toContain('Path=/api/v1/auth/refresh');
    });

    it('should not include refresh token in response body (breaking change)', async () => {
      jest.spyOn(authService, 'register').mockResolvedValue(mockAuthResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User',
        })
        .expect(201);

      // Verify refresh token is NOT in response body
      expect(response.body.refreshToken).toBeUndefined();
      // Verify only access token and user are in response
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
    });
  });
});
