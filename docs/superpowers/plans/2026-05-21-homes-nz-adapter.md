# homes.co.nz Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `createHomesNzAdapter` that discovers Paraparaumu properties via sitemaps and extracts valuation/council data from SSR-embedded JSON on property pages.

**Architecture:** Follows the `realestate.ts` adapter pattern — sitemap-based discovery → per-property fetch → cache-based change detection → `RawPropertyListing` output. The `PropertyListing` domain type, DB schema, and pipeline are extended with 16 optional nullable fields for valuation, council, and image data.

**Tech Stack:** TypeScript, Zod, better-sqlite3, vitest

---

### Task 1: Extend the PropertyListing domain type

**Files:**
- Modify: `server/domain/types.ts`

- [ ] **Step 1: Add new optional fields to `propertyListingSchema`**

Add the 16 new fields after the existing `notes` field (line 91):

```typescript
export const propertyListingSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  address: z.string().min(1),
  suburb: z.string().min(1),
  price: z.string().nullable(),
  bedrooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  parking: z.number().int().nonnegative().nullable(),
  landArea: z.number().nonnegative().nullable(),
  floorArea: z.number().nonnegative().nullable(),
  listedAt: z.string().nullable(),
  openHomeTimes: z.array(z.string()),
  platform: z.string().min(1),
  watchStatus: watchStatusSchema,
  notes: z.string().nullable(),
  // Valuation
  estimatedValueLow: z.number().int().nonnegative().nullable(),
  estimatedValueHigh: z.number().int().nonnegative().nullable(),
  estimatedValueDate: z.string().nullable(),
  capitalValue: z.number().int().nonnegative().nullable(),
  landValue: z.number().int().nonnegative().nullable(),
  improvementValue: z.number().int().nonnegative().nullable(),
  cvDate: z.string().nullable(),
  // Rental estimate
  estimatedRentalLow: z.number().int().nonnegative().nullable(),
  estimatedRentalHigh: z.number().int().nonnegative().nullable(),
  estimatedRentalYield: z.string().nullable(),
  // Council / property attributes
  decadeBuilt: z.string().nullable(),
  contour: z.string().nullable(),
  buildingConstruction: z.string().nullable(),
  ownershipType: z.string().nullable(),
  legalDescription: z.string().nullable(),
  certificateOfTitle: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (new fields are optional, existing code unaffected)

- [ ] **Step 3: Commit**

```bash
git add server/domain/types.ts
git commit -m "feat: add valuation, council, and image fields to PropertyListing schema

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Extend RawPropertyListing and normalizePropertyListing

**Files:**
- Modify: `server/pipeline/normalize.ts`

- [ ] **Step 1: Add fields to `RawPropertyListing` interface**

Add after the existing `rawSnapshotId` field (line 22):

```typescript
export interface RawPropertyListing {
  address?: string | null;
  title?: string | null;
  sourceId: string;
  sourceUrl: string;
  platform: string;
  suburb?: string | null;
  area?: string | null;
  price?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  landArea?: number | null;
  floorArea?: number | null;
  listedAt?: string | null;
  openHomeTimes?: string[];
  rawSnapshotId?: string | null;
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  estimatedValueDate?: string | null;
  capitalValue?: number | null;
  landValue?: number | null;
  improvementValue?: number | null;
  cvDate?: string | null;
  estimatedRentalLow?: number | null;
  estimatedRentalHigh?: number | null;
  estimatedRentalYield?: string | null;
  decadeBuilt?: string | null;
  contour?: string | null;
  buildingConstruction?: string | null;
  ownershipType?: string | null;
  legalDescription?: string | null;
  certificateOfTitle?: string | null;
  imageUrl?: string | null;
}
```

- [ ] **Step 2: Add passthrough to `normalizePropertyListing`**

In the `property:` object inside `normalizePropertyListing` (after `notes: null,` at line 81), add:

```typescript
        estimatedValueLow: raw.estimatedValueLow ?? null,
        estimatedValueHigh: raw.estimatedValueHigh ?? null,
        estimatedValueDate: raw.estimatedValueDate ?? null,
        capitalValue: raw.capitalValue ?? null,
        landValue: raw.landValue ?? null,
        improvementValue: raw.improvementValue ?? null,
        cvDate: raw.cvDate ?? null,
        estimatedRentalLow: raw.estimatedRentalLow ?? null,
        estimatedRentalHigh: raw.estimatedRentalHigh ?? null,
        estimatedRentalYield: raw.estimatedRentalYield ?? null,
        decadeBuilt: raw.decadeBuilt ?? null,
        contour: raw.contour ?? null,
        buildingConstruction: raw.buildingConstruction ?? null,
        ownershipType: raw.ownershipType ?? null,
        legalDescription: raw.legalDescription ?? null,
        certificateOfTitle: raw.certificateOfTitle ?? null,
        imageUrl: raw.imageUrl ?? null,
```

