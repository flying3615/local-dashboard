import { describe, expect, it } from "vitest";

import { createPoriruaCouncilAdapter } from "./poriruaCouncil";

describe("createPoriruaCouncilAdapter", () => {
  it("maps Porirua City Council open data RSS items into council notices", async () => {
    const adapter = createPoriruaCouncilAdapter({
      fetchImpl: async (url) => {
        expect(url).toBe(
          "https://data-pcc.opendata.arcgis.com/api/feed/rss/2.0",
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
                    <link>https://data-pcc.opendata.arcgis.com/datasets/PCC::stormwater-network</link>
                    <guid isPermaLink="true">https://www.arcgis.com/home/item.html?id=abc</guid>
                    <title>Stormwater Network</title>
                    <description>Porirua stormwater infrastructure data.</description>
                    <pubDate>Tue, 19 May 2026 08:30:00 GMT</pubDate>
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
        title: "Stormwater Network",
        summary: "Porirua stormwater infrastructure data.",
        sourceUrl:
          "https://data-pcc.opendata.arcgis.com/datasets/PCC::stormwater-network",
        publishedAt: "2026-05-19T08:30:00.000Z",
        area: "Porirua City",
        tags: expect.arrayContaining(["porirua", "council", "open_data", "infrastructure"]),
      }),
    ]);
  });

  it("returns empty array when RSS has no items", async () => {
    const adapter = createPoriruaCouncilAdapter({
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
    const adapter = createPoriruaCouncilAdapter({
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        async text() {
          return "";
        },
      }),
    });

    await expect(adapter.fetch()).rejects.toThrow(
      "Porirua Council RSS request failed: 500",
    );
  });
});
