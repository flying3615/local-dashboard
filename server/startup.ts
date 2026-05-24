import type { SourceAdapter } from "./adapters/types";
import { adaptersForRegion, globalAdapters, mockAdapters, type AdapterCacheOptions } from "./adapters/sourceConfig";
import { createFileCacheStore } from "./adapters/fileCacheStore";
import { allRegions } from "./config/regions";
import type { createRepositories } from "./db/repositories";
import { refreshAll } from "./jobs/refreshAll";
import type { SitemapCache } from "./adapters/homesNz";
import type { PropertyCache } from "./adapters/homesNz";
import type { RealestateCache } from "./adapters/realestate";

type Environment = Record<string, string | undefined>;
type Repositories = ReturnType<typeof createRepositories>;

function cacheOptionsForRegion(regionId: string): AdapterCacheOptions {
  return {
    sitemapCacheStore: createFileCacheStore<SitemapCache>(`data/homes-nz-sitemap-cache-${regionId}.json`),
    propertyCacheStore: createFileCacheStore<PropertyCache>(`data/homes-nz-property-cache-${regionId}.json`),
    realestateCacheStore: createFileCacheStore<RealestateCache>(`data/realestate-cache-${regionId}.json`),
  };
}

export function shouldSeedMockData(env: Environment): boolean {
  return env.ENABLE_MOCK_DATA === "true";
}

export function runtimeAdapters(env: Environment): SourceAdapter[] {
  const regionAdapters = allRegions().flatMap((region) =>
    adaptersForRegion(region.id, cacheOptionsForRegion(region.id)),
  );
  const all = [...globalAdapters(), ...regionAdapters];
  return shouldSeedMockData(env)
    ? [...mockAdapters(), ...all]
    : all;
}

export function registerAdapterSources(
  repositories: Repositories,
  adapters: SourceAdapter[],
): void {
  for (const adapter of adapters) {
    const existing = repositories.sources.get(adapter.sourceId);
    repositories.sources.upsert({
      id: adapter.sourceId,
      name: adapter.source.name,
      type: adapter.source.type,
      url: adapter.source.url,
      trustLevel: adapter.source.trustLevel,
      enabled: existing?.enabled ?? adapter.source.enabled ?? false,
      refreshIntervalMinutes:
        existing?.refreshIntervalMinutes ??
        adapter.source.refreshIntervalMinutes ??
        1440,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastError: existing?.lastError ?? null,
    });
  }
}

export async function initialFetchIfNeeded(
  repositories: Repositories,
  adapters: SourceAdapter[],
): Promise<void> {
  const needsFetch = adapters.filter((adapter) => {
    const source = repositories.sources.get(adapter.sourceId);
    return source?.enabled && source.lastSuccessAt === null;
  });

  if (needsFetch.length === 0) return;

  console.log(`Initial fetch for: ${needsFetch.map((a) => a.sourceId).join(", ")}`);
  await refreshAll({ repositories, adapters: needsFetch, force: true });
}
