import { Context, Hono } from 'hono';
import { Database, CreateJobInput } from '../db';
import { Env } from '../auth';

const jobs = new Hono<{ Bindings: Env }>();

/**
 * POST /api/jobs - Add job(s) to queue
 * Accepts single job object or array of job objects
 */
jobs.post('/', async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const db = new Database(c.env.DB);

    // Handle both single job and array of jobs
    const inputs: CreateJobInput[] = Array.isArray(body) ? body : [body];

    // Validate inputs
    for (const input of inputs) {
      if (!input.file_name || !input.crf || !input.preset) {
        return c.json(
          { error: 'Missing required fields: file_name, crf, preset' },
          400
        );
      }
    }

    const jobs = await db.createJobs(inputs);
    return c.json(jobs, 201);
  } catch (error) {
    return c.json({ error: 'Invalid JSON or request format' }, 400);
  }
});

/**
 * GET /api/jobs/claim - Claim next available job
 * Returns first job where started IS NULL and sets started timestamp
 */
jobs.get('/claim', async (c: Context<{ Bindings: Env }>) => {
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

/**
 * GET /api/jobs - List all jobs
 * Supports query params: status (pending|in_progress|finished|all), limit, offset
 */
jobs.get('/', async (c: Context<{ Bindings: Env }>) => {
  try {
    const db = new Database(c.env.DB);
    const status = c.req.query('status') as 'pending' | 'in_progress' | 'finished' | 'all' | undefined;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : undefined;

    const jobList = await db.listJobs({
      status: status || 'all',
      limit,
      offset,
    });

    return c.json(jobList);
  } catch (error) {
    return c.json({ error: 'Failed to fetch jobs' }, 500);
  }
});

/**
 * POST /api/jobs/:id/finish - Mark job as finished
 */
jobs.post('/:id/finish', async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid job ID' }, 400);
    }

    const db = new Database(c.env.DB);
    const job = await db.finishJob(id);

    if (!job) {
      return c.json({ error: 'Job not found or not started' }, 404);
    }

    return c.json(job);
  } catch (error) {
    return c.json({ error: 'Failed to finish job' }, 500);
  }
});

/**
 * DELETE /api/jobs/:id - Delete a job
 */
jobs.delete('/:id', async (c: Context<{ Bindings: Env }>) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid job ID' }, 400);
    }

    const db = new Database(c.env.DB);
    const deleted = await db.deleteJob(id);

    if (!deleted) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({ message: 'Job deleted successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to delete job' }, 500);
  }
});

export default jobs;
