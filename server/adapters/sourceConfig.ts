import type { SourceAdapter } from "./types";
import { createEducationCountsAdapter } from "./educationCounts";
import { createKapitiCouncilAdapter } from "./kapitiCouncil";
import { createWellingtonCouncilAdapter } from "./wellingtonCouncil";
import { createPoriruaCouncilAdapter } from "./poriruaCouncil";
import { createTradeMeAdapter } from "./propertySearches";
import { createRealestateAdapter } from "./realestate";
import { createHomesNzAdapter } from "./homesNz";
import { createMockPropertyAdapter } from "./mockProperties";
import { createMockSchoolAdapter } from "./mockSchools";
import { getRegion, defaultRegion, type RegionConfig } from "../config/regions";
import type { SitemapCache, PropertyCache, HomesNzAdapterOptions } from "./homesNz";
import type { RealestateCache, RealestateAdapterOptions } from "./realestate";
import type { CacheStore } from "./cacheStore";

export type AdapterStatus = "active" | "not_implemented" | "disabled";

export interface ConfiguredAdapter {
  adapter: SourceAdapter;
  status: AdapterStatus;
}

export function allConfiguredAdapters(): ConfiguredAdapter[] {
  return [
    { adapter: createTradeMeAdapter(), status: "not_implemented" },
    { adapter: createHomesNzAdapter(), status: "active" },
    { adapter: createRealestateAdapter(), status: "active" },
    { adapter: createEducationCountsAdapter(), status: "active" },
    { adapter: createKapitiCouncilAdapter(), status: "active" },
    { adapter: createWellingtonCouncilAdapter(), status: "active" },
    { adapter: createPoriruaCouncilAdapter(), status: "active" },
  ];
}

export function activeAdapters(): SourceAdapter[] {
  return allConfiguredAdapters()
    .filter((ca) => ca.status === "active")
    .map((ca) => ca.adapter);
}

export interface AdapterCacheOptions {
  sitemapCacheStore?: CacheStore<SitemapCache>;
  propertyCacheStore?: CacheStore<PropertyCache>;
  realestateCacheStore?: CacheStore<RealestateCache>;
}

export function adaptersForRegion(
  regionId?: string,
  cacheOptions?: AdapterCacheOptions,
): SourceAdapter[] {
  const region: RegionConfig = (regionId ? getRegion(regionId) : undefined) ?? defaultRegion();

  const homesOpts: HomesNzAdapterOptions = { region };
  if (cacheOptions?.sitemapCacheStore) homesOpts.sitemapCacheStore = cacheOptions.sitemapCacheStore;
  if (cacheOptions?.propertyCacheStore) homesOpts.propertyCacheStore = cacheOptions.propertyCacheStore;

  const realestateOpts: RealestateAdapterOptions = { region };
  if (cacheOptions?.realestateCacheStore) realestateOpts.cacheStore = cacheOptions.realestateCacheStore;

  return [
    createHomesNzAdapter(homesOpts),
    createRealestateAdapter(realestateOpts),
    ...councilAdaptersForRegion(region),
  ];
}

export function globalAdapters(): SourceAdapter[] {
  return [createEducationCountsAdapter()];
}

function councilAdaptersForRegion(region: RegionConfig): SourceAdapter[] {
  switch (region.id) {
    case "kapiti":
      return [createKapitiCouncilAdapter()];
    case "wellington":
      return [createWellingtonCouncilAdapter()];
    case "porirua":
      return [createPoriruaCouncilAdapter()];
    default:
      return [];
  }
}

export function mockAdapters(): SourceAdapter[] {
  return [createMockPropertyAdapter(), createMockSchoolAdapter()];
}
