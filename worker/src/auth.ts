import { Context, Next } from 'hono';

export interface Env {
  API_KEY: string;
  DB: D1Database;
}

/**
 * Middleware to validate API key from X-API-Key header
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKey = c.req.header('X-API-Key');
  const expectedKey = c.env.API_KEY;

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
