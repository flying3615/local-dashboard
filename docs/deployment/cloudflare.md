# Cloudflare Deployment Path

This document outlines how to migrate the local dashboard to Cloudflare's platform.

## Target Architecture

| Component | Local | Cloudflare Target |
|---|---|---|
| Frontend | Vite dev server | Cloudflare Pages |
| API | Express + tsx | Cloudflare Workers |
| Database | SQLite (better-sqlite3) | Cloudflare D1 |
| Scheduled jobs | Manual / cron | Cloudflare Cron Triggers |
| Cache / locks | None | Cloudflare KV (optional) |
| Large snapshots | SQLite BLOB | Cloudflare R2 (if needed) |

## Portability Boundaries

The codebase already observes these boundaries:

- **Repository interfaces** (`server/db/repositories.ts`): All database access goes through the `createRepositories(db)` factory. To migrate, swap the SQLite implementation for a D1-backed one with the same method signatures.
- **Injected dependencies** (`server/jobs/refreshAll.ts`): The refresh job accepts `repositories`, `adapters`, and `now` as parameters rather than reaching for global state or the filesystem.
- **Adapter isolation** (`server/adapters/`): Source adapters only use `fetch()` and structured parsing. No Node-specific APIs (fs, child_process, etc.) in adapter code.

## Node-Specific Assumptions to Address

These files use Node-only APIs and need adaptation for Workers:

1. **`server/db/database.ts`** — Uses `better-sqlite3` (native bindings). Replace with D1 client.
2. **`server/db/schema.ts`** — `db.exec()` for DDL. D1 supports this via `batch()` or sequential statements.
3. **`server/index.ts`** — Express server. Replace with `worktop` or a raw `fetch` handler using the Web Standard Request/Response API (Workers native).

## Migration Steps (Proposed)

1. Create a D1 database and run the schema from `server/db/schema.ts`
2. Implement a D1-backed repository adapter matching the existing interface
3. Port `server/api/routes.ts` to a Workers `fetch` handler
4. Deploy frontend to Cloudflare Pages with the API URL as an environment variable
5. Configure Cron Triggers to invoke `refreshAll` on a schedule
6. Move large `rawPayload` storage to R2 if snapshot volume exceeds D1 limits
