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

// CORS middleware - Allow all origins for mobile app
app.use('*', cors({
  origin: '*', // Allow all origins (needed for Capacitor mobile apps)
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400, // 24 hours
}));

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
