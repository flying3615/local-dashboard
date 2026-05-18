import { describe, expect, it } from "vitest";

import { createInMemoryDatabase } from "./db/database";
import { createRepositories } from "./db/repositories";
import { shouldSeedMockData, runtimeAdapters, registerAdapterSources } from "./startup";

describe("startup", () => {
  it("does not include mock adapters by default", () => {
    expect(shouldSeedMockData({})).toBe(false);
    expect(runtimeAdapters({}).map((adapter) => adapter.sourceId)).toEqual([
      "education_counts",
      "kapiti_council",
    ]);
  });

  it("includes mock adapters only when explicitly enabled", () => {
    expect(shouldSeedMockData({ ENABLE_MOCK_DATA: "true" })).toBe(true);
    expect(
      runtimeAdapters({ ENABLE_MOCK_DATA: "true" }).map(
        (adapter) => adapter.sourceId,
      ),
    ).toEqual([
      "mock_properties",
      "mock_schools",
      "education_counts",
      "kapiti_council",
    ]);
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
