import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dashboard } from "./Dashboard";

function makeItem(overrides = {}) {
  return {
    id: "item_1",
    type: "property_listing" as const,
    title: "12 Example Street",
    summary: "A test listing in Paraparaumu",
    sourceId: "source_1",
    sourceUrl: "https://example.com/listing",
    area: "Paraparaumu",
    address: "12 Example Street, Paraparaumu",
    publishedAt: null,
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: null,
    status: "new" as const,
    tags: ["paraparaumu", "open_home_soon"],
    rawSnapshotId: null,
    ...overrides,
  };
}

function makeSource(overrides = {}) {
  return {
    id: "source_1",
    name: "Test Source",
    type: "property_platform",
    url: "https://example.com",
    trustLevel: "platform" as const,
    enabled: true,
    refreshIntervalMinutes: 720,
    lastSuccessAt: null,
    lastError: null,
    ...overrides,
  };
}

describe("Dashboard", () => {
  it("renders sections for dashboard data", () => {
    const sections = {
      new_listings: [makeItem()],
      upcoming_open_homes: [],
      school_events: [],
      needs_review: [],
      recent_activity: [],
    };

    render(<Dashboard sections={sections} sources={[makeSource()]} />);

    expect(screen.getByText("New Listings (1)")).toBeInTheDocument();
    expect(screen.getByText("12 Example Street")).toBeInTheDocument();
    expect(screen.getByText("A test listing in Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("Test Source")).toBeInTheDocument();
  });

  it("hides empty sections", () => {
    const sections = {
      new_listings: [],
      upcoming_open_homes: [],
      school_events: [],
      needs_review: [],
      recent_activity: [],
    };

    render(<Dashboard sections={sections} sources={[]} />);

    expect(screen.queryByText(/New Listings/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upcoming Open Homes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/School Events/)).not.toBeInTheDocument();
  });

  it("shows needs review section for flagged items", () => {
    const item = makeItem({
      id: "item_2",
      title: "Unknown Address Listing",
      tags: ["needs_manual_address_check"],
    });
    const sections = {
      new_listings: [],
      upcoming_open_homes: [],
      school_events: [],
      needs_review: [item],
      recent_activity: [],
    };

    render(<Dashboard sections={sections} sources={[]} />);

    expect(screen.getByText("Needs Review (1)")).toBeInTheDocument();
    expect(screen.getByText("Unknown Address Listing")).toBeInTheDocument();
    expect(screen.getByText("needs manual address check")).toBeInTheDocument();
  });
});
