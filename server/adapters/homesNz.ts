import { createNoopCacheStore, type CacheStore } from "./cacheStore";
import type { SourceAdapter } from "./types";
import type { RawPropertyListing } from "../pipeline/normalize";
import type { RegionConfig } from "../config/regions";

const SITEMAP_BASE = "https://homes.co.nz/sitemapv2_properties";
const SITEMAP_COUNT = 40;

type FetchResponse = {
  ok: boolean;
  status: number;
  headers?: Headers;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
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

export interface SitemapCache {
  fetchedAt: string;
  properties: PropertyUrl[];
  nextSitemapIndex?: number;
  complete?: boolean;
}

export interface PropertyCache {
  fetchedAt: string;
  revisions: Record<string, string>;
}

export interface HomesNzAdapterOptions {
  fetchImpl?: FetchImpl;
  sitemapCacheStore?: CacheStore<SitemapCache>;
  propertyCacheStore?: CacheStore<PropertyCache>;
  maxPropertiesPerFetch?: number;
  sitemapPagesPerFetch?: number;
  throttleMs?: number;
  now?: () => string;
  region?: RegionConfig;
}

export function createHomesNzAdapter(
  options: HomesNzAdapterOptions = {},
): SourceAdapter {
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchImpl);
  const region = options.region;
  const sourceId = region ? `homes_co_nz_${region.id}` : "homes_co_nz";
  const sitemapFilter = region?.homesNzSitemapFilter ?? "paraparaumu";
  const regionPath = region?.homesNzPath ?? "wellington/kapiti-coast/paraparaumu";
  const sitemapCachePath = region ? `data/homes-nz-sitemap-cache-${region.id}.json` : "data/homes-nz-sitemap-cache.json";
  const propertyCachePath = region ? `data/homes-nz-property-cache-${region.id}.json` : "data/homes-nz-property-cache.json";
  const sitemapCacheStore =
    options.sitemapCacheStore ??
    createNoopCacheStore<SitemapCache>();
  const propertyCacheStore =
    options.propertyCacheStore ??
    createNoopCacheStore<PropertyCache>();
  const maxPropertiesPerFetch = options.maxPropertiesPerFetch ?? 20;
  const sitemapPagesPerFetch = options.sitemapPagesPerFetch ?? SITEMAP_COUNT;
  const throttleMs = options.throttleMs ?? 500;
  const now = options.now ?? (() => new Date().toISOString());
  const regionId = region?.id ?? "kapiti";

  return {
    sourceId,
    recordType: "property_listing",
    source: {
      name: "homes.co.nz",
      type: "property_data",
      url: `https://homes.co.nz/map/${regionPath}`,
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 1440,
    },
    async fetch(): Promise<RawPropertyListing[]> {
      const allProperties = await discoverRegionProperties(
        fetchImpl,
        sitemapCacheStore,
        now(),
        sitemapFilter,
        sourceId,
        regionId,
        sitemapPagesPerFetch,
      );
      const cache = await propertyCacheStore.read();
      const changed = findChanged(allProperties, cache, now());
      const pending = changed.slice(0, maxPropertiesPerFetch);

      if (pending.length === 0) return [];

      const results: RawPropertyListing[] = [];
      const fetchedAt = now();
      const newRevisions: Record<string, string> = {
        ...(cache?.revisions ?? {}),
      };

      for (const prop of pending) {
        try {
          const result = await fetchPropertyPage(fetchImpl, prop, sourceId, regionId);
          if (result) {
            results.push(result);
            newRevisions[prop.id] = result.estimatedValueDate ?? fetchedAt;
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

async function discoverRegionProperties(
  fetchImpl: FetchImpl,
  sitemapCacheStore: CacheStore<SitemapCache>,
  now: string,
  sitemapFilter: string,
  sourceId: string,
  regionId: string,
  sitemapPagesPerFetch: number,
): Promise<PropertyUrl[]> {
  const cached = await sitemapCacheStore.read();
  const cacheAge = cached ? Date.parse(now) - Date.parse(cached.fetchedAt) : null;
  if (cached) {
    const isFresh = cacheAge !== null && cacheAge < 30 * 24 * 60 * 60 * 1000;
    const isComplete = cached.complete ?? true;
    if (isFresh && isComplete) {
      return cached.properties;
    }
  }

  const canContinue =
    cached !== null &&
    cacheAge !== null &&
    cacheAge < 30 * 24 * 60 * 60 * 1000 &&
    cached.complete === false;
  const allProperties: PropertyUrl[] = canContinue ? [...cached.properties] : [];
  const seen = new Set(allProperties.map((property) => property.id));
  const startIndex = canContinue ? cached.nextSitemapIndex ?? 1 : 1;
  const endIndex = Math.min(
    SITEMAP_COUNT,
    startIndex + Math.max(1, sitemapPagesPerFetch) - 1,
  );
  const escapedFilter = sitemapFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<url>\\s*<loc>(https:\\/\\/homes\\.co\\.nz\\/address\\/${escapedFilter}\\/([^<]+)\\/([^<]+)\\/([A-Za-z0-9]+))<\\/loc>`,
    "g",
  );

  for (let i = startIndex; i <= endIndex; i++) {
    const url = `${SITEMAP_BASE}${i}.xml.gz`;
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "paraparaumu-dashboard/0.1" },
    });

    if (!response.ok) {
      throw new Error(
        `Sitemap fetch failed: ${url} status ${response.status}`,
      );
    }

    for await (const chunk of streamSitemapText(response)) {
      let match = pattern.exec(chunk);
      while (match !== null) {
        const fullUrl = match[1]!;
        const suburb = match[2]!;
        const addressSlug = match[3]!;
        const id = match[4]!;
        if (!seen.has(id)) {
          seen.add(id);
          allProperties.push({ id, url: fullUrl, address: addressSlug, suburb });
        }
        match = pattern.exec(chunk);
      }
      pattern.lastIndex = 0;
    }
  }

  const complete = endIndex >= SITEMAP_COUNT;
  await sitemapCacheStore.write({
    fetchedAt: now,
    properties: allProperties,
    nextSitemapIndex: complete ? undefined : endIndex + 1,
    complete,
  });
  return allProperties;
}

async function* streamSitemapText(response: FetchResponse): AsyncGenerator<string> {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let readable: ReadableStream<Uint8Array>;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const ds = new DecompressionStream("gzip");
    readable = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }).pipeThrough(ds);
  } else {
    readable = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  const reader = readable.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

function findChanged(
  properties: PropertyUrl[],
  cache: PropertyCache | null,
  now: string,
): PropertyUrl[] {
  if (!cache) return properties;

  // Skip properties fetched within the last 24 hours
  const cacheAge = Date.parse(now) - Date.parse(cache.fetchedAt);
  if (cacheAge < 24 * 60 * 60 * 1000) {
    const cached = cache.revisions;
    return properties.filter((p) => !(p.id in cached));
  }

  // Cache expired — re-check all
  return properties;
}

async function fetchPropertyPage(
  fetchImpl: FetchImpl,
  prop: PropertyUrl,
  sourceId: string,
  regionId: string,
): Promise<RawPropertyListing | null> {
  const response = await fetchImpl(prop.url, {
    headers: { "User-Agent": "paraparaumu-dashboard/0.1" },
  });

  if (!response.ok) return null;

  const html = await response.text();

  const scriptMatch = html.match(
    /<script\s+id="homes-app-state"\s+type="application\/json">([^<]*)<\/script>/,
  );
  if (!scriptMatch?.[1]) return null;

  let state: Record<string, unknown>;
  try {
    state = JSON.parse(scriptMatch[1]);
  } catch {
    return null;
  }

  // Navigate from first non-__nghData__ key → b → card → property_details
  const stateKey = Object.keys(state).find((k) => k !== "__nghData__");
  if (!stateKey) return null;

  const b = (state[stateKey] as Record<string, unknown>)?.b as
    | { card?: { property_details?: Record<string, unknown> } }
    | undefined;
  const pd = b?.card?.property_details;
  if (!pd) return null;

  return mapToRawPropertyListing(pd, prop, sourceId, regionId);
}

function mapToRawPropertyListing(
  pd: Record<string, unknown>,
  prop: PropertyUrl,
  sourceId: string,
  regionId: string,
): RawPropertyListing {
  const address =
    (pd.address as string) ?? prop.address.replace(/-/g, " ");
  const suburb =
    (pd.suburb as string) ??
    capitalizeWords(prop.suburb.replace(/-/g, " "));

  return {
    address,
    title: address,
    sourceId,
    sourceUrl: prop.url,
    platform: "homes.co.nz",
    suburb,
    area: suburb,
    price: (pd.display_estimated_value_short as string) ?? null,
    bedrooms: (pd.num_bedrooms as number) ?? null,
    bathrooms: (pd.num_bathrooms as number) ?? null,
    parking: (pd.num_car_spaces as number) ?? null,
    landArea: (pd.land_area as number) ?? null,
    floorArea: (pd.floor_area as number) ?? null,
    listedAt: null,
    openHomeTimes: [],
    rawSnapshotId: null,
    estimatedValueLow: parseShortValue(
      pd.display_estimated_lower_value_short as string | null | undefined,
    ),
    estimatedValueHigh: parseShortValue(
      pd.display_estimated_upper_value_short as string | null | undefined,
    ),
    estimatedValueDate:
      (pd.estimated_value_revision_date as string) ?? null,
    capitalValue: (pd.capital_value as number) ?? null,
    landValue: (pd.land_value as number) ?? null,
    improvementValue: (pd.improvement_value as number) ?? null,
    cvDate: (pd.current_revision_date as string) ?? null,
    estimatedRentalLow: parseRentalShortValue(
      pd.display_estimated_rental_lower_value_short as
        | string
        | null
        | undefined,
    ),
    estimatedRentalHigh: parseRentalShortValue(
      pd.display_estimated_rental_upper_value_short as
        | string
        | null
        | undefined,
    ),
    estimatedRentalYield: (pd.estimated_rental_yield as string) ?? null,
    decadeBuilt: (pd.decade_built as string) ?? null,
    contour: (pd.contour as string) ?? null,
    buildingConstruction: (pd.building_construction as string) ?? null,
    ownershipType: (pd.ownership_type as string) ?? null,
    legalDescription: (pd.legal_description as string) ?? null,
    certificateOfTitle: (pd.certificate_of_title as string) ?? null,
    imageUrl: (pd.hero_cover_image_url as string) ?? null,
    region: regionId,
  };
}

function parseShortValue(
  value: string | null | undefined,
): number | null {
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

function parseRentalShortValue(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
