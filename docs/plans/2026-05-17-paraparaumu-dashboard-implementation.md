# Paraparaumu Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal React and TypeScript dashboard for Paraparaumu property monitoring, Greater Wellington school tracking, and extensible local information sources.

**Architecture:** Use a Vite React frontend, a TypeScript Node API, and SQLite persistence. All external inputs flow through source adapters into raw snapshots, normalized items, tags, links, and dashboard views.

**Tech Stack:** React, TypeScript, Vite, Node.js, Express or Fastify, SQLite, Vitest, React Testing Library.

---

## Task 1: Scaffold The TypeScript App

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/test/setup.ts`

**Step 1: Create the package manifest**

Create `package.json` with scripts for development, tests, type checking, and the API server.

```json
{
  "name": "paraparaumu-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "server:dev": "tsx server/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "better-sqlite3": "latest",
    "cors": "latest",
    "express": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/better-sqlite3": "latest",
    "@types/cors": "latest",
    "@types/express": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

**Step 2: Add TypeScript and Vite config**

Create the TS and Vite config files with strict TypeScript enabled, React plugin enabled, and Vitest using `jsdom`.

**Step 3: Write the failing smoke test**

In `src/app/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the dashboard title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Paraparaumu Dashboard/i })).toBeInTheDocument();
  });
});
```

**Step 4: Run the test and verify it fails**

Run: `npm test`

Expected: FAIL because dependencies may not be installed or `App` does not exist yet.

**Step 5: Implement the minimal React app**

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>Paraparaumu Dashboard</h1>
    </main>
  );
}
```

Create `src/main.tsx` to render `<App />`.

**Step 6: Run verification**

Run:

```bash
npm install
npm test
npm run typecheck
```

Expected: tests and type checking pass.

**Step 7: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html src
git commit -m "chore: scaffold dashboard app"
```

## Task 2: Define Shared Domain Types

**Files:**
- Create: `src/lib/types.ts`
- Create: `server/domain/types.ts`
- Create: `server/domain/types.test.ts`

**Step 1: Write the failing type guard tests**

In `server/domain/types.test.ts`, test that item and source parsing accepts valid data and rejects unknown item types.

```ts
import { describe, expect, it } from "vitest";
import { itemSchema, sourceSchema } from "./types";

describe("domain schemas", () => {
  it("accepts a property listing item", () => {
    const item = itemSchema.parse({
      id: "item_1",
      type: "property_listing",
      title: "12 Example Street",
      summary: "New listing in Paraparaumu",
      sourceId: "source_1",
      sourceUrl: "https://example.com/listing",
      area: "Paraparaumu",
      address: "12 Example Street, Paraparaumu",
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      status: "new",
      tags: ["new"],
      rawSnapshotId: "raw_1"
    });

    expect(item.type).toBe("property_listing");
  });

  it("rejects unknown item types", () => {
    expect(() =>
      itemSchema.parse({
        id: "item_2",
        type: "unknown",
        title: "Bad item",
        summary: "",
        sourceId: "source_1",
        sourceUrl: "https://example.com",
        area: null,
        address: null,
        publishedAt: null,
        startsAt: null,
        endsAt: null,
        status: "new",
        tags: [],
        rawSnapshotId: null
      })
    ).toThrow();
  });
});
```

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/domain/types.test.ts`

Expected: FAIL because schemas do not exist.

**Step 3: Implement schemas and shared types**

Use `zod` in `server/domain/types.ts` for runtime validation. Export matching TypeScript types. Mirror the public client-safe types from `src/lib/types.ts`.

Include:

- `ItemType`
- `TrustLevel`
- `ItemStatus`
- `WatchStatus`
- `Source`
- `RawSnapshot`
- `Item`
- `PropertyListing`
- `School`
- `SchoolEvent`
- `ItemLink`
- `Note`

**Step 4: Run verification**

Run:

```bash
npm test -- server/domain/types.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add src/lib/types.ts server/domain/types.ts server/domain/types.test.ts
git commit -m "feat: define dashboard domain types"
```

## Task 3: Add SQLite Schema And Repository Layer

**Files:**
- Create: `server/db/schema.ts`
- Create: `server/db/database.ts`
- Create: `server/db/repositories.ts`
- Create: `server/db/repositories.test.ts`
- Create: `data/.gitkeep`

**Step 1: Write repository tests**

Test inserting a source, raw snapshot, normalized item, and property listing.

```ts
import { describe, expect, it } from "vitest";
import { createInMemoryDatabase } from "./database";
import { createRepositories } from "./repositories";

