This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Integration Outbox & Worker

This app uses an outbox/inbox pattern to make cross-module operations retryable and idempotent:
- UI/server actions enqueue an `IntegrationOutbox` event
- A worker processes pending events and writes `IntegrationInbox` rows per consumer to guarantee at-most-once per consumer/outboxId
- Failures backoff and retry; poison messages become `DEAD`

### Async vs inline processing

By default, actions may enqueue and then process inline. To run “true async” (queue only), set:
- `INTEGRATION_PROCESS_INLINE=false`

When running async, the UI shows “Queued for processing” and the worker is responsible for completing the work.

### Worker runner (scheduler-friendly)

Protected endpoint:
- `POST /api/integration/worker`
- Header: `x-integration-dispatch-key: <INTEGRATION_DISPATCH_KEY>`

Optional query params:
- `limitPerBatch` (default 50)
- `maxBatches` (default 25)
- `deadlineMs` (default 25000)
 - `concurrency` (default 4)
 - `drain` (default false; when true, ignores maxBatches and runs until drained or deadline)

Example request:
```bash
curl -X POST "http://localhost:3000/api/integration/worker?limitPerBatch=50&maxBatches=25&deadlineMs=25000" \
  -H "x-integration-dispatch-key: $INTEGRATION_DISPATCH_KEY"
```

### Healthcheck (external monitoring)

Protected endpoint:
- `GET /api/integration/health`
- Header: `x-integration-dispatch-key: <INTEGRATION_DISPATCH_KEY>`

Behavior:
- Returns `200` for `ok` / `warn`
- Returns `503` for `alert` (so uptime monitors can alert on status code)

Example request:
```bash
curl -X GET "http://localhost:3000/api/integration/health" \
  -H "x-integration-dispatch-key: $INTEGRATION_DISPATCH_KEY"
```

CLI entrypoint:
- `npm run outbox:work`

HTTP CLI entrypoint (scheduler-friendly when the scheduler cannot access the DB):
- `npm run outbox:work:http`

### Key environment variables

- `INTEGRATION_DISPATCH_KEY`: required for `/api/integration/dispatch` and `/api/integration/worker`
- `INTEGRATION_MAX_ATTEMPTS` (default 10)
- `INTEGRATION_LOCK_TIMEOUT_MS` (default 60000)
- `INTEGRATION_BACKOFF_BASE_MS` (default 5000)
- `INTEGRATION_BACKOFF_MAX_MS` (default 300000)
- `INTEGRATION_WORKER_ID` (optional; defaults to random UUID)
- `OUTBOX_WORKER_URL`: full URL to `/api/integration/worker` for `outbox:work:http`
- `OUTBOX_LIMIT_PER_BATCH`, `OUTBOX_MAX_BATCHES`, `OUTBOX_DEADLINE_MS`, `OUTBOX_CONCURRENCY`, `OUTBOX_DRAIN`
- `OUTBOX_ALERT_OLDEST_PENDING_SECONDS` (default 3600)
- `OUTBOX_ALERT_STUCK_PROCESSING_COUNT` (default 1)
- `OUTBOX_ALERT_DEAD_COUNT` (default 1)
- `OUTBOX_WARN_FAILED_LAST_HOUR_COUNT` (default 1)

You can start from the provided `.env.example` and fill in your deployment-specific values.

### Database migrations (Prisma)

This repo uses Prisma schema folder configuration (`prisma.config.ts` points to `prisma/schema`), so schema changes (including new indexes) should be shipped via migrations.

- Generate a migration locally:
  - `npx prisma migrate dev --name <migration_name>`
- Apply migrations in production:
  - `npx prisma migrate deploy`

### Monitoring & recovery (Admin)

- Outbox health: `/admin/dashboard`
- Outbox queue (filters + actions): `/admin/integrations/outbox`
  - Use “Unlock” for stuck PROCESSING
  - Use “Requeue” to retry (optionally resetting attempts)
  - Use “Mark DEAD” for poison messages
  - Use “Top Failed Errors” to bulk requeue or dead-letter by exact error text

### Operations runbook (recommended)

- **If PENDING grows and oldest pending is increasing**
  - Verify your scheduler is calling the worker endpoint.
  - Run a one-off drain with higher concurrency for catch-up:
    - `POST /api/integration/worker?drain=true&deadlineMs=25000&concurrency=8`
- **If PROCESSING is stuck (stuck processing count > 0)**
  - Use Outbox “Unlock” for stale locks (PROCESSING with old lockedAt).
  - Ensure multiple schedulers aren’t using the same worker identity unexpectedly.
- **If DEAD increases**
  - Inspect `lastError`, fix the underlying handler issue, then use “Requeue” (optionally resetting attempts).
  - Consider increasing `INTEGRATION_MAX_ATTEMPTS` only after confirming the error is transient.
- **If retries are thrashing**
  - Increase `INTEGRATION_BACKOFF_BASE_MS` and/or cap `INTEGRATION_BACKOFF_MAX_MS`.
  - Reduce `concurrency` to limit downstream pressure.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
