import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropertyList } from "./PropertyList";
import type { KapitiPropertyRecord, PropertySearchLink } from "../lib/api";

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
      lastSeenAt: null,
      region: "kapiti",
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
      region: "kapiti",
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

const defaultProps = {
  suburbFilter: "all",
  onSuburbFilterChange: vi.fn(),
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  suburbs: ["Paraparaumu"],
};

describe("PropertyList", () => {
  it("shows empty state when no properties", () => {
    render(<PropertyList properties={[]} allProperties={[]} {...defaultProps} />);

    expect(screen.getByTestId("property-list")).toBeInTheDocument();
    expect(screen.getByText(/No properties match/)).toBeInTheDocument();
  });

  it("renders property cards with address, price, bedrooms, platform and status", () => {
    const prop = makeProperty();
    render(<PropertyList properties={[prop]} allProperties={[prop]} {...defaultProps} />);

    expect(screen.getByText("12 Example Street, Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("$875,000")).toBeInTheDocument();
    expect(screen.getByText("3 bed")).toBeInTheDocument();
    expect(screen.getByText("2 bath")).toBeInTheDocument();
    expect(screen.getByText("Trade Me")).toBeInTheDocument();
  });

  it("calls onSelectProperty when a card is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const prop = makeProperty();

    render(
      <PropertyList
        properties={[prop]}
        allProperties={[prop]}
        {...defaultProps}
        onSelectProperty={onSelect}
      />,
    );

    await user.click(screen.getByText("12 Example Street, Paraparaumu"));
    expect(onSelect).toHaveBeenCalledWith("item_1");
  });

  it("renders realestate external search links", () => {
    const searchLinks: PropertySearchLink[] = [
      {
        id: "realestate_paraparaumu_residential_sale",
        provider: "realestate.co.nz",
        label: "Paraparaumu homes for sale",
        url: "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
        area: "Paraparaumu",
        category: "residential_sale",
        notes: "External search link only.",
      },
    ];

    render(
      <PropertyList
        properties={[]}
        allProperties={[]}
        {...defaultProps}
        searchLinks={searchLinks}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Paraparaumu homes for sale",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
    );
    expect(screen.getByText("realestate.co.nz")).toBeInTheDocument();
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
        allProperties={[]}
        {...defaultProps}
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

  it("uses custom council name in records table", () => {
    const officialRecords: KapitiPropertyRecord[] = [
      {
        id: "wcc_property_1",
        valuationId: null,
        propertyNumber: null,
        address: "10 Lambton Quay, Wellington",
        legalDescription: null,
        landValue: null,
        capitalValue: null,
        improvementsValue: null,
        hectares: null,
        valuationDate: null,
        latitude: null,
        longitude: null,
        sourceUrl: "https://example.com",
      },
    ];

    render(
      <PropertyList
        properties={[]}
        allProperties={[]}
        {...defaultProps}
        officialRecords={officialRecords}
        councilName="Wellington City Council"
      />,
    );

    expect(screen.getByText(/Wellington City Council Records/)).toBeInTheDocument();
  });
});