describe("repositories", () => {
  it("stores a source, raw snapshot, item, and property", () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);

    repos.sources.upsert({
      id: "source_1",
      name: "Test Listings",
      type: "property_platform",
      url: "https://example.com",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null
    });

    repos.rawSnapshots.insert({
      id: "raw_1",
      sourceId: "source_1",
      fetchedAt: "2026-05-17T00:00:00.000Z",
      url: "https://example.com/listing",
      contentHash: "hash_1",
      rawPayload: { title: "12 Example Street" }
    });

    repos.items.upsert({
      id: "item_1",
      type: "property_listing",
      title: "12 Example Street",
      summary: "New listing",
      sourceId: "source_1",
      sourceUrl: "https://example.com/listing",
      area: "Paraparaumu",
      address: "12 Example Street, Paraparaumu",
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      status: "new",
      tags: ["new"],
      rawSnapshotId: "raw_1"
    });

    repos.properties.upsert({
      id: "property_1",
      itemId: "item_1",
      address: "12 Example Street, Paraparaumu",
      suburb: "Paraparaumu",
      price: "$900,000",
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landArea: null,
      floorArea: null,
      listedAt: null,
      openHomeTimes: [],
      platform: "test",
      watchStatus: "new",
      notes: null
    });

    expect(repos.items.list({ type: "property_listing" })).toHaveLength(1);
    expect(repos.properties.list()).toHaveLength(1);
  });
});
```

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/db/repositories.test.ts`

Expected: FAIL because database modules do not exist.

**Step 3: Implement schema and repositories**

Use `better-sqlite3`. Store arrays and raw payloads as JSON text. Keep repository methods small and explicit.

**Step 4: Run verification**

Run:

```bash
npm test -- server/db/repositories.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add server/db data/.gitkeep
git commit -m "feat: add sqlite persistence"
```

## Task 4: Build Normalization Pipeline

**Files:**
- Create: `server/pipeline/normalize.ts`
- Create: `server/pipeline/dedupe.ts`
- Create: `server/pipeline/tag.ts`
- Create: `server/pipeline/link.ts`
- Create: `server/pipeline/pipeline.test.ts`

**Step 1: Write failing pipeline tests**

Test that a raw property record normalizes to `property_listing`, gets a stable ID, receives Paraparaumu and open-home tags, and links to a source.

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/pipeline/pipeline.test.ts`

Expected: FAIL because pipeline files do not exist.

**Step 3: Implement normalization**

Implement:

- `normalizePropertyListing(raw, context)`
- `dedupeItems(items)`
- `tagItem(item)`
- `linkItem(item, knownEntities)`

Keep address matching conservative. If matching confidence is low, add `needs_manual_address_check`.

**Step 4: Run verification**

Run:

```bash
npm test -- server/pipeline/pipeline.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add server/pipeline
git commit -m "feat: add item normalization pipeline"
```

## Task 5: Add Seed Data And Mock Adapters

**Files:**
- Create: `server/adapters/types.ts`
- Create: `server/adapters/mockProperties.ts`
- Create: `server/adapters/mockSchools.ts`
- Create: `server/jobs/refreshAll.ts`
- Create: `server/jobs/refreshAll.test.ts`

**Step 1: Write failing refresh job test**

Test that `refreshAll` fetches mock property and school data, stores raw snapshots, and creates normalized items.

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/jobs/refreshAll.test.ts`

Expected: FAIL because adapters and job do not exist.

**Step 3: Implement adapter contract**

Define a `SourceAdapter` interface:

```ts
export interface SourceAdapter {
  sourceId: string;
  fetch(): Promise<Array<unknown>>;
}
```

Implement mock property and school adapters with realistic Paraparaumu examples.

**Step 4: Implement refresh job**

The job should:

- Fetch each enabled adapter.
- Save raw snapshots.
- Normalize each record.
- Upsert items and related entities.
- Update source success or error state.

**Step 5: Run verification**

Run:

```bash
npm test -- server/jobs/refreshAll.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 6: Commit**

```bash
git add server/adapters server/jobs
git commit -m "feat: add refresh job with mock adapters"
```

## Task 6: Expose API Endpoints

**Files:**
- Create: `server/index.ts`
- Create: `server/api/routes.ts`
- Create: `server/api/routes.test.ts`
- Modify: `package.json`

**Step 1: Write API tests**

Test:

- `GET /api/dashboard`
- `GET /api/properties`
- `GET /api/properties/:id`
- `GET /api/schools`
- `GET /api/sources`
- `POST /api/sources/:id/refresh`

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/api/routes.test.ts`

