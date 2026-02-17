import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect((res) => {
          // Should return either 200 (healthy) or 503 (unhealthy)
          expect([200, 503]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('status');
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('uptime');
        expect(response.body.data).toHaveProperty('version');
        expect(response.body.data).toHaveProperty('environment');
        expect(response.body.data).toHaveProperty('services');
        expect(response.body.data.services).toHaveProperty('database');
        expect(response.body.data.services).toHaveProperty('memory');
        expect(response.body.data.services).toHaveProperty('system');
      }
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect((res) => {
          // Should return either 200 (ready) or 503 (not ready)
          expect([200, 503]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('status', 'OK');
        expect(response.body.data).toHaveProperty('timestamp');
      }
    });
  });

  describe('/health/live (GET)', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').expect(200);

      expect(response.body.data).toHaveProperty('status', 'alive');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(typeof response.body.data.uptime).toBe('number');
    });
  });
});