- [ ] **Step 3: Verify typecheck and existing tests**

```bash
npm run typecheck && npx vitest run server/pipeline/pipeline.test.ts
```
Expected: typecheck passes, existing pipeline tests pass

- [ ] **Step 4: Commit**

```bash
git add server/pipeline/normalize.ts
git commit -m "feat: add valuation/council/image fields to RawPropertyListing and normalize passthrough

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Update database schema and repositories

**Files:**
- Modify: `server/db/schema.ts`
- Modify: `server/db/repositories.ts`

- [ ] **Step 1: Add new columns to `property_listings` table in `schema.ts`**

In the `CREATE TABLE IF NOT EXISTS property_listings` statement (line 54), add new columns after the `notes TEXT` line:

```sql
      estimated_value_low INTEGER,
      estimated_value_high INTEGER,
      estimated_value_date TEXT,
      capital_value INTEGER,
      land_value INTEGER,
      improvement_value INTEGER,
      cv_date TEXT,
      estimated_rental_low INTEGER,
      estimated_rental_high INTEGER,
      estimated_rental_yield TEXT,
      decade_built TEXT,
      contour TEXT,
      building_construction TEXT,
      ownership_type TEXT,
      legal_description TEXT,
      certificate_of_title TEXT,
      image_url TEXT,
```

Since this is `CREATE TABLE IF NOT EXISTS`, existing databases won't get the new columns. Also add an `ALTER TABLE` migration block after the CREATE statements:

```sql
    -- Migration: add homes.co.nz fields
    ALTER TABLE property_listings ADD COLUMN estimated_value_low INTEGER;
    ALTER TABLE property_listings ADD COLUMN estimated_value_high INTEGER;
    ALTER TABLE property_listings ADD COLUMN estimated_value_date TEXT;
    ALTER TABLE property_listings ADD COLUMN capital_value INTEGER;
    ALTER TABLE property_listings ADD COLUMN land_value INTEGER;
    ALTER TABLE property_listings ADD COLUMN improvement_value INTEGER;
    ALTER TABLE property_listings ADD COLUMN cv_date TEXT;
    ALTER TABLE property_listings ADD COLUMN estimated_rental_low INTEGER;
    ALTER TABLE property_listings ADD COLUMN estimated_rental_high INTEGER;
    ALTER TABLE property_listings ADD COLUMN estimated_rental_yield TEXT;
    ALTER TABLE property_listings ADD COLUMN decade_built TEXT;
    ALTER TABLE property_listings ADD COLUMN contour TEXT;
    ALTER TABLE property_listings ADD COLUMN building_construction TEXT;
    ALTER TABLE property_listings ADD COLUMN ownership_type TEXT;
    ALTER TABLE property_listings ADD COLUMN legal_description TEXT;
    ALTER TABLE property_listings ADD COLUMN certificate_of_title TEXT;
    ALTER TABLE property_listings ADD COLUMN image_url TEXT;
```

Wrap each ALTER in a try-catch so they don't fail on re-run (SQLite doesn't support `IF NOT EXISTS` for ALTER):

```typescript
    // Safe migration: each ALTER wrapped to tolerate existing columns
    const migrations = [
      "ALTER TABLE property_listings ADD COLUMN estimated_value_low INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_value_high INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_value_date TEXT",
      "ALTER TABLE property_listings ADD COLUMN capital_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN land_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN improvement_value INTEGER",
      "ALTER TABLE property_listings ADD COLUMN cv_date TEXT",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_low INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_high INTEGER",
      "ALTER TABLE property_listings ADD COLUMN estimated_rental_yield TEXT",
      "ALTER TABLE property_listings ADD COLUMN decade_built TEXT",
      "ALTER TABLE property_listings ADD COLUMN contour TEXT",
      "ALTER TABLE property_listings ADD COLUMN building_construction TEXT",
      "ALTER TABLE property_listings ADD COLUMN ownership_type TEXT",
      "ALTER TABLE property_listings ADD COLUMN legal_description TEXT",
      "ALTER TABLE property_listings ADD COLUMN certificate_of_title TEXT",
      "ALTER TABLE property_listings ADD COLUMN image_url TEXT",
    ];
    for (const sql of migrations) {
      try { db.exec(sql); } catch { /* column already exists */ }
    }