Expected: FAIL because API routes do not exist.

**Step 3: Implement routes**

Use Express. Return JSON only. Keep the route layer thin and delegate database access to repositories.

**Step 4: Run verification**

Run:

```bash
npm test -- server/api/routes.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add server/index.ts server/api package.json
git commit -m "feat: expose dashboard api"
```

## Task 7: Build Frontend Data Access

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/api.test.ts`
- Modify: `src/lib/types.ts`

**Step 1: Write API client tests**

Mock `fetch` and verify `getDashboard`, `getProperties`, `getProperty`, `getSchools`, `getSources`, and `refreshSource` call the expected endpoints and parse JSON.

**Step 2: Run the test and verify it fails**

Run: `npm test -- src/lib/api.test.ts`

Expected: FAIL because client functions do not exist.

**Step 3: Implement API client**

Use a small typed wrapper around `fetch`. Throw clear errors for non-2xx responses.

**Step 4: Run verification**

Run:

```bash
npm test -- src/lib/api.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts src/lib/types.ts
git commit -m "feat: add frontend api client"
```

## Task 8: Build Dashboard UI

**Files:**
- Create: `src/app/Dashboard.tsx`
- Create: `src/components/ItemCard.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/SourceLink.tsx`
- Modify: `src/app/App.tsx`
- Create: `src/app/Dashboard.test.tsx`

**Step 1: Write UI tests**

Test that the dashboard renders sections for property listings, open homes, school dates, council/news items, and review items.

**Step 2: Run the test and verify it fails**

Run: `npm test -- src/app/Dashboard.test.tsx`

Expected: FAIL because components do not exist.

**Step 3: Implement components**

Use compact, dashboard-style UI. Avoid landing-page composition. Use source links and status badges consistently.

**Step 4: Run verification**

Run:

```bash
npm test -- src/app/Dashboard.test.tsx
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add src/app src/components
git commit -m "feat: build dashboard overview"
```

## Task 9: Build Property Views

**Files:**
- Create: `src/app/PropertyList.tsx`
- Create: `src/app/PropertyDetail.tsx`
- Create: `src/app/PropertyList.test.tsx`
- Create: `src/app/PropertyDetail.test.tsx`
- Modify: `src/app/App.tsx`

**Step 1: Write UI tests**

Test that the property list shows address, price, source, tags, open home time, and watch status. Test that the detail view shows council links, school context, linked items, and notes.

**Step 2: Run the tests and verify they fail**

Run: `npm test -- src/app/PropertyList.test.tsx src/app/PropertyDetail.test.tsx`

Expected: FAIL because property views do not exist.

**Step 3: Implement property list and detail**

Use simple local navigation state first. Do not introduce routing unless needed.

**Step 4: Run verification**

Run:

```bash
npm test -- src/app/PropertyList.test.tsx src/app/PropertyDetail.test.tsx
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add src/app
git commit -m "feat: add property list and detail views"
```

## Task 10: Build School Radar And Sources Views

**Files:**
- Create: `src/app/SchoolRadar.tsx`
- Create: `src/app/Sources.tsx`
- Create: `src/components/RefreshButton.tsx`
- Create: `src/app/SchoolRadar.test.tsx`
- Create: `src/app/Sources.test.tsx`
- Modify: `src/app/App.tsx`

**Step 1: Write UI tests**

Test that the school radar shows school type, year range, zone status, commute practicality, and monitored events. Test that sources show status, last fetch, errors, and refresh controls.

**Step 2: Run the tests and verify they fail**

Run: `npm test -- src/app/SchoolRadar.test.tsx src/app/Sources.test.tsx`

Expected: FAIL because views do not exist.

**Step 3: Implement views**

Use tabs or a compact sidebar for switching between dashboard, properties, schools, and sources.

**Step 4: Run verification**

Run:

```bash
npm test -- src/app/SchoolRadar.test.tsx src/app/Sources.test.tsx
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add src/app src/components/RefreshButton.tsx
git commit -m "feat: add school radar and source management"
```

## Task 11: Add Styling And Responsive Layout

**Files:**
- Create: `src/styles.css`
- Modify: `src/main.tsx`
- Modify: `src/app/*.tsx`
- Modify: `src/components/*.tsx`

**Step 1: Write accessibility smoke tests**

Test that primary navigation buttons have accessible names and that status badges expose readable labels.

**Step 2: Run the tests and verify current gaps**

Run: `npm test`

Expected: either fail on missing labels or pass if labels already exist.

**Step 3: Implement styling**

Use a quiet operational dashboard style:

- Dense but readable layout.
- No marketing hero.
- No decorative gradient blobs.
- Stable button and card dimensions.
- Clear focus states.
- Responsive layout for laptop and phone.

**Step 4: Run verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src
git commit -m "style: polish dashboard layout"
```

## Task 12: Add Real Source Adapter Stubs

**Files:**
- Create: `server/adapters/educationCounts.ts`
- Create: `server/adapters/kapitiCouncil.ts`
- Create: `server/adapters/propertySearches.ts`
- Create: `server/adapters/sourceConfig.ts`
- Create: `server/adapters/sourceConfig.test.ts`
- Modify: `server/jobs/refreshAll.ts`

**Step 1: Write adapter config tests**

Test that configured sources include Education Counts, Kāpiti Council, Trade Me or realestate.co.nz search placeholders, and school website monitors.

**Step 2: Run the test and verify it fails**

Run: `npm test -- server/adapters/sourceConfig.test.ts`

Expected: FAIL because config does not exist.

**Step 3: Implement adapter stubs**

Implement source definitions and fetch interfaces, but keep scraping conservative. For sources that need manual review or terms-of-service checks, return a clear `not_implemented` result and keep the source visible in the UI.

**Step 4: Run verification**

Run:

```bash
npm test -- server/adapters/sourceConfig.test.ts
npm run typecheck
```

Expected: tests and type checking pass.

**Step 5: Commit**

```bash
git add server/adapters server/jobs/refreshAll.ts
git commit -m "feat: configure real source adapter stubs"
```

## Task 13: End-To-End Local Verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

**Step 1: Add run instructions**

Document:

- Installing dependencies.
- Running tests.
- Starting API server.
- Starting Vite dev server.
- Refreshing data.
- Known source limitations.

**Step 2: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all pass.

**Step 3: Start local servers**

Run API:

```bash
npm run server:dev
```

Run frontend:

```bash
npm run dev
```

Expected: frontend opens at a local Vite URL and can load mock dashboard data.

**Step 4: Manually verify**

Open the local URL and verify:

- Dashboard loads.
- Property list loads.
- Property detail opens.
- School radar loads.
- Sources view loads.
- Manual refresh button returns a visible result.

**Step 5: Commit**

```bash
git add README.md .gitignore
git commit -m "docs: add local development workflow"
```

## Task 14: Prepare Cloudflare Deployment Path

**Files:**
- Create: `docs/deployment/cloudflare.md`
- Modify: `server/db/database.ts`
- Modify: `server/jobs/refreshAll.ts`
- Modify: `README.md`

**Step 1: Document the target Cloudflare architecture**

Create `docs/deployment/cloudflare.md` describing:

- Cloudflare Pages for the React frontend.
- Cloudflare Workers for API routes.
- Cloudflare D1 as the hosted SQLite-compatible database.
- Cloudflare Cron Triggers for scheduled collectors.
- Cloudflare KV for cache or lightweight locks if needed.
- Cloudflare R2 for large raw snapshots if D1 storage becomes inappropriate.

**Step 2: Identify Node-specific assumptions**

Review:

- `server/db/database.ts`
- `server/jobs/refreshAll.ts`
- `server/adapters/*.ts`
- `server/api/routes.ts`

List any Node-only APIs that would block Workers deployment, such as filesystem
access, long-running processes, or native SQLite bindings.

**Step 3: Add portability boundaries**

Keep database access behind repository interfaces and make scheduled jobs accept
injected dependencies:

```ts
export interface RefreshDependencies {
  now: () => Date;
  fetch: typeof fetch;
  repositories: Repositories;
}
```

Expected: local Node execution still works, but the job can later run in a
Worker-compatible environment.

**Step 4: Run verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all pass.

**Step 5: Commit**

```bash
git add docs/deployment/cloudflare.md server/db/database.ts server/jobs/refreshAll.ts README.md
git commit -m "docs: outline cloudflare deployment path"
```

## Execution Notes

- Initialize git before the first commit if the directory is not already a repository.
- Keep each task independently passing before moving on.
- Prefer mock adapters until the core pipeline and UI are stable.
- Do not add scraping for sources that need a terms-of-service review until the source adapter contract is proven.
- Keep all information source links visible in the UI.
- Mark uncertain address, school zone, sale price, and source data clearly instead of hiding uncertainty.
- Keep Cloudflare portability in mind, but do not migrate to Workers and D1 until the local dashboard, data model, and adapters are stable.
