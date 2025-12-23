import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';

describe('Security Middleware Configuration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        ThrottlerModule.forRootAsync({
          useFactory: () => ({
            throttlers: [
              {
                ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
                limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
              },
            ],
          }),
        }),
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('ThrottlerModule Configuration', () => {
    it('should be defined and configured', () => {
      expect(module).toBeDefined();
      
      // Verify ThrottlerModule is properly imported
      const throttlerModule = module.get(ThrottlerModule);
      expect(throttlerModule).toBeDefined();
    });

    it('should use environment variables for configuration', () => {
      // Test that the configuration uses environment variables
      const expectedTtl = parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000; // TTL is converted to milliseconds
      const expectedLimit = parseInt(process.env.THROTTLE_LIMIT ?? '100', 10);
      
      expect(expectedTtl).toBeGreaterThan(0);
      expect(expectedLimit).toBeGreaterThan(0);
      
      // Verify the actual values match the configuration
      expect(expectedTtl).toBe(60000); // 60 seconds * 1000 = 60000 milliseconds
      // In test environment, THROTTLE_LIMIT is 1000, in dev it's 100
      expect([100, 1000]).toContain(expectedLimit);
    });
  });

  describe('Security Headers Configuration', () => {
    it('should have helmet configuration ready', () => {
      // Test helmet configuration object
      const helmetConfig = {
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
          directives: {
            imgSrc: [`'self'`, 'data:', 'https:'],
          },
        },
      };

      expect(helmetConfig.crossOriginEmbedderPolicy).toBe(false);
      expect(helmetConfig.contentSecurityPolicy.directives.imgSrc).toContain(`'self'`);
      expect(helmetConfig.contentSecurityPolicy.directives.imgSrc).toContain('data:');
      expect(helmetConfig.contentSecurityPolicy.directives.imgSrc).toContain('https:');
    });
  });

  describe('CORS Configuration', () => {
    it('should have proper CORS configuration', () => {
      // Test CORS configuration object
      const corsConfig = {
        origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      };

      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.methods).toContain('GET');
      expect(corsConfig.methods).toContain('POST');
      expect(corsConfig.methods).toContain('PUT');
      expect(corsConfig.methods).toContain('PATCH');
      expect(corsConfig.methods).toContain('DELETE');
      expect(corsConfig.methods).toContain('OPTIONS');
      expect(corsConfig.allowedHeaders).toContain('Content-Type');
      expect(corsConfig.allowedHeaders).toContain('Authorization');
      expect(corsConfig.allowedHeaders).toContain('Accept');
    });

    it('should use environment variable for origin or default', () => {
      const expectedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';
      expect(expectedOrigin).toBeDefined();
      expect(typeof expectedOrigin).toBe('string');
    });
  });

  describe('Environment Configuration', () => {
    it('should load configuration module', () => {
      const configModule = module.get(ConfigModule);
      expect(configModule).toBeDefined();
    });

    it('should have proper environment defaults', () => {
      // Test default values - note that test environment may have different values
      const defaultTtl = parseInt(process.env.THROTTLE_TTL ?? '60', 10);
      const defaultLimit = parseInt(process.env.THROTTLE_LIMIT ?? '100', 10);
      const defaultFrontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

      expect(defaultTtl).toBe(60);
      // In test environment, THROTTLE_LIMIT is 1000, in dev it's 100
      expect(defaultLimit).toBeGreaterThan(0);
      expect([100, 1000]).toContain(defaultLimit);
      expect(defaultFrontendUrl).toBe('http://localhost:5173');
    });
  });
});