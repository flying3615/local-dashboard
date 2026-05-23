import { describe, expect, it } from "vitest";

import { createWellingtonCouncilAdapter } from "./wellingtonCouncil";

describe("createWellingtonCouncilAdapter", () => {
  it("maps Wellington City Council open data RSS items into council notices", async () => {
    const adapter = createWellingtonCouncilAdapter({
      fetchImpl: async (url) => {
        expect(url).toBe(
          "https://data-wcc.opendata.arcgis.com/api/feed/rss/2.0",
        );

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async text() {
            return `<?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <item>
                    <link>https://data-wcc.opendata.arcgis.com/datasets/WCC::flood-management-areas</link>
                    <guid isPermaLink="true">https://www.arcgis.com/home/item.html?id=xyz</guid>
                    <title>Flood Management Areas</title>
                    <description>Wellington flood management zones.</description>
                    <pubDate>Mon, 18 May 2026 10:00:00 GMT</pubDate>
                  </item>
                </channel>
              </rss>`;
          },
        };
      },
    });

    const records = await adapter.fetch();

    expect(adapter.recordType).toBe("council_notice");
    expect(records).toEqual([
      expect.objectContaining({
        title: "Flood Management Areas",
        summary: "Wellington flood management zones.",
        sourceUrl:
          "https://data-wcc.opendata.arcgis.com/datasets/WCC::flood-management-areas",
        publishedAt: "2026-05-18T10:00:00.000Z",
        area: "Wellington City",
        tags: expect.arrayContaining(["wellington", "council", "open_data", "hazard"]),
      }),
    ]);
  });

  it("returns empty array when RSS has no items", async () => {
    const adapter = createWellingtonCouncilAdapter({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        async text() {
          return `<?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0"><channel></channel></rss>`;
        },
      }),
    });

    expect(await adapter.fetch()).toEqual([]);
  });

  it("throws on fetch failure", async () => {
    const adapter = createWellingtonCouncilAdapter({
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        async text() {
          return "";
        },
      }),
    });

    await expect(adapter.fetch()).rejects.toThrow(
      "Wellington Council RSS request failed: 503",
    );
  });
});
