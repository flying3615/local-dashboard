# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server (frontend only)
npm run server:dev     # Backend dev server via tsx (entry: server/index.ts -- not yet created)
npm test               # Run all tests (vitest run)
npm run test:watch     # Run tests in watch mode
npm run typecheck      # Type-check both tsconfig.json (frontend) and tsconfig.node.json (server)
npm run build          # typecheck + vite build
```

Single test file:
```bash
npx vitest run server/pipeline/pipeline.test.ts
```

## Architecture

This is a personal web dashboard for monitoring property listings, schools, and local information in Paraparaumu, New Zealand. It's a single-user tool -- no auth, no multi-tenancy.

### Data pipeline

```
Source Adapter → Raw Snapshot → Normalized Item → Tag → Link → Dashboard
```

1. **Adapters** (`server/adapters/`) implement the `SourceAdapter` interface -- `fetch()` returns raw records. Currently only mock adapters exist; real adapters (Trade Me, council, Education Counts) are planned.
2. **Pipeline** (`server/pipeline/`) normalizes raw records into typed `Item`/`PropertyListing` domain objects, tags them (e.g. `paraparaumu`, `open_home_soon`, `needs_manual_address_check`), dedupes by stable ID, and links items to their source entity.
3. **Persistence** (`server/db/`) uses SQLite via better-sqlite3. `repositories.ts` provides typed repository objects (sources, rawSnapshots, items, properties, itemLinks) with upsert semantics. Row mappers translate between snake_case columns and camelCase domain types.
4. **Jobs** (`server/jobs/refreshAll.ts`) orchestrates adapters → pipeline → repositories in a transaction per adapter, preserving user-managed state (item status, property watchStatus/notes) across refreshes.

### Two TypeScript projects

- `tsconfig.json` — frontend (`src/`), JSX, DOM lib
- `tsconfig.node.json` — server (`server/`), vite config, Node types

### Domain types

Defined as Zod schemas in `server/domain/types.ts` and inferred as TypeScript types. The frontend `src/lib/types.ts` has a hand-written copy (not derived from Zod). Shared types include `Item`, `PropertyListing`, `School`, `Source`, `RawSnapshot`, `ItemLink`.

### Key design decisions

- **Stable item IDs** are derived from SHA-256 hashes of source URL + platform + address, so re-fetching the same listing produces the same ID.
- **Refresh safety**: each adapter's records are processed in a SQLite transaction. If normalization fails (e.g. invalid data), the entire adapter batch rolls back and the error is recorded on the source.
- **User state preservation**: `mergeExistingItemState` and `mergeExistingPropertyState` carry forward user-set fields (status, watchStatus, notes) when re-normalizing already-seen items.
- **Future Cloudflare path**: database access stays behind repository interfaces, adapters avoid Node-only APIs where practical, and jobs accept injected dependencies so they can migrate to Workers.
