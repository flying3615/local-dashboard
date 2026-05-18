import { describe, expect, it } from "vitest";

import { createKapitiCouncilAdapter } from "./kapitiCouncil";

describe("createKapitiCouncilAdapter", () => {
  it("maps Kāpiti Council open data RSS items into council notices", async () => {
    const adapter = createKapitiCouncilAdapter({
      fetchImpl: async (url) => {
        expect(url).toBe("https://data-kcdc.opendata.arcgis.com/api/feed/rss/2.0");

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async text() {
            return `<?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <item>
                    <link>https://data-kcdc.opendata.arcgis.com/datasets/KCDC::flood-hazard-zones</link>
                    <guid isPermaLink="true">https://www.arcgis.com/home/item.html?id=abc</guid>
                    <title>Flood Hazard Zones</title>
                    <description>Latest flood hazard zone layer.</description>
                    <pubDate>Fri, 15 May 2026 03:58:36 GMT</pubDate>
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
        title: "Flood Hazard Zones",
        summary: "Latest flood hazard zone layer.",
        sourceUrl:
          "https://data-kcdc.opendata.arcgis.com/datasets/KCDC::flood-hazard-zones",
        publishedAt: "2026-05-15T03:58:36.000Z",
        area: "Kāpiti Coast District",
        tags: expect.arrayContaining(["kapiti", "council", "open_data", "hazard"]),
      }),
    ]);
  });
});
