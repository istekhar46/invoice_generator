import * as express from 'express';
import type { Request, Response } from 'express';
import * as request from 'supertest';
import { createMaintenanceMiddleware } from './maintenance.middleware';

function setup(mode?: string) {
  const app = express();
  const handler = jest.fn((_request: Request, response: Response) => {
    response.json({ reachedController: true });
  });
  app.use(createMaintenanceMiddleware(mode));
  app.use(handler);
  return { app, handler };
}

describe('API maintenance middleware', () => {
  it.each([undefined, 'false'])('preserves normal requests when mode is %s', async (mode) => {
    const { app, handler } = setup(mode);
    await request(app).post('/api/v1/invoices').expect(200, { reachedController: true });
    await request(app).get('/api/v1/invoices').expect(200);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it.each(['get', 'post', 'put', 'patch', 'delete'] as const)(
    'blocks %s business requests before controllers',
    async (method) => {
      const { app, handler } = setup('true');
      const response = await request(app)[method]('/api/v1/invoices').expect(503);
      expect(response.body).toEqual({
        statusCode: 503,
        message: 'Service is temporarily unavailable for maintenance. Please try again shortly.',
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['retry-after']).toBe('60');
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it.each(['/api/v1/health/ready', '/api/v1/docs-json'])(
    'allows GET and HEAD probe requests at %s, including query strings',
    async (path) => {
      const { app, handler } = setup('true');
      await request(app).get(`${path}?probe=1`).expect(200);
      await request(app).head(path).expect(200);
      expect(handler).toHaveBeenCalledTimes(2);
    },
  );

  it('does not exempt writes to a probe path or similar path prefixes', async () => {
    const { app, handler } = setup('true');
    await request(app).post('/api/v1/health/ready').expect(503);
    await request(app).get('/api/v1/docs-json-private').expect(503);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each(['', 'TRUE', '1', 'yes'])('rejects invalid startup configuration %j', (mode) => {
    expect(() => createMaintenanceMiddleware(mode)).toThrow(
      'MAINTENANCE_MODE must be "true" or "false".',
    );
  });
});
