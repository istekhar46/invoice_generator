import type { RequestHandler } from 'express';

const READ_ONLY_PROBES = new Set([
  '/api/v1/health/ready',
  '/api/v1/health/live',
  '/api/v1/docs-json',
  '/api/v1/docs-yaml',
]);

export function createMaintenanceMiddleware(mode?: string): RequestHandler {
  if (mode !== undefined && mode !== 'true' && mode !== 'false') {
    throw new Error('MAINTENANCE_MODE must be "true" or "false".');
  }
  const enabled = mode === 'true';

  return (request, response, next): void => {
    const probe =
      (request.method === 'GET' || request.method === 'HEAD') && READ_ONLY_PROBES.has(request.path);
    if (!enabled || probe) {
      next();
      return;
    }

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Retry-After', '60');
    response.status(503).json({
      statusCode: 503,
      message: 'Service is temporarily unavailable for maintenance. Please try again shortly.',
    });
  };
}
