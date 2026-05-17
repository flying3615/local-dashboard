import { afterEach, describe, expect, it } from "vitest";

import { createInMemoryDatabase } from "./database";
import { createRepositories } from "./repositories";

describe("repositories", () => {
  const dbs = new Set<ReturnType<typeof createInMemoryDatabase>>();

  afterEach(() => {
    for (const db of dbs) {
      db.close();
    }
    dbs.clear();
  });

  function createTestRepositories() {
    const db = createInMemoryDatabase();
    dbs.add(db);
    return createRepositories(db);
  }

  it("stores a source, raw snapshot, item, and property", () => {
    const repos = createTestRepositories();

    repos.sources.upsert({
      id: "source_1",
      name: "Test Listings",
      type: "property_platform",
      url: "https://example.com",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
    });

    repos.rawSnapshots.insert({
      id: "raw_1",
      sourceId: "source_1",
      fetchedAt: "2026-05-17T00:00:00.000Z",
      url: "https://example.com/listing",
      contentHash: "hash_1",
      rawPayload: { title: "12 Example Street" },
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
      rawSnapshotId: "raw_1",
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
      notes: null,
    });

    expect(repos.items.list({ type: "property_listing" })).toHaveLength(1);
    expect(repos.properties.list()).toHaveLength(1);
  });

  it("round-trips sources and raw snapshots through repository mappings", () => {
    const repos = createTestRepositories();

    repos.sources.upsert({
      id: "source_1",
      name: "Test Listings",
      type: "property_platform",
      url: "https://example.com",
      trustLevel: "platform",
      enabled: false,
      refreshIntervalMinutes: 720,
      lastSuccessAt: "2026-05-17T00:00:00.000Z",
      lastError: "Temporary failure",
    });

    repos.rawSnapshots.insert({
      id: "raw_1",
      sourceId: "source_1",
      fetchedAt: "2026-05-17T00:00:00.000Z",
      url: "https://example.com/listing",
      contentHash: "hash_1",
      rawPayload: { title: "12 Example Street", tags: ["new"] },
    });

    expect(repos.sources.list()).toEqual([
      {
        id: "source_1",
        name: "Test Listings",
        type: "property_platform",
        url: "https://example.com",
        trustLevel: "platform",
        enabled: false,
        refreshIntervalMinutes: 720,
        lastSuccessAt: "2026-05-17T00:00:00.000Z",
        lastError: "Temporary failure",
      },
    ]);
    expect(repos.rawSnapshots.get("raw_1")?.rawPayload).toEqual({
      title: "12 Example Street",
      tags: ["new"],
    });
    expect(repos.rawSnapshots.listBySource("source_1")).toHaveLength(1);
  });

  it("rejects non-json raw snapshot payloads before writing", () => {
    const repos = createTestRepositories();

    repos.sources.upsert({
      id: "source_1",
      name: "Test Listings",
      type: "property_platform",
      url: "https://example.com",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
    });

    expect(() =>
      repos.rawSnapshots.insert({
        id: "raw_1",
        sourceId: "source_1",
        fetchedAt: "2026-05-17T00:00:00.000Z",
        url: "https://example.com/listing",
        contentHash: "hash_1",
        rawPayload: undefined,
      }),
    ).toThrow(/rawPayload must be JSON serializable/);
  });

  it("updates a property listing by item id", () => {
    const repos = createTestRepositories();

    repos.sources.upsert({
      id: "source_1",
      name: "Test Listings",
      type: "property_platform",
      url: "https://example.com",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
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
      rawSnapshotId: null,
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
      notes: null,
    });

    repos.properties.upsert({
      id: "property_2",
      itemId: "item_1",
      address: "12 Example Street, Paraparaumu",
      suburb: "Paraparaumu",
      price: "$875,000",
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landArea: null,
      floorArea: null,
      listedAt: null,
      openHomeTimes: ["2026-05-18T02:00:00.000Z"],
      platform: "test",
      watchStatus: "watching",
      notes: "Price changed",
    });

    expect(repos.properties.list()).toEqual([
      expect.objectContaining({
        id: "property_2",
        itemId: "item_1",
        price: "$875,000",
        openHomeTimes: ["2026-05-18T02:00:00.000Z"],
        watchStatus: "watching",
      }),
    ]);
  });
});
