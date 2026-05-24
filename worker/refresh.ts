import { refreshAll } from "../server/jobs/refreshAll";
import { adaptersForRegion, globalAdapters, type AdapterCacheOptions } from "../server/adapters/sourceConfig";
import { allRegions } from "../server/config/regions";
import type { SitemapCache, PropertyCache } from "../server/adapters/homesNz";
import type { RealestateCache } from "../server/adapters/realestate";
import { createD1CacheStore } from "./d1CacheStore";
import { createD1Repositories } from "./d1Repository";

interface Env {
  DB: D1Database;
}

const DAY_TO_REGION: Record<number, string> = {
  1: "kapiti",
  2: "wellington",
  3: "lower-hutt",
  4: "upper-hutt",
  5: "porirua",
  6: "kapiti",
};

export async function scheduledRefresh(
  event: { scheduledTime: number; cron: string },
  env: Env,
): Promise<void> {
  const repos = createD1Repositories(env.DB);
  const regionId = selectRegion(event.scheduledTime);

  if (regionId === "ALL") {
    console.log("[refresh] Sunday full sweep — all regions");
    for (const region of allRegions()) {
      console.log(`[refresh] Processing region: ${region.id}`);
      const adapters = [
        ...globalAdapters(),
        ...adaptersForRegion(region.id, cacheOptionsForRegion(env.DB, region.id)),
      ];
      const results = await refreshAll({ repositories: repos, adapters, force: true });
      logResults(results);
    }
  } else {
    console.log(`[refresh] Processing region: ${regionId}`);
    const adapters = [
      ...globalAdapters(),
      ...adaptersForRegion(regionId, cacheOptionsForRegion(env.DB, regionId)),
    ];
    const results = await refreshAll({ repositories: repos, adapters, force: true });
    logResults(results);
  }

  console.log("[refresh] Done");
}

function selectRegion(scheduledTime: number): string {
  const day = new Date(scheduledTime).getUTCDay(); // 0=Sun, 1=Mon, ...
  if (day === 0) return "ALL";
  return DAY_TO_REGION[day] ?? "kapiti";
}

function cacheOptionsForRegion(db: D1Database, regionId: string): AdapterCacheOptions {
  return {
    sitemapCacheStore: createD1CacheStore<SitemapCache>(
      db,
      `homes-nz-sitemap-cache-${regionId}`,
    ),
    propertyCacheStore: createD1CacheStore<PropertyCache>(
      db,
      `homes-nz-property-cache-${regionId}`,
    ),
    realestateCacheStore: createD1CacheStore<RealestateCache>(
      db,
      `realestate-cache-${regionId}`,
    ),
  };
}

function logResults(results: Array<{ sourceId: string; status: string; recordsProcessed: number; error?: string }>) {
  for (const r of results) {
    if (r.status === "error") {
      console.error(`[refresh] ${r.sourceId}: ${r.status} — ${r.error}`);
    } else {
      console.log(`[refresh] ${r.sourceId}: ${r.status} (${r.recordsProcessed} records)`);
    }
  }
}
