import { describe, expect, it } from "vitest";

import { dedupeItems } from "./dedupe";
import { linkItem } from "./link";
import { normalizePropertyListing } from "./normalize";
import { tagItem } from "./tag";
import {
  itemLinkSchema,
  itemSchema,
  propertyListingSchema,
} from "../domain/types";

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

    expect(() => itemSchema.parse(tagged)).not.toThrow();
    expect(() => propertyListingSchema.parse(first.property)).not.toThrow();
    expect(() => itemLinkSchema.parse(links[0])).not.toThrow();

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

  it("tags listings with missing address or unclear suburb for manual address check", () => {
    const context = { fetchedAt: "2026-05-17T00:00:00.000Z" };
    const missingAddress = normalizePropertyListing(
      {
        title: "Paraparaumu family home",
        sourceId: "source_trade_me",
        sourceUrl:
          "https://www.trademe.co.nz/a/property/residential/sale/listing/456",
        platform: "Trade Me",
        suburb: "Paraparaumu",
      },
      context,
    );
    const unclearArea = normalizePropertyListing(
      {
        address: "34 Example Road",
        sourceId: "source_trade_me",
        sourceUrl:
          "https://www.trademe.co.nz/a/property/residential/sale/listing/789",
        platform: "Trade Me",
        suburb: "Wellington",
      },
      context,
    );
    const areaFallback = normalizePropertyListing(
      {
        address: "56 Example Avenue, Paraparaumu",
        sourceId: "source_trade_me",
        sourceUrl:
          "https://www.trademe.co.nz/a/property/residential/sale/listing/999",
        platform: "Trade Me",
        suburb: "",
        area: "Paraparaumu",
      },
      context,
    );

    expect(tagItem(missingAddress.item).tags).toEqual(
      expect.arrayContaining(["paraparaumu", "needs_manual_address_check"]),
    );
    expect(tagItem(unclearArea.item).tags).toContain(
      "needs_manual_address_check",
    );
    expect(areaFallback.item.area).toBe("Paraparaumu");
    expect(tagItem(areaFallback.item).tags).toContain("paraparaumu");
  });
});
