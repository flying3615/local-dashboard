import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropertyDetail } from "./PropertyDetail";

function makeDetail(overrides = {}) {
  return {
    item: {
      id: "item_1",
      type: "property_listing" as const,
      title: "12 Example Street",
      summary: "A family home in Paraparaumu",
      sourceId: "source_1",
      sourceUrl: "https://example.com/listing",
      area: "Paraparaumu",
      address: "12 Example Street, Paraparaumu",
      publishedAt: null,
      startsAt: null,
      endsAt: null,
      status: "new" as const,
      tags: ["paraparaumu", "open_home_soon"],
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
      landArea: 510,
      floorArea: 140,
      listedAt: "2026-05-16T00:00:00.000Z",
      openHomeTimes: ["2026-06-15T00:00:00.000Z"],
      platform: "Trade Me",
      watchStatus: "watching" as const,
      notes: "Council check needed",
    },
    source: {
      id: "source_1",
      name: "Trade Me",
      type: "property_platform" as const,
      url: "https://www.trademe.co.nz",
      trustLevel: "platform" as const,
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: null,
      lastError: null,
    },
    links: [
      {
        id: "link_1",
        fromItemId: "item_1",
        toEntityType: "source",
        toEntityId: "source_1",
        linkReason: "source_match",
        confidence: 1,
      },
    ],
    notes: [
      {
        id: "note_1",
        entityType: "property",
        entityId: "property_1",
        body: "Close to bus stop and shops",
        createdAt: "2026-05-17T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("PropertyDetail", () => {
  it("renders property title, fields, source link, and notes", () => {
    render(<PropertyDetail detail={makeDetail()} />);

    expect(screen.getByRole("heading", { name: "12 Example Street" })).toBeInTheDocument();
    expect(screen.getByText("12 Example Street, Paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("$875,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("510 m²")).toBeInTheDocument();
    expect(screen.getByText("140 m²")).toBeInTheDocument();
    expect(screen.getAllByText("Trade Me")).toHaveLength(2);
    expect(screen.getByText("watching")).toBeInTheDocument();
    expect(screen.getByText("paraparaumu")).toBeInTheDocument();
    expect(screen.getByText("open home soon")).toBeInTheDocument();
    expect(screen.getByText("Close to bus stop and shops")).toBeInTheDocument();
    expect(screen.getByText("Linked Items")).toBeInTheDocument();
    expect(screen.getByText("1 link(s) found")).toBeInTheDocument();
  });

  it("shows open home times", () => {
    render(<PropertyDetail detail={makeDetail()} />);

    expect(screen.getByText("Open Homes")).toBeInTheDocument();
  });

  it("shows back button when onBack provided", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<PropertyDetail detail={makeDetail()} onBack={onBack} />);

    const backButton = screen.getByText("← Back to list");
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it("hides back button when onBack not provided", () => {
    render(<PropertyDetail detail={makeDetail()} />);

    expect(screen.queryByText("← Back to list")).not.toBeInTheDocument();
  });

  it("hides notes section when no notes", () => {
    render(<PropertyDetail detail={makeDetail({ notes: [] })} />);

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });
});
