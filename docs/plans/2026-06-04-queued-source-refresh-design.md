# Queued Source Refresh Design

## Context

Cloudflare returned error 1102 when the deployed Worker tried to refresh homes.co.nz or realestate.co.nz synchronously from `POST /api/sources/:id/refresh`. Tail logs showed `outcome: exceededCpu`, which matches the Workers Free HTTP request CPU limit. The same refresh works locally because the local server is not constrained by Worker CPU limits.

## Decision

Use Cloudflare Queues for deployed property source refreshes. The HTTP route will enqueue a refresh message and immediately return a `queued` result. A Queue consumer on the same Worker will process the message in the background, reuse the existing adapter cache stores and `refreshAll`, and persist results to D1.

## Data Flow

1. User clicks Refresh for a source in the Sources page.
2. Worker receives `POST /api/sources/:id/refresh`.
3. For `homes_co_nz*` and `realestate_co_nz*`, Worker sends `{ sourceId, regionId }` to `REFRESH_QUEUE`.
4. Worker returns `{ status: "queued", recordsProcessed: 0 }`.
5. Queue consumer resolves the adapter from the source id and calls `refreshAll({ force: true })`.
6. Existing source metadata (`lastSuccessAt`, `lastError`) is updated by `refreshAll`.

For homes.co.nz, the consumer uses smaller batches than the local server: one sitemap page and five property detail pages per Queue message. Each click may enqueue up to five linked batches, so refresh progresses without creating an unbounded background loop.

## Error Handling

If the Queue binding is missing or enqueue fails, the HTTP route returns an `error` result. If background processing fails, `refreshAll` writes the source `lastError`, and the result is logged. Existing synchronous refresh stays in place for lighter non-property sources.

## Testing

The implementation should typecheck, build, and pass existing API tests. Worker behavior will be verified with `wrangler deploy --dry-run`, then by deploying and checking that property refresh POST responses return `queued` instead of Cloudflare 1102 and Queue logs show successful consumer batches.
