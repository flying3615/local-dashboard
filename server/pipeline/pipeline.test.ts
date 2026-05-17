import { describe, expect, it } from "vitest";

import { dedupeItems } from "./dedupe";
import { linkItem } from "./link";
import { normalizePropertyListing } from "./normalize";
import { tagItem } from "./tag";

describe("normalization pipeline", () => {
  it("normalizes, tags, dedupes, and source-links a Paraparaumu open-home listing", () => {
    const raw = {
      address: "12 Example Street, Paraparaumu",
      title: "12 Example Street",
      sourceId: "source_trade_me",
      sourceUrl: "https://www.trademe.co.nz/a/property/residential/sale/listing/123",
      platform: "Trade Me",
      suburb: "Paraparaumu",
      price: "$875,000",
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landArea: 510,
      floorArea: 140,
      listedAt: "2026-05-16T22:00:00.000Z",
      openHomeTimes: ["2026-05-23T01:00:00.000Z"],
      rawSnapshotId: "raw_123",
    };

    const context = { fetchedAt: "2026-05-17T00:00:00.000Z" };
    const first = normalizePropertyListing(raw, context);
    const second = normalizePropertyListing(raw, context);
    const tagged = tagItem(first.item);
    const deduped = dedupeItems([tagged, { ...tagged, title: "Duplicate copy" }]);
    const links = linkItem(tagged, {
      sources: [{ id: "source_trade_me", name: "Trade Me" }],
    });

    expect(first.item).toMatchObject({
      id: second.item.id,
      type: "property_listing",
      title: "12 Example Street",
      sourceId: "source_trade_me",
      sourceUrl: raw.sourceUrl,
      area: "Paraparaumu",
      address: raw.address,
      publishedAt: raw.listedAt,
      status: "new",
      rawSnapshotId: "raw_123",
    });
    expect(first.property).toMatchObject({
      itemId: first.item.id,
      address: raw.address,
      suburb: "Paraparaumu",
      price: "$875,000",
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landArea: 510,
      floorArea: 140,
      listedAt: raw.listedAt,
      openHomeTimes: raw.openHomeTimes,
      platform: "Trade Me",
      watchStatus: "new",
    });
    expect(tagged.tags).toEqual(
      expect.arrayContaining(["paraparaumu", "open_home_soon"]),
    );
    expect(tagged.tags).not.toContain("needs_manual_address_check");
    expect(deduped).toEqual([tagged]);
    expect(links).toContainEqual(
      expect.objectContaining({
        fromItemId: tagged.id,
        toEntityType: "source",
        toEntityId: "source_trade_me",
        linkReason: "source_match",
        confidence: 1,
      }),
    );
  });
});
