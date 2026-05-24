import { describe, expect, it } from "vitest";

import { createInMemoryDatabase } from "./db/database";
import { createRepositories } from "./db/repositories";
import {
  initialFetchIfNeeded,
  registerAdapterSources,
  runtimeAdapters,
  shouldSeedMockData,
} from "./startup";
import type { SourceAdapter } from "./adapters/types";

describe("startup", () => {
  it("does not include mock adapters by default", () => {
    expect(shouldSeedMockData({})).toBe(false);
    const sourceIds = runtimeAdapters({}).map((a) => a.sourceId).sort();
    expect(sourceIds).toEqual([
      "education_counts",
      "homes_co_nz_kapiti",
      "homes_co_nz_lower-hutt",
      "homes_co_nz_porirua",
      "homes_co_nz_upper-hutt",
      "homes_co_nz_wellington",
      "kapiti_council",
      "porirua_council",
      "realestate_co_nz_kapiti",
      "realestate_co_nz_lower-hutt",
      "realestate_co_nz_porirua",
      "realestate_co_nz_upper-hutt",
      "realestate_co_nz_wellington",
      "wellington_council",
    ]);
  });

  it("includes mock adapters only when explicitly enabled", () => {
    expect(shouldSeedMockData({ ENABLE_MOCK_DATA: "true" })).toBe(true);
    const sourceIds = runtimeAdapters({ ENABLE_MOCK_DATA: "true" })
      .map((a) => a.sourceId);
    expect(sourceIds[0]).toBe("mock_properties");
    expect(sourceIds[1]).toBe("mock_schools");
    expect(sourceIds.slice(2)).toEqual(
      expect.arrayContaining(["education_counts", "kapiti_council"]),
    );
  });

  it("preserves existing source refresh state when registering adapters", () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);
    const [adapter] = runtimeAdapters({});

    repos.sources.upsert({
      id: adapter!.sourceId,
      name: adapter!.source.name,
      type: adapter!.source.type,
      url: adapter!.source.url,
      trustLevel: adapter!.source.trustLevel,
      enabled: true,
      refreshIntervalMinutes: 60,
      lastSuccessAt: "2026-05-18T01:00:00.000Z",
      lastError: "Old error",
    });

    registerAdapterSources(repos, [adapter!]);

    expect(repos.sources.get(adapter!.sourceId)).toMatchObject({
      enabled: true,
      refreshIntervalMinutes: 60,
      lastSuccessAt: "2026-05-18T01:00:00.000Z",
      lastError: "Old error",
    });

    db.close();
  });
});

describe("initialFetchIfNeeded", () => {
  function stubAdapter(sourceId: string): SourceAdapter {
    return {
      sourceId,
      recordType: "property_listing",
      source: {
        name: sourceId,
        type: "property_platform",
        url: "https://example.com",
        trustLevel: "platform",
        enabled: true,
        refreshIntervalMinutes: 1440,
      },
      async fetch() {
        return [];
      },
    };
  }

  it("fetches adapters that have never succeeded", async () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);
    const adapter = stubAdapter("test_source");

    registerAdapterSources(repos, [adapter]);
    expect(repos.sources.get("test_source")?.lastSuccessAt).toBeNull();

    await initialFetchIfNeeded(repos, [adapter]);

    expect(repos.sources.get("test_source")?.lastSuccessAt).not.toBeNull();

    db.close();
  });

  it("skips adapters that have already fetched", async () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);
    let fetchCount = 0;
    const adapter: SourceAdapter = {
      ...stubAdapter("test_source"),
      async fetch() {
        fetchCount++;
        return [];
      },
    };

    registerAdapterSources(repos, [adapter]);
    await initialFetchIfNeeded(repos, [adapter]);
    expect(fetchCount).toBe(1);

    // Second call should skip — already fetched
    await initialFetchIfNeeded(repos, [adapter]);
    expect(fetchCount).toBe(1);

    db.close();
  });
});
