import { afterEach, describe, expect, it } from "vitest";

import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import { createInMemoryDatabase } from "../db/database";
import { createRepositories } from "../db/repositories";
import { refreshAll } from "./refreshAll";

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
      tags: expect.arrayContaining(["paraparaumu", "open_home_soon"]),
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
        tags: expect.arrayContaining(["paraparaumu", "school"]),
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
});
