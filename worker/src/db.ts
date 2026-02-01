export interface Job {
  id: number;
  file_name: string;
  crf: string;
  preset: string;
  started: number | null;
  finished: number | null;
  created_at: number;
}

export interface CreateJobInput {
  file_name: string;
  crf: string;
  preset: string;
}

export class Database {
  constructor(private db: D1Database) {}

  /**
   * Create one or more jobs
   */
  async createJobs(inputs: CreateJobInput[]): Promise<Job[]> {
    const jobs: Job[] = [];
    const now = Math.floor(Date.now() / 1000);

    for (const input of inputs) {
      const stmt = this.db
        .prepare('INSERT INTO jobs (file_name, crf, preset, created_at) VALUES (?, ?, ?, ?)')
        .bind(input.file_name, input.crf, input.preset, now);

      const result = await stmt.run();
      if (result.meta.last_row_id) {
        const job = await this.getJobById(result.meta.last_row_id);
        if (job) {
          jobs.push(job);
        }
      }
    }

    return jobs;
  }

  /**
   * Get a job by ID
   */
  async getJobById(id: number): Promise<Job | null> {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id);
    const result = await stmt.first<Job>();
    return result || null;
  }

  /**
   * Claim the next available job (atomic operation)
   * Returns the first job where started IS NULL and sets started timestamp
   */
  async claimNextJob(): Promise<Job | null> {
    const now = Math.floor(Date.now() / 1000);

    // Use a single atomic UPDATE statement that finds and updates in one operation
    // The subquery finds the oldest unclaimed job, and the outer WHERE ensures atomicity
    const stmt = this.db
      .prepare(`
        UPDATE jobs 
        SET started = ? 
        WHERE id = (
          SELECT id FROM jobs 
          WHERE started IS NULL 
          ORDER BY created_at ASC 
          LIMIT 1
        )
        AND started IS NULL
      `)
      .bind(now);

    const result = await stmt.run();

    if (result.meta.changes === 0) {
      return null; // No jobs available or all were claimed
    }

    // Fetch the job that was just updated (the one with the matching started timestamp)
    const fetchStmt = this.db
      .prepare('SELECT * FROM jobs WHERE started = ? ORDER BY created_at ASC LIMIT 1')
      .bind(now);
    
    const job = await fetchStmt.first<Job>();
    return job || null;
  }

  /**
   * Mark a job as finished
   */
  async finishJob(id: number): Promise<Job | null> {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db
      .prepare('UPDATE jobs SET finished = ? WHERE id = ? AND started IS NOT NULL')
      .bind(now, id);

    const result = await stmt.run();

    if (result.meta.changes === 0) {
      return null; // Job not found or not started
    }

    return this.getJobById(id);
  }

  /**
   * List all jobs with optional filtering
   */
  async listJobs(options?: {
    status?: 'pending' | 'in_progress' | 'finished' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<Job[]> {
    let query = 'SELECT * FROM jobs';
    const params: any[] = [];

    if (options?.status && options.status !== 'all') {
      switch (options.status) {
        case 'pending':
          query += ' WHERE started IS NULL';
          break;
        case 'in_progress':
          query += ' WHERE started IS NOT NULL AND finished IS NULL';
          break;
        case 'finished':
          query += ' WHERE finished IS NOT NULL';
          break;
      }
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      stmt.bind(...params);
    }

    const result = await stmt.all<Job>();
    return result.results || [];
  }

  /**
   * Delete a job
   */
  async deleteJob(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?').bind(id);
    const result = await stmt.run();
    return result.meta.changes > 0;
  }
}
