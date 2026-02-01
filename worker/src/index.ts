import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, Env } from './auth';
import jobs from './routes/jobs';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow requests from Pages
app.use('*', cors({
  origin: '*', // In production, restrict to your Pages domain
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}));

// Health check endpoint (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// API routes with authentication
const api = new Hono<{ Bindings: Env }>();
api.use('*', authMiddleware);

// Mount routes
api.route('/jobs', jobs);

app.route('/api', api);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
