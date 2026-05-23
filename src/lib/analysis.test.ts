import { describe, expect, it } from "vitest";

import {
  buildPriceHistogram,
  buildPricePerM2Data,
  buildSuburbSummary,
  computeMetrics,
  median,
  parsePrice,
} from "./analysis";
import type { PropertyWithItem } from "./api";

function makeProperty(overrides: Partial<PropertyWithItem> = {}): PropertyWithItem {
  return {
    item: {
      id: "item_1",
      type: "property_listing",
      title: "12 Example Street",
      summary: "A home",
      sourceId: "source_1",
      sourceUrl: "https://example.com",
      area: "Paraparaumu",
      address: "12 Example Street, Paraparaumu",
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      status: "new",
      tags: [],
      rawSnapshotId: null,
      lastSeenAt: null,
    },
    property: {
      id: "prop_1",
      itemId: "item_1",
      address: "12 Example Street, Paraparaumu",
      suburb: "Paraparaumu",
      price: "$875,000",
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      landArea: 500,
      floorArea: 140,
      listedAt: "2026-05-01T00:00:00.000Z",
      openHomeTimes: [],
      platform: "Trade Me",
      watchStatus: "new",
      notes: null,
      estimatedValueLow: 800000,
      estimatedValueHigh: 900000,
      estimatedValueDate: "2026-05-01",
      capitalValue: 750000,
      landValue: 400000,
      improvementValue: 350000,
      cvDate: "2021-01-01",
      estimatedRentalLow: 500,
      estimatedRentalHigh: 550,
      estimatedRentalYield: "3.2%",
      decadeBuilt: "1990",
      contour: "LV",
      buildingConstruction: "Brick",
      ownershipType: "Freehold",
      legalDescription: "LOT 1 DP 12345",
      certificateOfTitle: "WN1234/56",
      imageUrl: null,
    },
    source: null,
    ...overrides,
  };
}

describe("parsePrice", () => {
  it("parses standard NZD format", () => {
    expect(parsePrice("$875,000")).toBe(875000);
    expect(parsePrice("$1,200,000")).toBe(1200000);
    expect(parsePrice("$650,000")).toBe(650000);
  });

  it("parses M suffix", () => {
    expect(parsePrice("$1.2M")).toBe(1200000);
    expect(parsePrice("$2.5m")).toBe(2500000);
    expect(parsePrice("1.2M")).toBe(1200000);
  });

  it("parses K suffix", () => {
    expect(parsePrice("$875k")).toBe(875000);
    expect(parsePrice("$500K")).toBe(500000);
  });

  it("returns null for invalid input", () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("Price on application")).toBeNull();
    expect(parsePrice("Auction")).toBeNull();
    expect(parsePrice("Contact agent")).toBeNull();
  });

  it("handles zero", () => {
    expect(parsePrice("$0")).toBeNull();
  });
});

describe("median", () => {
  it("computes median of odd-length array", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([3, 1, 2])).toBe(2);
  });

  it("computes median of even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("handles single element", () => {
    expect(median([5])).toBe(5);
  });

  it("returns null for empty array", () => {
    expect(median([])).toBeNull();
  });
});

describe("computeMetrics", () => {
  it("computes price, pricePerM2, estimateMid, estimateGap, daysOnMarket", () => {
    const [metric] = computeMetrics(
      [makeProperty()],
      "2026-05-17T00:00:00.000Z",
    );

    expect(metric.price).toBe(875000);
    expect(metric.pricePerM2Land).toBe(1750); // 875000 / 500
    expect(metric.pricePerM2Floor).toBe(6250); // 875000 / 140
    expect(metric.estimateMid).toBe(850000); // (800000 + 900000) / 2
    expect(metric.estimateGap).toBe(3); // (875000 - 850000) / 850000 * 100 ≈ 2.94 → 3
    expect(metric.daysOnMarket).toBe(16);
    expect(metric.bedrooms).toBe(3);
    expect(metric.landArea).toBe(500);
  });

  it("handles missing price", () => {
    const prop = makeProperty();
    prop.property!.price = null;
    const [m] = computeMetrics([prop]);

    expect(m.price).toBeNull();
    expect(m.pricePerM2Land).toBeNull();
    expect(m.estimateGap).toBeNull();
  });

  it("handles missing landArea", () => {
    const prop = makeProperty();
    prop.property!.landArea = null;
    const [m] = computeMetrics([prop]);

    expect(m.pricePerM2Land).toBeNull();
    expect(m.pricePerM2Floor).toBe(6250);
  });
});

describe("buildPriceHistogram", () => {
  it("groups properties into price brackets", () => {
    const metrics = computeMetrics([
      makeProperty({ property: { ...makeProperty().property!, price: "$650,000" } as any }),
      makeProperty({ property: { ...makeProperty().property!, price: "$680,000" } as any, item: { ...makeProperty().item, id: "item_2" } }),
      makeProperty({ property: { ...makeProperty().property!, price: "$850,000" } as any, item: { ...makeProperty().item, id: "item_3" } }),
    ]);

    const bins = buildPriceHistogram(metrics, 100000);

    expect(bins.find((b) => b.range === "$600k-$700k")?.count).toBe(2);
    expect(bins.find((b) => b.range === "$800k-$900k")?.count).toBe(1);
  });

  it("returns empty for no prices", () => {
    const prop = makeProperty();
    prop.property!.price = null;
    expect(buildPriceHistogram(computeMetrics([prop]))).toEqual([]);
  });
});

describe("buildSuburbSummary", () => {
  it("groups by suburb with correct medians", () => {
    const props = [
      makeProperty({ property: { ...makeProperty().property!, suburb: "Paraparaumu", price: "$700,000" } as any }),
      makeProperty({ property: { ...makeProperty().property!, suburb: "Paraparaumu", price: "$900,000" } as any, item: { ...makeProperty().item, id: "item_2" } }),
      makeProperty({ property: { ...makeProperty().property!, suburb: "Raumati", price: "$600,000" } as any, item: { ...makeProperty().item, id: "item_3" } }),
    ];

    const summary = buildSuburbSummary(computeMetrics(props));

    expect(summary).toHaveLength(2);
    expect(summary[0]!.suburb).toBe("Paraparaumu");
    expect(summary[0]!.count).toBe(2);
    expect(summary[0]!.medianPrice).toBe(800000);
    expect(summary[1]!.suburb).toBe("Raumati");
    expect(summary[1]!.count).toBe(1);
  });
});

describe("buildPricePerM2Data", () => {
  it("returns sorted entries for properties with valid price and land area", () => {
    const props = [
      makeProperty({ property: { ...makeProperty().property!, price: "$900,000", landArea: 300 } as any }),
      makeProperty({ property: { ...makeProperty().property!, price: "$600,000", landArea: 600 } as any, item: { ...makeProperty().item, id: "item_2" } }),
    ];

    const data = buildPricePerM2Data(computeMetrics(props));

    expect(data).toHaveLength(2);
    expect(data[0]!.value).toBe(1000); // 600000 / 600
    expect(data[1]!.value).toBe(3000); // 900000 / 300
  });

  it("filters out properties without price or land area", () => {
    const prop = makeProperty();
    prop.property!.landArea = null;
    expect(buildPricePerM2Data(computeMetrics([prop]))).toHaveLength(0);
  });
});
