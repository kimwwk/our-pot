import { Hono } from 'hono';
import { cors } from 'hono/cors';
import chatRoute from './routes/chat';
import { errorHandler } from './middleware/error-handler';

type Bindings = {
  OPENAI_API_KEY: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware
app.use('*', async (c, next) => {
  // Parse allowed origins from environment or use defaults
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'capacitor://localhost',
  ];

  const corsMiddleware = cors({
    origin: allowedOrigins,
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400, // 24 hours
  });

  return corsMiddleware(c, next);
});

// Error handling middleware
app.onError(errorHandler);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Chat endpoint
app.route('/api/chat', chatRoute);

export default app;
