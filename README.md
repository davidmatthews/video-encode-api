# Video Encode Queue API

A Cloudflare Worker API for managing a video encoding job queue. Add jobs, claim the next one, finish it, and list or filter jobs. Uses D1 for storage and API key authentication.

**Live:** [Website](https://video-encode-api.pages.dev/) · API base: `https://video-encode-api.davidmatthews.workers.dev`

---

## What it does

- **Queue jobs** — Add one or many encoding jobs (file name, CRF, preset).
- **Claim next job** — Workers claim the next pending job atomically; no double-processing.
- **Track status** — Pending → In progress (claimed) → Finished.
- **Web UI** — Add jobs and view all jobs at the Pages site above.

All API requests (except health) require the `X-API-Key` header.

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| POST | `/api/jobs` | Add one or more jobs |
| GET | `/api/jobs/claim` | Claim next pending job |
| POST | `/api/jobs/:id/finish` | Mark job finished |
| GET | `/api/jobs` | List jobs (optional `?status=`, `limit`, `offset`) |
| DELETE | `/api/jobs/:id` | Delete a job |

---

## Examples

Replace `YOUR_API_KEY` with your API key.

**Health check**
```bash
curl https://video-encode-api.davidmatthews.workers.dev/health
```

**Add a single job**
```bash
curl -X POST https://video-encode-api.davidmatthews.workers.dev/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"file_name": "video.mp4", "crf": "23", "preset": "medium"}'
```

**Add multiple jobs**
```bash
curl -X POST https://video-encode-api.davidmatthews.workers.dev/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '[
    {"file_name": "video1.mp4", "crf": "23", "preset": "medium"},
    {"file_name": "video2.mp4", "crf": "28", "preset": "fast"}
  ]'
```

**Claim next job**
```bash
curl https://video-encode-api.davidmatthews.workers.dev/api/jobs/claim \
  -H "X-API-Key: YOUR_API_KEY"
```
Returns the job body (or 404 if none pending).

**Finish a job**
```bash
curl -X POST https://video-encode-api.davidmatthews.workers.dev/api/jobs/1/finish \
  -H "X-API-Key: YOUR_API_KEY"
```

**List jobs**
```bash
# All jobs
curl https://video-encode-api.davidmatthews.workers.dev/api/jobs \
  -H "X-API-Key: YOUR_API_KEY"

# Only pending
curl "https://video-encode-api.davidmatthews.workers.dev/api/jobs?status=pending" \
  -H "X-API-Key: YOUR_API_KEY"

# Paginated
curl "https://video-encode-api.davidmatthews.workers.dev/api/jobs?limit=10&offset=0" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Delete a job**
```bash
curl -X DELETE https://video-encode-api.davidmatthews.workers.dev/api/jobs/1 \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## Job shape

Each job has: `id`, `file_name`, `crf`, `preset`, `started` (timestamp or null), `finished` (timestamp or null), `created_at`. Status is derived: no `started` = pending; `started` set, no `finished` = in progress; `finished` set = finished.

---

## License

MIT