```

Place this after the existing `CREATE TABLE` statements and indexes.

- [ ] **Step 2: Update `PropertyListingRow` interface in `repositories.ts`**

Add new fields after `notes: string | null;` in `PropertyListingRow` (line 57):

```typescript
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  estimated_value_date: string | null;
  capital_value: number | null;
  land_value: number | null;
  improvement_value: number | null;
  cv_date: string | null;
  estimated_rental_low: number | null;
  estimated_rental_high: number | null;
  estimated_rental_yield: string | null;
  decade_built: string | null;
  contour: string | null;
  building_construction: string | null;
  ownership_type: string | null;
  legal_description: string | null;
  certificate_of_title: string | null;
  image_url: string | null;
```

- [ ] **Step 3: Update `mapPropertyListingRow` in `repositories.ts`**

Add new fields to the mapped object inside `mapPropertyListingRow` (after `notes: row.notes,`):

```typescript
      estimatedValueLow: row.estimated_value_low,
      estimatedValueHigh: row.estimated_value_high,
      estimatedValueDate: row.estimated_value_date,
      capitalValue: row.capital_value,
      landValue: row.land_value,
      improvementValue: row.improvement_value,
      cvDate: row.cv_date,
      estimatedRentalLow: row.estimated_rental_low,
      estimatedRentalHigh: row.estimated_rental_high,
      estimatedRentalYield: row.estimated_rental_yield,
      decadeBuilt: row.decade_built,
      contour: row.contour,
      buildingConstruction: row.building_construction,
      ownershipType: row.ownership_type,
      legalDescription: row.legal_description,
      certificateOfTitle: row.certificate_of_title,
      imageUrl: row.image_url,
```

- [ ] **Step 4: Update upsert SQL in `repositories.ts`**

In the `properties.upsert` method, add new columns to both the INSERT column list and VALUES, and add them to the ON CONFLICT DO UPDATE SET clause. In the INSERT:

```sql
              estimated_value_low,
              estimated_value_high,
              estimated_value_date,
              capital_value,
              land_value,
              improvement_value,
              cv_date,
              estimated_rental_low,
              estimated_rental_high,
              estimated_rental_yield,
              decade_built,
              contour,
              building_construction,
              ownership_type,
              legal_description,
              certificate_of_title,
              image_url
```

VALUES:

```sql
              @estimatedValueLow,
              @estimatedValueHigh,
              @estimatedValueDate,
              @capitalValue,
              @landValue,
              @improvementValue,
              @cvDate,
              @estimatedRentalLow,
              @estimatedRentalHigh,
              @estimatedRentalYield,
              @decadeBuilt,
              @contour,
              @buildingConstruction,
              @ownershipType,
              @legalDescription,
              @certificateOfTitle,
              @imageUrl
```

ON CONFLICT DO UPDATE SET:

```sql
              estimated_value_low = excluded.estimated_value_low,
              estimated_value_high = excluded.estimated_value_high,
              estimated_value_date = excluded.estimated_value_date,
              capital_value = excluded.capital_value,
              land_value = excluded.land_value,
              improvement_value = excluded.improvement_value,
              cv_date = excluded.cv_date,
              estimated_rental_low = excluded.estimated_rental_low,
              estimated_rental_high = excluded.estimated_rental_high,
              estimated_rental_yield = excluded.estimated_rental_yield,
              decade_built = excluded.decade_built,
              contour = excluded.contour,
              building_construction = excluded.building_construction,
              ownership_type = excluded.ownership_type,
              legal_description = excluded.legal_description,
              certificate_of_title = excluded.certificate_of_title,
              image_url = excluded.image_url,
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run server/db/repositories.test.ts
```
Expected: all repository tests pass with the new columns

- [ ] **Step 6: Commit**

```bash
git add server/db/schema.ts server/db/repositories.ts
git commit -m "feat: add valuation/council/image columns to property_listings table

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Create homes.co.nz adapter

**Files:**
- Create: `server/adapters/homesNz.ts`

- [ ] **Step 1: Write the adapter implementation**

