import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDashboard,
  getProperties,
  getProperty,
  getSchools,
  getSources,
  refreshSource,
} from "./api";

describe("API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetch = (data: unknown, status = 200) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(data), { status }),
    );
  };

  it("getDashboard fetches and parses dashboard response", async () => {
    const mockResponse = {
      sections: {
        new_listings: [],
        upcoming_open_homes: [],
        school_events: [],
        needs_review: [],
        recent_activity: [],
      },
      totalItems: 0,
    };
    mockFetch(mockResponse);

    const result = await getDashboard();
    expect(result).toEqual(mockResponse);
  });

  it("getProperties fetches and parses property list", async () => {
    const mockProperties = [
      {
        item: {
          id: "item_1",
          type: "property_listing",
          title: "12 Example Street",
          summary: "A property",
          sourceId: "source_1",
          sourceUrl: "https://example.com",
          area: "Paraparaumu",
          address: "12 Example Street",
          publishedAt: null,
          startsAt: null,
          endsAt: null,
          status: "new",
          tags: [],
          rawSnapshotId: null,
        },
        property: null,
        source: null,
      },
    ];
    mockFetch(mockProperties);

    const result = await getProperties();
    expect(result).toHaveLength(1);
    expect(result[0].item.title).toBe("12 Example Street");
  });

  it("getProperty fetches a single property by id", async () => {
    const mockDetail = {
      item: { id: "item_1", type: "property_listing" },
      property: null,
      source: null,
      links: [],
      notes: [],
    };
    mockFetch(mockDetail);

    const result = await getProperty("item_1");
    expect(result).toMatchObject({ item: { id: "item_1" } });
  });

  it("getSchools fetches school list", async () => {
    mockFetch([]);

    const result = await getSchools();
    expect(result).toEqual([]);
  });

  it("getSources fetches source list", async () => {
    const mockSources = [
      {
        id: "source_1",
        name: "Test Source",
        type: "property_platform",
        url: "https://example.com",
        trustLevel: "platform" as const,
        enabled: true,
        refreshIntervalMinutes: 720,
        lastSuccessAt: null,
        lastError: null,
      },
    ];
    mockFetch(mockSources);

    const result = await getSources();
    expect(result).toEqual(mockSources);
  });

  it("refreshSource sends POST and returns result", async () => {
    const mockResult = {
      sourceId: "source_1",
      status: "success" as const,
      recordsProcessed: 3,
    };
    mockFetch(mockResult);

    const result = await refreshSource("source_1");
    expect(result).toEqual(mockResult);
  });

  it("throws on non-2xx responses", async () => {
    mockFetch({ error: "Not found" }, 404);

    await expect(getProperty("missing")).rejects.toThrow("API error 404");
  });
});
