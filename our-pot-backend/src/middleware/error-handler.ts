import { Context } from 'hono';

/**
 * Global error handler for unhandled errors
 */
export function errorHandler(err: Error, c: Context) {
  console.error('Unhandled error:', err);

  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
      environment: c.env?.ENVIRONMENT || 'development',
    },
    500
  );
}
