import { Context, Hono } from 'hono';
import { Database } from '../db';
import { Env } from '../auth';

const claim = new Hono<{ Bindings: Env }>();

/**
 * GET /api/jobs/claim - Claim next available job
 * Returns first job where started IS NULL and sets started timestamp
 */
claim.get('/', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = new Database(c.env.DB);
    const job = await db.claimNextJob();

    if (!job) {
      return c.json({ error: 'No jobs available' }, 404);
    }

    return c.json(job);
  } catch (error) {
    return c.json({ error: 'Failed to claim job' }, 500);
  }
});

export default claim;
