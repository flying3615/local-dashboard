import { describe, expect, it } from "vitest";

import { createInMemoryDatabase } from "./database";
import { createRepositories } from "./repositories";

describe("repositories", () => {
  it("stores a source, raw snapshot, item, and property", () => {
    const db = createInMemoryDatabase();
    const repos = createRepositories(db);

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
});
