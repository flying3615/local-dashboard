# Queued Source Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move deployed homes.co.nz and realestate.co.nz manual refreshes from synchronous HTTP execution to Cloudflare Queue background processing.

**Architecture:** The Worker HTTP route enqueues heavy property refreshes and returns immediately. The Worker Queue consumer resolves the same source adapter and calls the existing `refreshAll` pipeline with D1 repositories and D1-backed adapter caches.

**Tech Stack:** TypeScript, Cloudflare Workers, Cloudflare Queues, D1, Wrangler, React.

---

### Task 1: Extend Refresh Result Status

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/components/RefreshButton.tsx`

**Steps:**
1. Add `queued` to the `RefreshResult.status` union.
2. Update `RefreshButton` so any queued result displays `Queued`.
3. Keep existing success, skipped, and error rendering unchanged.

### Task 2: Add Queue Binding Configuration

**Files:**
- Modify: `wrangler.jsonc`

**Steps:**
1. Add a queue producer binding named `REFRESH_QUEUE`.
2. Add a consumer for the same queue with small batch size.
3. Keep D1, assets, and cron config unchanged.

### Task 3: Implement Worker Producer and Consumer

**Files:**
- Modify: `worker/index.ts`

**Steps:**
1. Add a typed queue message shape `{ sourceId: string; regionId: string; requestedAt: string }`.
2. Add `REFRESH_QUEUE` to the Worker environment interface.
3. In `POST /api/sources/:id/refresh`, enqueue homes.co.nz and realestate.co.nz messages and return `queued`.
4. Add a `queue(batch, env, ctx)` handler.
5. In the handler, resolve adapters using `regionFromSourceId` and call `refreshAll` with `cacheOptionsForRegion`.
6. For homes.co.nz, process small resumable batches and cap auto-requeue to a bounded number of follow-up batches.
7. Log success and error outcomes.

### Task 4: Verify Locally and With Wrangler

**Commands:**
- `npx vitest run server/api/routes.test.ts`
- `npm run build`
- `npx wrangler deploy --dry-run`

**Expected:**
- Tests pass.
- Typecheck and Vite build pass.
- Wrangler dry-run recognizes the Queue binding and consumer.

### Task 5: Provision, Deploy, and Verify

**Commands:**
- `npx wrangler queues create paraparaumu-refresh`
- `npx wrangler deploy`
- `curl -sS -X POST https://paraparaumu-dashboard.gabriel-liu3615.workers.dev/api/sources/realestate_co_nz_kapiti/refresh`

**Expected:**
- Queue exists or already exists.
- Deploy succeeds.
- POST returns JSON with `status: "queued"` instead of Cloudflare 1102.
