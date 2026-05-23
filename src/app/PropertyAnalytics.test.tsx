import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PropertyWithItem } from "../lib/api";
import { PropertyAnalytics } from "./PropertyAnalytics";

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

describe("PropertyAnalytics", () => {
  it("renders empty state when no properties", () => {
    render(<PropertyAnalytics properties={[]} />);
    expect(screen.getByText("No property data available for analytics.")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    const { container } = render(<PropertyAnalytics properties={[makeProperty()]} />);
    const summary = container.querySelector(".analytics-summary")!;
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toContain("$875,000");
    expect(summary.textContent).toContain("$1,750");
  });

  it("renders suburb breakdown table", () => {
    const props = [
      makeProperty(),
      makeProperty({
        item: { ...makeProperty().item, id: "item_2" },
        property: { ...makeProperty().property!, id: "prop_2", itemId: "item_2", suburb: "Raumati", price: "$650,000" },
      }),
    ];
    render(<PropertyAnalytics properties={props} />);
    expect(screen.getByText("Suburb Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("Raumati")).toBeInTheDocument();
  });

  it("renders the analytics container", () => {
    render(<PropertyAnalytics properties={[makeProperty()]} />);
    expect(screen.getByTestId("property-analytics")).toBeInTheDocument();
  });
});
