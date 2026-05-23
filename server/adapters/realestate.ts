import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { SourceAdapter } from "./types";
import type { RawPropertyListing } from "../pipeline/normalize";

const PLATFORM_API = "https://platform.realestate.co.nz";
const SITEMAP_URL = "https://www.realestate.co.nz/residential-sale-listings.xml";
const LISTING_API = `${PLATFORM_API}/search/v1/listings`;
const CACHE_PATH = "data/realestate-cache.json";

interface ListingPhoto {
  "base-url"?: string;
  large?: string;
  medium?: string;
  small?: string;
}

interface ListingAttributes {
  "bedroom-count"?: number;
  "bathroom-count"?: number;
  "land-area"?: number;
  "floor-area"?: number;
  "price-display"?: string;
  "published-date"?: string;
  "listing-sub-type"?: string;
  "open-homes"?: Array<{
    start?: string;
    end?: string;
  }>;
  photos?: ListingPhoto[];
  address?: {
    "full-address"?: string;
    suburb?: string;
    "display-address"?: string;
  };
}

interface ListingResponse {
  data?: {
    id?: string;
    attributes?: ListingAttributes;
  };
}

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

interface ListingUrl {
  id: string;
  url: string;
  lastmod: string | null;
}

export interface RealestateCache {
  fetchedAt: string;
  listings: Record<string, string>;
}

export interface RealestateCacheStore {
  read(): Promise<RealestateCache | null>;
  write(cache: RealestateCache): Promise<void>;
}

export interface RealestateAdapterOptions {
  fetchImpl?: FetchImpl;
  cacheStore?: RealestateCacheStore;
  maxListingsPerFetch?: number;
  throttleMs?: number;
  now?: () => string;
}

export function createRealestateAdapter(
  options: RealestateAdapterOptions = {},
): SourceAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cacheStore = options.cacheStore ?? createFileCacheStore(CACHE_PATH);
  const maxListingsPerFetch = options.maxListingsPerFetch ?? 20;
  const throttleMs = options.throttleMs ?? 500;
  const now = options.now ?? (() => new Date().toISOString());

  return {
    sourceId: "realestate_co_nz",
    recordType: "property_listing",
    source: {
      name: "realestate.co.nz",
      type: "property_platform",
      url: "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 360,
    },
    async fetch(): Promise<RawPropertyListing[]> {
      const allListings = await discoverParaparaumuListings(fetchImpl);
      const cache = await cacheStore.read();
      const changed = findChanged(allListings, cache);
      const pending = changed.slice(0, maxListingsPerFetch);

      if (pending.length === 0) return [];

      const results: RawPropertyListing[] = [];
      const successfullyProcessed: ListingUrl[] = [];
      for (const listing of pending) {
        try {
          const result = await fetchListing(fetchImpl, listing.id, listing.url);
          if (result) {
            results.push(result);
            successfullyProcessed.push(listing);
          }
        } catch {
          // Keep failed listings out of cache so the next refresh can retry them.
        }
        if (throttleMs > 0) {
          await sleep(throttleMs);
        }
      }

      if (successfullyProcessed.length > 0) {
        await cacheStore.write(mergeCache(cache, successfullyProcessed, now()));
      }

      return results;
    },
  };
}

function findChanged(
  listings: ListingUrl[],
  cache: RealestateCache | null,
): ListingUrl[] {
  if (!cache) return listings;

  const cached = cache.listings;
  const changed = listings.filter((l) => {
    const prev = cached[l.id];
    if (prev === undefined) return true; // new listing
    if (l.lastmod && l.lastmod !== prev) return true; // updated
    return false;
  });

  return changed;
}

async function discoverParaparaumuListings(
  fetchImpl: FetchImpl,
): Promise<ListingUrl[]> {
  const response = await fetchImpl(SITEMAP_URL, {
    headers: { "User-Agent": "paraparaumu-dashboard/0.1" },
  });

  if (!response.ok) {
    throw new Error(`Sitemap fetch failed: ${response.status}`);
  }

  const text = await response.text();
  const seen = new Set<string>();
  const urls: ListingUrl[] = [];

  // parse sitemap <url> blocks containing 'paraparaumu'
  const blockRegex = /<url>\s*<loc>(https:\/\/www\.realestate\.co\.nz\/(\d+)\/residential\/sale\/[^<]*paraparaumu[^<]*)<\/loc>\s*(?:<[^>]+>[^<]*<\/[^>]+>\s*)*<lastmod>([^<]+)<\/lastmod>/gi;
  let match = blockRegex.exec(text);
  while (match !== null) {
    const fullUrl = match[1]!;
    const id = match[2]!;
    const lastmod = match[3] ?? null;
    if (!seen.has(id)) {
      seen.add(id);
      urls.push({ id, url: fullUrl, lastmod });
    }
    match = blockRegex.exec(text);
  }

  return urls;
}

async function fetchListing(
  fetchImpl: FetchImpl,
  id: string,
  listingUrl: string,
): Promise<RawPropertyListing | null> {
  const apiUrl = `${LISTING_API}/${id}?include=agents,offices`;
  const response = await fetchImpl(apiUrl, {
    headers: {
      "User-Agent": "paraparaumu-dashboard/0.1",
      Origin: "https://www.realestate.co.nz",
      Accept: "application/vnd.api+json",
    },
  });

  if (!response.ok) return null;

  const body = (await response.json()) as ListingResponse;
  const attrs = body.data?.attributes;
  if (!attrs) return null;

  const address = attrs.address;
  const fullAddress = address?.["full-address"] ?? address?.["display-address"] ?? "Unknown address";
  const suburb = address?.suburb ?? "Paraparaumu";
  const openHomeTimes = (attrs["open-homes"] ?? [])
    .map((oh) => oh.start)
    .filter((s): s is string => s !== undefined);

  const firstPhoto = attrs.photos?.[0];
  const imageUrl = firstPhoto?.["base-url"]
    ? `https://imgs.realestate.co.nz${firstPhoto["base-url"]}${firstPhoto.large ?? ""}`
    : null;

  return {
    address: fullAddress,
    title: fullAddress,
    sourceId: "realestate_co_nz",
    sourceUrl: listingUrl,
    platform: "realestate.co.nz",
    suburb,
    area: suburb,
    price: attrs["price-display"] ?? null,
    bedrooms: attrs["bedroom-count"] ?? null,
    bathrooms: attrs["bathroom-count"] ?? null,
    parking: null,
    landArea: attrs["land-area"] ?? null,
    floorArea: attrs["floor-area"] ?? null,
    listedAt: attrs["published-date"] ?? null,
    openHomeTimes,
    imageUrl,
    rawSnapshotId: null,
  };
}

function mergeCache(
  existing: RealestateCache | null,
  processedListings: ListingUrl[],
  fetchedAt: string,
): RealestateCache {
  const listings = { ...(existing?.listings ?? {}) };

  for (const listing of processedListings) {
    if (listing.lastmod) {
      listings[listing.id] = listing.lastmod;
    }
  }

  return {
    fetchedAt,
    listings,
  };
}

function createFileCacheStore(path: string): RealestateCacheStore {
  return {
    async read() {
      try {
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw) as RealestateCache;
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