```typescript
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { SourceAdapter } from "./types";
import type { RawPropertyListing } from "../pipeline/normalize";

const SITEMAP_BASE = "https://homes.co.nz/sitemapv2_properties";
const SITEMAP_COUNT = 40;
const SITEMAP_CACHE_PATH = "data/homes-nz-sitemap-cache.json";
const PROPERTY_CACHE_PATH = "data/homes-nz-property-cache.json";

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
};

type FetchImpl = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponse>;

interface PropertyUrl {
  id: string;
  url: string;
  address: string;
  suburb: string;
}

interface SitemapCache {
  fetchedAt: string;
  properties: PropertyUrl[];
}

interface PropertyCache {
  fetchedAt: string;
  revisions: Record<string, string>;
}

export interface CacheStore<T> {
  read(): Promise<T | null>;
  write(cache: T): Promise<void>;
}

export interface HomesNzAdapterOptions {
  fetchImpl?: FetchImpl;
  sitemapCacheStore?: CacheStore<SitemapCache>;
  propertyCacheStore?: CacheStore<PropertyCache>;
  maxPropertiesPerFetch?: number;
  throttleMs?: number;
  now?: () => string;
}

export function createHomesNzAdapter(
  options: HomesNzAdapterOptions = {},
): SourceAdapter {
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchImpl);
  const sitemapCacheStore =
    options.sitemapCacheStore ??
    createFileCacheStore<SitemapCache>(SITEMAP_CACHE_PATH);
  const propertyCacheStore =
    options.propertyCacheStore ??
    createFileCacheStore<PropertyCache>(PROPERTY_CACHE_PATH);
  const maxPropertiesPerFetch = options.maxPropertiesPerFetch ?? 20;
  const throttleMs = options.throttleMs ?? 500;
  const now = options.now ?? (() => new Date().toISOString());

  return {
    sourceId: "homes_co_nz",
    recordType: "property_listing",
    source: {
      name: "homes.co.nz",
      type: "property_data",
      url: "https://homes.co.nz/map/wellington/kapiti-coast/paraparaumu",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 1440,
    },
    async fetch(): Promise<RawPropertyListing[]> {
      const allProperties = await discoverParaparaumuProperties(fetchImpl, sitemapCacheStore, now());
      const cache = await propertyCacheStore.read();
      const changed = findChanged(allProperties, cache);
      const pending = changed.slice(0, maxPropertiesPerFetch);

      if (pending.length === 0) return [];

      const results: RawPropertyListing[] = [];
      const fetchedAt = now();
      const newRevisions: Record<string, string> = { ...(cache?.revisions ?? {}) };

      for (const prop of pending) {
        try {
          const result = await fetchPropertyPage(fetchImpl, prop);
          if (result) {
            results.push(result);
            if (result.estimatedValueDate) {
              newRevisions[prop.id] = result.estimatedValueDate;
            }
          }
        } catch {
          // Keep failed properties out of cache so next refresh retries
        }
        if (throttleMs > 0) {
          await sleep(throttleMs);
        }
      }

      await propertyCacheStore.write({ fetchedAt, revisions: newRevisions });
      return results;
    },
  };
}

async function discoverParaparaumuProperties(
  fetchImpl: FetchImpl,
  sitemapCacheStore: CacheStore<SitemapCache>,
  now: string,
): Promise<PropertyUrl[]> {
  const cached = await sitemapCacheStore.read();
  if (cached) {
    const cacheAge = Date.parse(now) - Date.parse(cached.fetchedAt);
    if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
      return cached.properties;
    }
  }

  const allProperties: PropertyUrl[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= SITEMAP_COUNT; i++) {
    const url = `${SITEMAP_BASE}${i}.xml.gz`;
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "paraparaumu-dashboard/0.1" },
    });

    if (!response.ok) {
      throw new Error(`Sitemap fetch failed: ${url} status ${response.status}`);
    }

    const text = await response.text();
    // Parse XML <url> blocks containing 'paraparaumu'
    const blockRegex =
      /<url>\s*<loc>(https:\/\/homes\.co\.nz\/address\/paraparaumu\/([^<]+)\/([^<]+)\/([A-Za-z0-9]+))<\/loc>/g;

    let match = blockRegex.exec(text);
    while (match !== null) {
      const fullUrl = match[1]!;
      const suburb = match[2]!;
      const address = match[3]!;
      const id = match[4]!;
      if (!seen.has(id)) {
        seen.add(id);
        allProperties.push({ id, url: fullUrl, address, suburb });
      }
      match = blockRegex.exec(text);
    }
  }

  await sitemapCacheStore.write({ fetchedAt: now, properties: allProperties });
  return allProperties;
}

function findChanged(
  properties: PropertyUrl[],
  cache: PropertyCache | null,
): PropertyUrl[] {
  if (!cache) return properties;
  const cached = cache.revisions;
  return properties.filter((p) => !(p.id in cached));
}

async function fetchPropertyPage(
  fetchImpl: FetchImpl,
  prop: PropertyUrl,
): Promise<RawPropertyListing | null> {
  const response = await fetchImpl(prop.url, {
    headers: { "User-Agent": "paraparaumu-dashboard/0.1" },
  });

  if (!response.ok) return null;

  const html = await response.text();

  // Extract <script id="homes-app-state" type="application/json">...</script>
  const scriptMatch = html.match(
    /<script\s+id="homes-app-state"\s+type="application\/json">([^<]*)<\/script>/,
  );
  if (!scriptMatch?.[1]) return null;

  let state: HomesAppState;
  try {
    state = JSON.parse(scriptMatch[1]);
  } catch {
    return null;
  }

  // Navigate: state → first key → b → card → property_details
  const stateKey = Object.keys(state).find((k) => k !== "__nghData__");
  if (!stateKey) return null;

  const card = (state[stateKey] as Record<string, unknown>)?.b as
    | { card?: { property_details?: HomesPropertyDetails } }
    | undefined;
  const pd = card?.card?.property_details;
  if (!pd) return null;

  return mapToRawPropertyListing(pd, prop);
}

interface HomesAppState {
  __nghData__?: unknown;
  [key: string]: unknown;
}

interface HomesPropertyDetails {
  address?: string;
  display_estimated_lower_value_short?: string | null;
  display_estimated_upper_value_short?: string | null;
  display_estimated_value_short?: string | null;
  estimated_value_revision_date?: string | null;
  capital_value?: number | null;
  land_value?: number | null;
  improvement_value?: number | null;
  current_revision_date?: string | null;
  land_area?: number | null;
  floor_area?: number | null;
  num_bedrooms?: number | null;
  num_bathrooms?: number | null;
  num_car_spaces?: number | null;
  decade_built?: string | null;
  contour?: string | null;
  building_construction?: string | null;
  ownership_type?: string | null;
  legal_description?: string | null;
  certificate_of_title?: string | null;
  display_estimated_rental_lower_value_short?: string | null;
  display_estimated_rental_upper_value_short?: string | null;
  estimated_rental_yield?: string | null;
  hero_cover_image_url?: string | null;
  suburb?: string;
}

function mapToRawPropertyListing(
  pd: HomesPropertyDetails,
  prop: PropertyUrl,
): RawPropertyListing {
  const address = pd.address ?? prop.address.replace(/-/g, " ");
  const suburb = pd.suburb ?? capitalizeWords(prop.suburb.replace(/-/g, " "));

  return {
    address,
    title: address,
    sourceId: "homes_co_nz",
    sourceUrl: prop.url,
    platform: "homes.co.nz",
    suburb,
    area: suburb,
    price: pd.display_estimated_value_short ?? null,
    bedrooms: pd.num_bedrooms ?? null,
    bathrooms: pd.num_bathrooms ?? null,
    parking: pd.num_car_spaces ?? null,
    landArea: pd.land_area ?? null,
    floorArea: pd.floor_area ?? null,
    listedAt: null,
    openHomeTimes: [],
    rawSnapshotId: null,
    estimatedValueLow: parseShortValue(pd.display_estimated_lower_value_short),
    estimatedValueHigh: parseShortValue(pd.display_estimated_upper_value_short),
    estimatedValueDate: pd.estimated_value_revision_date ?? null,
    capitalValue: pd.capital_value ?? null,
    landValue: pd.land_value ?? null,
    improvementValue: pd.improvement_value ?? null,
    cvDate: pd.current_revision_date ?? null,
    estimatedRentalLow: parseRentalShortValue(pd.display_estimated_rental_lower_value_short),
    estimatedRentalHigh: parseRentalShortValue(pd.display_estimated_rental_upper_value_short),
    estimatedRentalYield: pd.estimated_rental_yield ?? null,
    decadeBuilt: pd.decade_built ?? null,
    contour: pd.contour ?? null,
    buildingConstruction: pd.building_construction ?? null,
    ownershipType: pd.ownership_type ?? null,
    legalDescription: pd.legal_description ?? null,
    certificateOfTitle: pd.certificate_of_title ?? null,
    imageUrl: pd.hero_cover_image_url ?? null,
  };
}

function parseShortValue(value: string | null | undefined): number | null {
  if (!value) return null;
  if (value.endsWith("K")) {
    const num = parseFloat(value.slice(0, -1));
    return Number.isNaN(num) ? null : Math.round(num * 1000);
  }
  if (value.endsWith("M")) {
    const num = parseFloat(value.slice(0, -1));
    return Number.isNaN(num) ? null : Math.round(num * 1_000_000);
  }
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : Math.round(num);
}

function parseRentalShortValue(value: string | null | undefined): number | null {
  // Rental values are just numbers like "450" (weekly) — no K/M suffix
  if (!value) return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function createFileCacheStore<T>(path: string): CacheStore<T> {
  return {
    async read() {
      try {
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async write(cache) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(cache), "utf-8");
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/adapters/homesNz.ts
git commit -m "feat: add homes.co.nz adapter with sitemap discovery and SSR data extraction

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Write adapter tests

**Files:**
- Create: `server/adapters/homesNz.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, expect, it } from "vitest";

