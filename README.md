# Video Encode Queue API

A Cloudflare Worker-based API for managing video encoding job queues, with web interfaces for job management. Uses D1 database for storage and supports job enqueueing, claiming, and completion tracking.

## Features

- **Job Queue Management**: Add single or bulk jobs to the queue
- **Job Claiming**: Workers can claim the next available job atomically
- **Status Tracking**: Track job status (pending, in progress, finished)
- **Web Interfaces**: 
  - Add jobs page for enqueueing jobs
  - View jobs page for monitoring all jobs
- **API Key Authentication**: Secure access to all endpoints
- **Free Tier Compatible**: Uses Cloudflare Workers free plan with D1 database

## Architecture

- **Cloudflare Worker**: REST API backend
- **Cloudflare Pages**: Static web pages for UI
- **D1 Database**: SQLite database for job storage
- **Hono Framework**: Lightweight web framework for the Worker

## Project Structure

```
video-encode-api/
├── worker/
│   ├── src/
│   │   ├── index.ts          # Main worker entry point
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── db.ts             # D1 database operations
│   │   └── routes/
│   │       ├── jobs.ts       # Job CRUD operations
│   │       └── claim.ts      # Job claiming logic
│   ├── wrangler.toml         # Worker configuration
│   └── package.json
├── pages/
│   ├── add-jobs/
│   │   ├── index.html        # Add jobs page
│   │   └── script.js         # Frontend logic
│   └── view-jobs/
│       ├── index.html        # View jobs page
│       └── script.js         # Frontend logic
├── schema.sql                 # D1 database schema
├── package.json               # Root package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI installed globally: `npm install -g wrangler`
- Wrangler authenticated: `wrangler login`

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
cd worker && npm install
```

2. Create the D1 database:

```bash
cd worker
wrangler d1 create video-encode-db
```

This will output a UUID (database ID) that looks like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. Copy this UUID (not the database name) and update `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "video-encode-db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # Use the UUID from the output
```

3. Run the database schema:

```bash
cd ..
wrangler d1 execute video-encode-db --file=schema.sql
```

Or from the worker directory:

```bash
cd worker
wrangler d1 execute video-encode-db --file=../schema.sql
```

4. Set the API key secret:

```bash
cd worker
wrangler secret put API_KEY
```

Enter your desired API key when prompted.

## Development

### Local Development

1. Start the Worker in development mode:

```bash
cd worker
npm run dev
```

The Worker will run locally at `http://localhost:8787`.

2. For Pages development, you can use a simple HTTP server:

```bash
cd pages
python3 -m http.server 8000
```

Or use any static file server. Update the API URL in the page scripts if needed.

### Testing the API

You can test the API endpoints using curl:

```bash
# Health check (no auth required)
curl http://localhost:8787/health

# Add a job
curl -X POST http://localhost:8787/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"file_name": "video.mp4", "crf": "23", "preset": "medium"}'

# Claim a job
curl http://localhost:8787/api/jobs/claim \
  -H "X-API-Key: YOUR_API_KEY"

# List all jobs
curl http://localhost:8787/api/jobs \
  -H "X-API-Key: YOUR_API_KEY"

# Finish a job
curl -X POST http://localhost:8787/api/jobs/1/finish \
  -H "X-API-Key: YOUR_API_KEY"
```

## Deployment

### Deploy Worker

1. Deploy the Worker:

```bash
cd worker
npm run deploy
```

2. Note the Worker URL (e.g., `https://video-encode-api.your-subdomain.workers.dev`)

### Deploy Pages

1. Deploy Pages:

```bash
wrangler pages deploy pages/
```

2. Note the Pages URL (e.g., `https://video-encode-api.pages.dev`)

3. Update CORS in `worker/src/index.ts` to restrict to your Pages domain:

```typescript
app.use('*', cors({
  origin: 'https://video-encode-api.pages.dev',
  // ...
}));
```

4. Redeploy the Worker with updated CORS settings.

5. Update the API URL in the Pages scripts:
   - Edit `pages/add-jobs/script.js` and `pages/view-jobs/script.js`
   - Set the Worker URL in localStorage or update `getApiBaseUrl()` function

