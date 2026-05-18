import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropertyList } from "./PropertyList";
import type { KapitiPropertyRecord } from "../lib/api";

function makeProperty(overrides = {}) {
  return {
    item: {
      id: "item_1",
      type: "property_listing" as const,
      title: "12 Example Street",
      summary: "A property",
      sourceId: "source_1",
      sourceUrl: "https://example.com",
      area: "Paraparaumu",
      address: "12 Example Street, Paraparaumu",
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      status: "new" as const,
      tags: ["paraparaumu"],
      rawSnapshotId: null,
    },
    property: {
      id: "property_1",
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
      openHomeTimes: ["2026-06-15T00:00:00.000Z"],
      platform: "Trade Me",
      watchStatus: "new" as const,
      notes: null,
    },
    source: {
      id: "source_1",
      name: "Trade Me",
      type: "property_platform",
      url: "https://www.trademe.co.nz",
      trustLevel: "platform" as const,
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
    },
    ...overrides,
  };
}

describe("PropertyList", () => {
  it("shows empty state when no properties", () => {
    render(<PropertyList properties={[]} />);

    expect(screen.getByTestId("property-list")).toBeInTheDocument();
    expect(screen.getByText(/No properties yet/)).toBeInTheDocument();
  });

  it("renders property rows with address, price, bedrooms, platform and status", () => {
    render(<PropertyList properties={[makeProperty()]} />);

    expect(screen.getByText("12 Example Street, Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("$875,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Trade Me")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("calls onSelectProperty when a row is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const props = [makeProperty()];

    render(<PropertyList properties={props} onSelectProperty={onSelect} />);

    await user.click(screen.getByText("12 Example Street, Paraparaumu"));
    expect(onSelect).toHaveBeenCalledWith("item_1");
  });

  it("searches and renders official KCDC property records", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const officialRecords: KapitiPropertyRecord[] = [
      {
        id: "kcdc_property_722260",
        valuationId: "1494100400",
        propertyNumber: 4811,
        address: "545 State Highway 1, Paraparaumu",
        legalDescription: "PT LOT 79 DP 14701",
        landValue: 570000,
        capitalValue: 590000,
        improvementsValue: 20000,
        hectares: 1.7585,
        valuationDate: "2023-08-01T00:00:00.000Z",
        latitude: -40.88217347,
        longitude: 175.06090763,
        sourceUrl:
          "https://maps.kapiticoast.govt.nz/server/rest/services/Public/Property_Public/MapServer/0",
      },
    ];

    render(
      <PropertyList
        properties={[]}
        officialRecords={officialRecords}
        onSearchOfficialRecords={onSearch}
      />,
    );

    await user.type(screen.getByLabelText("Official property lookup"), "545 State Highway");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("545 State Highway");
    expect(screen.getByText("545 State Highway 1, Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("$590,000")).toBeInTheDocument();
    expect(screen.getByText("1.7585 ha")).toBeInTheDocument();
  });
});
