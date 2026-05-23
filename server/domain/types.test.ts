import { describe, expect, it } from "vitest";

import { itemSchema, sourceSchema } from "./types";

describe("domain schemas", () => {
  it("accepts a property listing item", () => {
    const item = itemSchema.parse({
      id: "item_1",
      type: "property_listing",
      title: "12 Example Street",
      summary: "New listing in Paraparaumu",
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

    expect(item.type).toBe("property_listing");
  });

  it("accepts a configured source", () => {
    const source = sourceSchema.parse({
      id: "source_1",
      name: "Education Counts",
      type: "official_api",
      url: "https://www.educationcounts.govt.nz/",
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
      lastSuccessAt: null,
      lastError: null,
    });

    expect(source.trustLevel).toBe("official");
  });

  it("rejects unknown item types", () => {
    expect(() =>
      itemSchema.parse({
        id: "item_2",
        type: "unknown",
        title: "Bad item",
        summary: "",
        sourceId: "source_1",
        sourceUrl: "https://example.com",
        area: null,
        address: null,
        publishedAt: null,
        startsAt: null,
        endsAt: null,
        status: "new",
        tags: [],
        rawSnapshotId: null,
        lastSeenAt: null,
      }),
    ).toThrow();
  });
});