import type { CacheStore, SitemapCache, PropertyCache } from "./homesNz";
import { createHomesNzAdapter } from "./homesNz";

function sitemapXml(entries: Array<{ url: string }>) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset>';
  for (const entry of entries) {
    xml += `<url><loc>${entry.url}</loc></url>`;
  }
  xml += "</urlset>";
  return xml;
}

function propertyPage(details: Record<string, unknown>) {
  const stateKey = "2351154191";
  const state = {
    [stateKey]: {
      b: {
        card: {
          property_details: details,
        },
      },
    },
    __nghData__: [],
  };
  return `<!DOCTYPE html><html><head></head><body>
    <script id="homes-app-state" type="application/json">${JSON.stringify(state)}</script>
  </body></html>`;
}

function response(body: string, ok = true) {
  return {
    ok,
    status: ok ? 200 : 404,
    async text() {
      return body;
    },
    async json() {
      return JSON.parse(body);
    },
  };
}

function memorySitemapCache(
  initial: SitemapCache | null = null,
): { store: CacheStore<SitemapCache>; saved(): SitemapCache | null } {
  let saved = initial;
  return {
    store: {
      async read() { return saved; },
      async write(c) { saved = c; },
    },
    saved() { return saved; },
  };
}

function memoryPropertyCache(
  initial: PropertyCache | null = null,
): { store: CacheStore<PropertyCache>; saved(): PropertyCache | null } {
  let saved = initial;
  return {
    store: {
      async read() { return saved; },
      async write(c) { saved = c; },
    },
    saved() { return saved; },
  };
}