## API Documentation

All API endpoints require the `X-API-Key` header for authentication.

### Base URL

- Production: `https://your-worker.workers.dev`
- Local: `http://localhost:8787`

### Endpoints

#### Health Check

```
GET /health
```

No authentication required. Returns `{ "status": "ok" }`.

#### Add Job(s)

```
POST /api/jobs
```

Add one or more jobs to the queue.

**Request Body (single job):**
```json
{
  "file_name": "video.mp4",
  "crf": "23",
  "preset": "medium"
}
```

**Request Body (bulk jobs):**
```json
[
  {
    "file_name": "video1.mp4",
    "crf": "23",
    "preset": "medium"
  },
  {
    "file_name": "video2.mp4",
    "crf": "28",
    "preset": "fast"
  }
]
```

**Response:** `201 Created`
```json
[
  {
    "id": 1,
    "file_name": "video.mp4",
    "crf": "23",
    "preset": "medium",
    "started": null,
    "finished": null,
    "created_at": 1699123456
  }
]
```

#### Claim Next Job

```
GET /api/jobs/claim
```

Claims the next available job (where `started` is NULL) and immediately sets the `started` timestamp.

**Response:** `200 OK`
```json
{
  "id": 1,
  "file_name": "video.mp4",
  "crf": "23",
  "preset": "medium",
  "started": 1699123500,
  "finished": null,
  "created_at": 1699123456
}
```

**Response (no jobs available):** `404 Not Found`
```json
{
  "error": "No jobs available"
}
```

#### Finish Job

```
POST /api/jobs/:id/finish
```

Marks a job as finished by setting the `finished` timestamp.

**Response:** `200 OK`
```json
{
  "id": 1,
  "file_name": "video.mp4",
  "crf": "23",
  "preset": "medium",
  "started": 1699123500,
  "finished": 1699124000,
  "created_at": 1699123456
}
```

**Response (job not found or not started):** `404 Not Found`

#### List Jobs

```
GET /api/jobs
```

List all jobs with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `in_progress`, `finished`, or `all`)
- `limit` (optional): Limit number of results
- `offset` (optional): Offset for pagination

**Example:**
```
GET /api/jobs?status=pending&limit=10
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "file_name": "video.mp4",
    "crf": "23",
    "preset": "medium",
    "started": null,
    "finished": null,
    "created_at": 1699123456
  }
]
```

#### Delete Job

```
DELETE /api/jobs/:id
```

Delete a job from the queue.

**Response:** `200 OK`
```json
{
  "message": "Job deleted successfully"
}
```

**Response (job not found):** `404 Not Found`

## Job Status

Jobs have three possible statuses:

- **Pending**: `started` is NULL - job is waiting to be claimed
- **In Progress**: `started` is set but `finished` is NULL - job is being processed
- **Finished**: `finished` is set - job is complete

## Security Considerations

- API keys are stored as Cloudflare Worker secrets (not in code)
- All API endpoints require authentication
- CORS is configured to restrict access (update for production)
- SQL injection prevention via prepared statements
- Input validation on all endpoints

## Race Condition Prevention

The job claiming operation uses an atomic SQL UPDATE with a WHERE clause to ensure only one worker can claim a specific job. The database-level transaction prevents race conditions even under concurrent load.

## Limitations

- Uses Cloudflare Workers free plan limits
- D1 database has free tier limits (100K reads/day, 1000 writes/day)
- No automatic job cleanup (use manual delete endpoint)
- Single API key for all operations (no role-based access)

## Troubleshooting

### Database Connection Issues

If you see database errors, verify:
1. D1 database is created: `wrangler d1 list`
2. Database ID is correct in `wrangler.toml`
3. Schema is applied: `wrangler d1 execute video-encode-db --file=schema.sql`

### Authentication Errors

If you get 401 errors:
1. Verify API key is set: `wrangler secret list`
2. Check the `X-API-Key` header is included in requests
3. Ensure the API key matches what was set

### CORS Issues

If Pages can't access the Worker:
1. Check CORS settings in `worker/src/index.ts`
2. Verify the Pages domain is allowed
3. Check browser console for CORS errors

## License

MIT
