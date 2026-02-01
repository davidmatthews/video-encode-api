-- Jobs table for video encoding queue
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    crf TEXT NOT NULL,
    preset TEXT NOT NULL,
    started INTEGER,
    finished INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index on started for efficient claim queries
CREATE INDEX IF NOT EXISTS idx_jobs_started ON jobs(started);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
