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
      lastSeenAt: null,
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
      estimatedValueLow: null,
      estimatedValueHigh: null,
      estimatedValueDate: null,
      capitalValue: null,
      landValue: null,
      improvementValue: null,
      cvDate: null,
      estimatedRentalLow: null,
      estimatedRentalHigh: null,
      estimatedRentalYield: null,
      decadeBuilt: null,
      contour: null,
      buildingConstruction: null,
      ownershipType: null,
      legalDescription: null,
      certificateOfTitle: null,
      imageUrl: null,
    });

    expect(repos.items.list({ type: "property_listing" })).toHaveLength(1);
    expect(repos.properties.list()).toHaveLength(1);
  });

  it("stores item links for normalized relationships", () => {
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
      lastSeenAt: null,
    });

    repos.itemLinks.upsert({
      id: "link_1",
      fromItemId: "item_1",
      toEntityType: "source",
      toEntityId: "source_1",
      linkReason: "source_match",
      confidence: 1,
    });

    expect(repos.itemLinks.listByItem("item_1")).toEqual([
      {
        id: "link_1",
        fromItemId: "item_1",
        toEntityType: "source",
        toEntityId: "source_1",
        linkReason: "source_match",
        confidence: 1,
      },
    ]);
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

    expect(() =>
      repos.rawSnapshots.insert({
        id: "raw_2",
        sourceId: "source_1",
        fetchedAt: "2026-05-17T00:00:00.000Z",
        url: "https://example.com/listing",
        contentHash: "hash_2",
        rawPayload: { title: undefined },
      }),
    ).toThrow(/rawPayload must be JSON serializable/);

    expect(() =>
      repos.rawSnapshots.insert({
        id: "raw_3",
        sourceId: "source_1",
        fetchedAt: "2026-05-17T00:00:00.000Z",
        url: "https://example.com/listing",
        contentHash: "hash_3",
        rawPayload: { score: Number.NaN },
      }),
    ).toThrow(/rawPayload must be JSON serializable/);

    expect(() =>
      repos.rawSnapshots.insert({
        id: "raw_4",
        sourceId: "source_1",
        fetchedAt: "2026-05-17T00:00:00.000Z",
        url: "https://example.com/listing",
        contentHash: "hash_4",
        rawPayload: new Map([["title", "12 Example Street"]]),
      }),
    ).toThrow(/rawPayload must be JSON serializable/);

    expect(() =>
      repos.rawSnapshots.insert({
        id: "raw_5",
        sourceId: "source_1",
        fetchedAt: "2026-05-17T00:00:00.000Z",
        url: "https://example.com/listing",
        contentHash: "hash_5",
        rawPayload: { fetchedAt: new Date("2026-05-17T00:00:00.000Z") },
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
      lastSeenAt: null,
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
      estimatedValueLow: null,
      estimatedValueHigh: null,
      estimatedValueDate: null,
      capitalValue: null,
      landValue: null,
      improvementValue: null,
      cvDate: null,
      estimatedRentalLow: null,
      estimatedRentalHigh: null,
      estimatedRentalYield: null,
      decadeBuilt: null,
      contour: null,
      buildingConstruction: null,
      ownershipType: null,
      legalDescription: null,
      certificateOfTitle: null,
      imageUrl: null,
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
      estimatedValueLow: null,
      estimatedValueHigh: null,
      estimatedValueDate: null,
      capitalValue: null,
      landValue: null,
      improvementValue: null,
      cvDate: null,
      estimatedRentalLow: null,
      estimatedRentalHigh: null,
      estimatedRentalYield: null,
      decadeBuilt: null,
      contour: null,
      buildingConstruction: null,
      ownershipType: null,
      legalDescription: null,
      certificateOfTitle: null,
      imageUrl: null,
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

  it("stores and lists schools", () => {
    const repos = createTestRepositories();

    repos.schools.upsert({
      id: "school_1",
      name: "Paraparaumu College",
      schoolType: "Secondary",
      years: "9-13",
      gender: "Co-educational",
      authority: "State",
      hasZone: true,
      website: "https://paraparaumucollege.school.nz",
      area: "Paraparaumu",
      commuteFromParaparaumu: "5 minutes",
      watchStatus: "watching",
    });

    repos.schools.upsert({
      id: "school_2",
      name: "Wellington College",
      schoolType: "Secondary",
      years: "9-13",
      gender: "Boys",
      authority: "State",
      hasZone: true,
      website: "https://wellington-college.school.nz",
      area: "Wellington",
      commuteFromParaparaumu: "50 minutes by train",
      watchStatus: "new",
    });

    expect(repos.schools.list()).toHaveLength(2);
    expect(repos.schools.get("school_1")).toMatchObject({
      name: "Paraparaumu College",
      area: "Paraparaumu",
      watchStatus: "watching",
    });
  });

  it("stores and lists school events by school", () => {
    const repos = createTestRepositories();

    repos.sources.upsert({
      id: "source_1",
      name: "Test Source",
      type: "school_directory",
      url: "https://example.com",
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
      lastSuccessAt: null,
      lastError: null,
    });

    repos.schools.upsert({
      id: "school_1",
      name: "Paraparaumu College",
      schoolType: "Secondary",
      years: "9-13",
      gender: "Co-educational",
      authority: "State",
      hasZone: true,
      website: "https://paraparaumucollege.school.nz",
      area: "Paraparaumu",
      commuteFromParaparaumu: "5 minutes",
      watchStatus: "watching",
    });

    repos.items.upsert({
      id: "item_1",
      type: "school_event",
      title: "Open Day",
      summary: "Paraparaumu College open day",
      sourceId: "source_1",
      sourceUrl: "https://example.com/open-day",
      area: "Paraparaumu",
      address: null,
      publishedAt: null,
      startsAt: "2026-06-15T00:00:00.000Z",
      endsAt: null,
      status: "new",
      tags: ["school", "paraparaumu"],
      rawSnapshotId: null,
      lastSeenAt: null,
    });

    repos.schoolEvents.upsert({
      id: "event_1",
      schoolId: "school_1",
      itemId: "item_1",
      eventType: "open_day",
      startsAt: "2026-06-15T00:00:00.000Z",
      deadline: "2026-06-10T00:00:00.000Z",
      enrolmentYear: 2027,
    });

    expect(repos.schoolEvents.list()).toHaveLength(1);
    expect(repos.schoolEvents.listBySchool("school_1")).toEqual([
      expect.objectContaining({
        schoolId: "school_1",
        eventType: "open_day",
        enrolmentYear: 2027,
      }),
    ]);
  });

  it("stores and lists notes by entity", () => {
    const repos = createTestRepositories();

    repos.notes.upsert({
      id: "note_1",
      entityType: "property",
      entityId: "property_1",
      body: "Worth a closer look — bus stop nearby",
      createdAt: "2026-05-17T00:00:00.000Z",
    });

    repos.notes.upsert({
      id: "note_2",
      entityType: "property",
      entityId: "property_1",
      body: "Checked the council GIS — no flood risk",
      createdAt: "2026-05-17T01:00:00.000Z",
    });

    expect(repos.notes.listByEntity("property", "property_1")).toHaveLength(2);
    expect(repos.notes.listByEntity("property", "property_1")[0]).toMatchObject({
      body: "Checked the council GIS — no flood risk",
    });
    expect(repos.notes.listByEntity("school", "school_1")).toHaveLength(0);
  });
});
