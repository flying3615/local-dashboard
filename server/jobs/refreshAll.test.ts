import { afterEach, describe, expect, it } from "vitest";

import type { SourceAdapter } from "../adapters/types";
import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import { createInMemoryDatabase } from "../db/database";
import { createRepositories } from "../db/repositories";
import { refreshAll, type RefreshRepositories } from "./refreshAll";

describe("refreshAll", () => {
  const dbs = new Set<ReturnType<typeof createInMemoryDatabase>>();

  afterEach(() => {
    for (const db of dbs) {
      db.close();
    }
    dbs.clear();
  });

  it("fetches mock property and school data, stores raw snapshots, and creates normalized items", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const now = () => "2026-05-17T00:00:00.000Z";

    await refreshAll({
      repositories: repos,
      adapters: [createMockPropertyAdapter(), createMockSchoolAdapter()],
      now,
    });

    const sources = repos.sources.list();
    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mock_properties",
          lastSuccessAt: now(),
          lastError: null,
        }),
        expect.objectContaining({
          id: "mock_schools",
          lastSuccessAt: now(),
          lastError: null,
        }),
      ]),
    );

    const propertySnapshots = repos.rawSnapshots.listBySource("mock_properties");
    const schoolSnapshots = repos.rawSnapshots.listBySource("mock_schools");
    expect(propertySnapshots).toHaveLength(1);
    expect(schoolSnapshots).toHaveLength(1);
    expect(propertySnapshots[0]?.rawPayload).toMatchObject({
      address: "42 Raumati Road, Paraparaumu",
      suburb: "Paraparaumu",
    });
    expect(schoolSnapshots[0]?.rawPayload).toMatchObject({
      schoolName: "Paraparaumu College",
      eventType: "open_day",
    });

    const propertyItems = repos.items.list({ type: "property_listing" });
    expect(propertyItems).toHaveLength(1);
    expect(propertyItems[0]).toMatchObject({
      title: "42 Raumati Road",
      sourceId: "mock_properties",
      rawSnapshotId: propertySnapshots[0]?.id,
      tags: expect.arrayContaining(["kapiti", "open_home_soon"]),
    });

    const properties = repos.properties.list();
    expect(properties).toEqual([
      expect.objectContaining({
        itemId: propertyItems[0]?.id,
        address: "42 Raumati Road, Paraparaumu",
        suburb: "Paraparaumu",
        bedrooms: 3,
        bathrooms: 2,
      }),
    ]);

    const schoolItems = repos.items.list({ type: "school_event" });
    expect(schoolItems).toEqual([
      expect.objectContaining({
        title: "Paraparaumu College open day",
        sourceId: "mock_schools",
        rawSnapshotId: schoolSnapshots[0]?.id,
        tags: expect.arrayContaining(["kapiti", "school"]),
      }),
    ]);
    expect(repos.schools.list()).toEqual([
      expect.objectContaining({
        name: "Paraparaumu College",
        area: "Paraparaumu",
        watchStatus: "new",
      }),
    ]);
    expect(repos.schoolEvents.list()).toEqual([
      expect.objectContaining({
        itemId: schoolItems[0]?.id,
        eventType: "open_day",
      }),
    ]);

    expect(repos.itemLinks.listByItem(propertyItems[0]!.id)).toEqual([
      expect.objectContaining({
        toEntityType: "source",
        toEntityId: "mock_properties",
        linkReason: "source_match",
      }),
    ]);
    expect(repos.itemLinks.listByItem(schoolItems[0]!.id)).toEqual([
      expect.objectContaining({
        toEntityType: "source",
        toEntityId: "mock_schools",
        linkReason: "source_match",
      }),
    ]);
  });

  it("preserves disabled sources without fetching them", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const adapter = createMockPropertyAdapter();

    repos.sources.upsert({
      id: adapter.sourceId,
      name: adapter.source.name,
      type: adapter.source.type,
      url: adapter.source.url,
      trustLevel: adapter.source.trustLevel,
      enabled: false,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
    });

    const result = await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T00:00:00.000Z",
    });

    expect(result).toEqual([
      { sourceId: adapter.sourceId, status: "skipped", recordsProcessed: 0 },
    ]);
    expect(repos.sources.get(adapter.sourceId)).toMatchObject({
      enabled: false,
      lastSuccessAt: null,
    });
    expect(repos.rawSnapshots.listBySource(adapter.sourceId)).toHaveLength(0);
  });

  it("skips enabled sources when refresh interval has not elapsed", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    let fetchCount = 0;
    const adapter: SourceAdapter = {
      ...createMockPropertyAdapter(),
      async fetch() {
        fetchCount += 1;
        return createMockPropertyAdapter().fetch();
      },
    };

    await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T00:00:00.000Z",
    });
    const result = await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T01:00:00.000Z",
    });

    expect(fetchCount).toBe(1);
    expect(result).toEqual([
      { sourceId: adapter.sourceId, status: "skipped", recordsProcessed: 0 },
    ]);
  });

  it("force refreshes enabled sources before refresh interval has elapsed", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    let fetchCount = 0;
    const adapter: SourceAdapter = {
      ...createMockPropertyAdapter(),
      async fetch() {
        fetchCount += 1;
        return createMockPropertyAdapter().fetch();
      },
    };

    await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T00:00:00.000Z",
    });
    const result = await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T01:00:00.000Z",
      force: true,
    });

    expect(fetchCount).toBe(2);
    expect(result).toEqual([
      { sourceId: adapter.sourceId, status: "success", recordsProcessed: 1 },
    ]);
  });

  it("continues refreshing later adapters when one adapter fails", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const failingAdapter: SourceAdapter = {
      ...createMockPropertyAdapter(),
      async fetch() {
        throw new Error("Mock failure");
      },
    };

    const result = await refreshAll({
      repositories: repos,
      adapters: [failingAdapter, createMockSchoolAdapter()],
      now: () => "2026-05-17T00:00:00.000Z",
    });

    expect(result).toEqual([
      expect.objectContaining({
        sourceId: failingAdapter.sourceId,
        status: "error",
        recordsProcessed: 0,
      }),
      expect.objectContaining({
        sourceId: "mock_schools",
        status: "success",
        recordsProcessed: 1,
      }),
    ]);
    expect(repos.items.list({ type: "school_event" })).toHaveLength(1);
  });

  it("awaits async source writes outside transactions", async () => {
    let persistedLastError: string | null | undefined;
    const sourceWrites: string[] = [];
    const repos = {
      transaction(work) {
        return work();
      },
      sources: {
        async get() {
          return null;
        },
        async upsert(source) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          sourceWrites.push(source.lastError ?? "ok");
          persistedLastError = source.lastError;
          return source;
        },
      },
      rawSnapshots: { insert: () => { throw new Error("unused"); } },
      items: {
        upsert: () => { throw new Error("unused"); },
        list: () => [],
        deleteStale: () => 0,
      },
      properties: {
        upsert: () => { throw new Error("unused"); },
        list: () => [],
      },
      itemLinks: { upsert: () => { throw new Error("unused"); } },
      schools: {
        upsert: () => { throw new Error("unused"); },
        list: () => [],
        get: () => null,
      },
      schoolEvents: { upsert: () => { throw new Error("unused"); } },
      notes: { upsert: () => { throw new Error("unused"); } },
    } satisfies RefreshRepositories;
    const adapter: SourceAdapter = {
      ...createMockPropertyAdapter(),
      async fetch() {
        throw new Error("Async failure");
      },
    };

    const result = await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T00:00:00.000Z",
    });

    expect(result[0]).toMatchObject({
      status: "error",
      error: "Async failure",
    });
    expect(persistedLastError).toBe("Async failure");
    expect(sourceWrites).toEqual(["ok", "Async failure"]);
  });

  it("rolls back adapter records when normalization fails", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const adapter: SourceAdapter = {
      ...createMockPropertyAdapter(),
      async fetch() {
        return [
          {
            address: "99 Broken Street, Paraparaumu",
            sourceUrl: "https://example.com/broken-property",
            platform: "Mock Realty",
            suburb: "Paraparaumu",
            bedrooms: -1,
          },
        ];
      },
    };

    const result = await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-17T00:00:00.000Z",
    });

    expect(result[0]).toMatchObject({
      sourceId: adapter.sourceId,
      status: "error",
      recordsProcessed: 0,
    });
    expect(repos.rawSnapshots.listBySource(adapter.sourceId)).toHaveLength(0);
    expect(repos.items.list({ type: "property_listing" })).toHaveLength(0);
    expect(repos.properties.list()).toHaveLength(0);
  });

  it("preserves user-managed item and property state across refreshes", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const adapter = createMockPropertyAdapter();
    const firstRefreshAt = () => "2026-05-17T00:00:00.000Z";
    const secondRefreshAt = () => "2026-05-17T13:00:00.000Z";

    await refreshAll({ repositories: repos, adapters: [adapter], now: firstRefreshAt });

    const item = repos.items.list({ type: "property_listing" })[0]!;
    const property = repos.properties.list()[0]!;

    repos.items.upsert({ ...item, status: "reviewed" });
    repos.properties.upsert({
      ...property,
      watchStatus: "watching",
      notes: "Worth checking",
    });

    await refreshAll({ repositories: repos, adapters: [adapter], now: secondRefreshAt });

    expect(repos.items.list({ type: "property_listing" })[0]).toMatchObject({
      id: item.id,
      status: "reviewed",
    });
    expect(repos.properties.list()[0]).toMatchObject({
      itemId: item.id,
      watchStatus: "watching",
      notes: "Worth checking",
    });
  });

  it("does not tag school events as open homes", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);

    await refreshAll({
      repositories: repos,
      adapters: [createMockSchoolAdapter()],
      now: () => "2026-05-17T00:00:00.000Z",
    });

    expect(repos.items.list({ type: "school_event" })[0]?.tags).not.toContain(
      "open_home_soon",
    );
  });

  it("persists school profile records from official source adapters", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const adapter: SourceAdapter = {
      sourceId: "education_counts",
      recordType: "school_profile",
      source: {
        name: "Education Counts",
        type: "official_api",
        url: "https://www.educationcounts.govt.nz/directories/school-directory-api",
        trustLevel: "official",
        enabled: true,
        refreshIntervalMinutes: 1440,
      },
      async fetch() {
        return [
          {
            schoolId: "248",
            schoolName: "Paraparaumu College",
            schoolType: "Secondary (Year 9-15)",
            years: "Year 9-15",
            gender: "co-ed",
            authority: "State",
            hasZone: true,
            website: "http://www.paraparaumucollege.school.nz",
            area: "Paraparaumu",
            address: "Mazengarb Road, Paraparaumu",
            roll: 1540,
            sourceUrl: "http://www.paraparaumucollege.school.nz",
            tags: ["school", "secondary", "wellington_region"],
          },
        ];
      },
    };

    await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-18T00:00:00.000Z",
    });

    expect(repos.items.list({ type: "school_profile" })).toEqual([
      expect.objectContaining({
        title: "Paraparaumu College",
        summary: expect.stringContaining("Roll 1540"),
        sourceId: "education_counts",
        tags: expect.arrayContaining(["school", "secondary"]),
      }),
    ]);
    expect(repos.schools.list()).toEqual([
      expect.objectContaining({
        id: "school_248",
        name: "Paraparaumu College",
        area: "Paraparaumu",
        hasZone: true,
        watchStatus: "new",
      }),
    ]);
  });

  it("merges official school profiles into existing same-name schools with events", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const officialAdapter: SourceAdapter = {
      sourceId: "education_counts",
      recordType: "school_profile",
      source: {
        name: "Education Counts",
        type: "official_api",
        url: "https://www.educationcounts.govt.nz/directories/school-directory-api",
        trustLevel: "official",
        enabled: true,
        refreshIntervalMinutes: 1440,
      },
      async fetch() {
        return [
          {
            schoolId: "248",
            schoolName: "Paraparaumu College",
            schoolType: "Secondary (Year 9-15)",
            years: "Year 9-15",
            gender: "co-ed",
            authority: "State",
            hasZone: true,
            website: "http://www.paraparaumucollege.school.nz",
            area: "Paraparaumu",
            sourceUrl: "http://www.paraparaumucollege.school.nz",
            tags: ["school", "secondary", "wellington_region"],
          },
        ];
      },
    };

    await refreshAll({
      repositories: repos,
      adapters: [createMockSchoolAdapter()],
      now: () => "2026-05-18T00:00:00.000Z",
    });
    await refreshAll({
      repositories: repos,
      adapters: [officialAdapter],
      now: () => "2026-05-19T00:00:00.000Z",
    });

    const schools = repos.schools.list().filter((school) =>
      school.name === "Paraparaumu College"
    );
    expect(schools).toHaveLength(1);
    expect(schools[0]).toMatchObject({
      name: "Paraparaumu College",
      website: "http://www.paraparaumucollege.school.nz",
      hasZone: true,
    });
    expect(repos.schoolEvents.listBySchool(schools[0]!.id)).toHaveLength(1);
  });

  it("persists council notice records from official source adapters", async () => {
    const db = createInMemoryDatabase();
    dbs.add(db);
    const repos = createRepositories(db);
    const adapter: SourceAdapter = {
      sourceId: "kapiti_council",
      recordType: "council_notice",
      source: {
        name: "Kāpiti Coast District Council Open Data",
        type: "official_open_data",
        url: "https://data-kcdc.opendata.arcgis.com/",
        trustLevel: "official",
        enabled: true,
        refreshIntervalMinutes: 1440,
      },
      async fetch() {
        return [
          {
            title: "Flood Hazard Zones",
            summary: "Latest flood hazard zone layer.",
            sourceUrl:
              "https://data-kcdc.opendata.arcgis.com/datasets/KCDC::flood-hazard-zones",
            publishedAt: "2026-05-15T03:58:36.000Z",
            area: "Kāpiti Coast District",
            tags: ["kapiti", "council", "open_data", "hazard"],
          },
        ];
      },
    };

    await refreshAll({
      repositories: repos,
      adapters: [adapter],
      now: () => "2026-05-18T00:00:00.000Z",
    });

    expect(repos.items.list({ type: "council_notice" })).toEqual([
      expect.objectContaining({
        title: "Flood Hazard Zones",
        summary: "Latest flood hazard zone layer.",
        sourceId: "kapiti_council",
        publishedAt: "2026-05-15T03:58:36.000Z",
        tags: expect.arrayContaining(["kapiti", "council", "hazard"]),
      }),
    ]);
  });
});