describe("createHomesNzAdapter", () => {
  it("discovers Paraparaumu properties from sitemaps and extracts data from SSR pages", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache();
    const fetchedUrls: string[] = [];

    const adapter = createHomesNzAdapter({
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
      maxPropertiesPerFetch: 2,
      fetchImpl: async (url) => {
        fetchedUrls.push(url);
        if (url.includes("sitemapv2_properties")) {
          return response(
            sitemapXml([
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu/17-greenwood-place/eBB0X",
              },
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu-beach/11-manly-street/WAw7b",
              },
              {
                url: "https://homes.co.nz/address/paraparaumu/raumati-beach/28-kaka-road/YnY7V",
              },
            ]),
          );
        }
        if (url.includes("eBB0X")) {
          return response(
            propertyPage({
              address: "17 Greenwood Place, Paraparaumu",
              display_estimated_lower_value_short: "655K",
              display_estimated_upper_value_short: "725K",
              display_estimated_value_short: "690K",
              estimated_value_revision_date: "2026-05-14",
              capital_value: 620000,
              land_value: 370000,
              improvement_value: 250000,
              current_revision_date: "2023-08-01",
              land_area: 820,
              floor_area: 170,
              num_bedrooms: 3,
              num_bathrooms: 2,
              num_car_spaces: 2,
              decade_built: "1970",
              contour: "LV",
              ownership_type: "Freehold",
              legal_description: "LOT 2 DP 40783",
              certificate_of_title: "WN12B/750",
              hero_cover_image_url:
                "https://homes-listing-images.s3.ap-southeast-2.amazonaws.com/properties/large/92304e48",
              suburb: "Paraparaumu",
            }),
          );
        }
        return response("", false);
      },
    });

    const records = await adapter.fetch();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      address: "17 Greenwood Place, Paraparaumu",
      platform: "homes.co.nz",
      sourceUrl:
        "https://homes.co.nz/address/paraparaumu/paraparaumu/17-greenwood-place/eBB0X",
      estimatedValueLow: 655000,
      estimatedValueHigh: 725000,
      capitalValue: 620000,
      landValue: 370000,
      improvementValue: 250000,
      cvDate: "2023-08-01",
      landArea: 820,
      floorArea: 170,
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      decadeBuilt: "1970",
      contour: "LV",
      ownershipType: "Freehold",
      legalDescription: "LOT 2 DP 40783",
      certificateOfTitle: "WN12B/750",
      imageUrl:
        "https://homes-listing-images.s3.ap-southeast-2.amazonaws.com/properties/large/92304e48",
    });
    expect(fetchedUrls.filter((u) => u.includes("eBB0X"))).toHaveLength(1);
    expect(fetchedUrls.filter((u) => u.includes("WAw7b"))).toHaveLength(1);
    expect(fetchedUrls.filter((u) => u.includes("YnY7V"))).toHaveLength(0); // capped at 2
  });

  it("skips properties already in cache", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache({
      fetchedAt: "2026-05-20T00:00:00.000Z",
      revisions: {
        eBB0X: "2026-05-14",
      },
    });
    const fetchedUrls: string[] = [];

    const adapter = createHomesNzAdapter({
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
      maxPropertiesPerFetch: 5,
      fetchImpl: async (url) => {
        fetchedUrls.push(url);
        if (url.includes("sitemapv2_properties")) {
          return response(
            sitemapXml([
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu/17-greenwood-place/eBB0X",
              },
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu-beach/11-manly-street/WAw7b",
              },
            ]),
          );
        }
        if (url.includes("WAw7b")) {
          return response(
            propertyPage({
              address: "11 Manly Street, Paraparaumu Beach",
              suburb: "Paraparaumu Beach",
              display_estimated_value_short: "800K",
              estimated_value_revision_date: "2026-05-18",
            }),
          );
        }
        return response("", false);
      },
    });

    const records = await adapter.fetch();

    expect(records).toHaveLength(1);
    // eBB0X should NOT have been fetched (cached)
    expect(fetchedUrls.filter((u) => u.includes("eBB0X"))).toHaveLength(0);
    expect(fetchedUrls.filter((u) => u.includes("WAw7b"))).toHaveLength(1);
    expect(records[0]).toMatchObject({
      address: "11 Manly Street, Paraparaumu Beach",
    });
  });

  it("returns empty when all properties are cached", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache({
      fetchedAt: "2026-05-20T00:00:00.000Z",
      revisions: {
        eBB0X: "2026-05-14",
        WAw7b: "2026-05-18",
      },
    });
    const fetchedUrls: string[] = [];

    const adapter = createHomesNzAdapter({
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
      maxPropertiesPerFetch: 5,
      fetchImpl: async (url) => {
        fetchedUrls.push(url);
        if (url.includes("sitemapv2_properties")) {
          return response(
            sitemapXml([
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu/17-greenwood-place/eBB0X",
              },
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu-beach/11-manly-street/WAw7b",
              },
            ]),
          );
        }
        return response("", false);
      },
    });

    const records = await adapter.fetch();

    // Both cached, no property pages fetched
    expect(records).toHaveLength(0);
    const pageFetches = fetchedUrls.filter((u) => u.includes("address/"));
    expect(pageFetches).toHaveLength(0);
  });

  it("returns null for malformed SSR pages (missing script tag)", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache();

    const adapter = createHomesNzAdapter({
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
      maxPropertiesPerFetch: 3,
      fetchImpl: async (url) => {
        if (url.includes("sitemapv2_properties")) {
          return response(
            sitemapXml([
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu/17-greenwood-place/eBB0X",
              },
            ]),
          );
        }
        // Return HTML without homes-app-state script
        return response(
          "<!DOCTYPE html><html><body>404 Not Found</body></html>",
          true,
        );
      },
    });

    const records = await adapter.fetch();
    expect(records).toHaveLength(0);
  });

  it("parses '1.2M' format values correctly", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache();

    const adapter = createHomesNzAdapter({
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
      maxPropertiesPerFetch: 2,
      fetchImpl: async (url) => {
        if (url.includes("sitemapv2_properties")) {
          return response(
            sitemapXml([
              {
                url: "https://homes.co.nz/address/paraparaumu/paraparaumu/23-test-street/ABCDE",
              },
            ]),
          );
        }
        return response(
          propertyPage({
            address: "23 Test Street, Paraparaumu",
            display_estimated_lower_value_short: "1.2M",
            display_estimated_upper_value_short: "1.5M",
            suburb: "Paraparaumu",
          }),
        );
      },
    });

    const records = await adapter.fetch();
    expect(records[0]).toMatchObject({
      estimatedValueLow: 1_200_000,
      estimatedValueHigh: 1_500_000,
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npx vitest run server/adapters/homesNz.test.ts
```
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add server/adapters/homesNz.test.ts
git commit -m "test: add homes.co.nz adapter tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Register adapter in source config

**Files:**
- Modify: `server/adapters/sourceConfig.ts`

- [ ] **Step 1: Import and register the adapter**

Add import at top:
```typescript
import { createHomesNzAdapter } from "./homesNz";
```

Add to `allConfiguredAdapters()` array:
```typescript
{ adapter: createHomesNzAdapter(), status: "active" },
```

- [ ] **Step 2: Verify typecheck and tests**

```bash
npm run typecheck && npx vitest run server/adapters/sourceConfig.test.ts
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/adapters/sourceConfig.ts
git commit -m "feat: register homes.co.nz adapter in source config

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Update frontend types and PropertyDetail component

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/app/PropertyDetail.tsx`

- [ ] **Step 1: Add new fields to frontend `PropertyListing` interface**

In `src/lib/types.ts`, add after `notes: string | null;` (line 76):

```typescript
  estimatedValueLow: number | null;
  estimatedValueHigh: number | null;
  estimatedValueDate: string | null;
  capitalValue: number | null;
  landValue: number | null;
  improvementValue: number | null;
  cvDate: string | null;
  estimatedRentalLow: number | null;
  estimatedRentalHigh: number | null;
  estimatedRentalYield: string | null;
  decadeBuilt: string | null;
  contour: string | null;
  buildingConstruction: string | null;
  ownershipType: string | null;
  legalDescription: string | null;
  certificateOfTitle: string | null;
  imageUrl: string | null;
```

- [ ] **Step 2: Add image and new fields to PropertyDetail**

In `src/app/PropertyDetail.tsx`, add image display after the `</header>` closing tag:

```tsx
      {property?.imageUrl && (
        <section className="detail-hero">
          <img
            src={property.imageUrl}
            alt={item.title}
            className="property-hero-image"
          />
        </section>
      )}
```

Add valuation/council section after the existing `<dl>` (before `</section>` for `detail-fields`):

```tsx
          {property?.estimatedValueLow != null && (
            <>
              <dt>HomesEstimate</dt>
              <dd>
                ${property.estimatedValueLow.toLocaleString()} – $
                {property.estimatedValueHigh?.toLocaleString()}
                {property.estimatedValueDate && (
                  <> (as of {new Date(property.estimatedValueDate).toLocaleDateString()})</>
                )}
              </dd>
            </>
          )}
          {property?.capitalValue != null && (
            <>
              <dt>CV</dt>
              <dd>
                ${property.capitalValue.toLocaleString()}
                {property.cvDate && (
                  <> (as of {new Date(property.cvDate).toLocaleDateString()})</>
                )}
              </dd>
            </>
          )}
          {property?.landValue != null && (
            <>
              <dt>Land Value</dt>
              <dd>${property.landValue.toLocaleString()}</dd>
            </>
          )}
          {property?.improvementValue != null && (
            <>
              <dt>Improvement Value</dt>
              <dd>${property.improvementValue.toLocaleString()}</dd>
            </>
          )}
          {property?.estimatedRentalLow != null && (
            <>
              <dt>Rental Estimate</dt>
              <dd>
                ${property.estimatedRentalLow} – ${property.estimatedRentalHigh}/wk
                {property.estimatedRentalYield && <> ({property.estimatedRentalYield} yield)</>}
              </dd>
            </>
          )}
          {property?.decadeBuilt && (
            <>
              <dt>Decade Built</dt>
              <dd>{property.decadeBuilt}s</dd>
            </>
          )}
          {property?.contour && (
            <>
              <dt>Contour</dt>
              <dd>{property.contour}</dd>
            </>
          )}
          {property?.ownershipType && (
            <>
              <dt>Ownership</dt>
              <dd>{property.ownershipType}</dd>
            </>
          )}
          {property?.legalDescription && (
            <>
              <dt>Legal Description</dt>
              <dd>{property.legalDescription}</dd>
            </>
          )}
          {property?.certificateOfTitle && (
            <>
              <dt>Title</dt>
              <dd>{property.certificateOfTitle}</dd>
            </>
          )}
```

- [ ] **Step 3: Verify typecheck and build**

```bash
npm run typecheck && npm run build
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/app/PropertyDetail.tsx
git commit -m "feat: display homes.co.nz valuation, council data and image in property detail

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: PASS

- [ ] **Step 3: Verify git status is clean**

```bash
git status
```

- [ ] **Step 4: Run dev server and spot-check**

```bash
npm run dev
```

Open the app, check that it loads without errors. If the adapter has run, the `homes.co.nz` properties should appear in the property list with their valuation data, and the detail page should show the image and council fields.
