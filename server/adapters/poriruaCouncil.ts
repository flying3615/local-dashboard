import { XMLParser } from "fast-xml-parser";

import type { SourceAdapter } from "./types";

const RSS_URL = "https://data-pcc.opendata.arcgis.com/api/feed/rss/2.0";
const SOURCE_URL = "https://data-pcc.opendata.arcgis.com/";

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
};

type FetchImpl = (url: string) => Promise<FetchResponse>;

export interface PoriruaCouncilAdapterOptions {
  fetchImpl?: FetchImpl;
}

type ParsedRss = {
  rss?: {
    channel?: {
      item?: unknown[] | unknown;
    };
  };
};

export function createPoriruaCouncilAdapter(
  options: PoriruaCouncilAdapterOptions = {},
): SourceAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    sourceId: "porirua_council",
    recordType: "council_notice",
    source: {
      name: "Porirua City Council Open Data",
      type: "official_open_data",
      url: SOURCE_URL,
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
    },
    async fetch() {
      const response = await fetchImpl(RSS_URL);

      if (!response.ok) {
        throw new Error(
          `Porirua Council RSS request failed: ${response.status} ${response.statusText}`,
        );
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
      });
      const parsed = parser.parse(await response.text()) as ParsedRss;
      const items = asArray(parsed.rss?.channel?.item);

      return items.map(mapRssItem).filter((item) => item !== null);
    },
  };
}

function mapRssItem(item: unknown) {
  if (!isRecord(item)) {
    return null;
  }

  const title = getString(item, "title");
  const sourceUrl = getString(item, "link");
  if (title === null || sourceUrl === null) {
    return null;
  }

  return {
    title,
    summary: getString(item, "description") ?? "Porirua City Council open data update.",
    sourceUrl,
    publishedAt: parseDate(getString(item, "pubDate")),
    area: "Porirua City",
    tags: buildTags(title),
  };
}

function asArray(value: unknown[] | unknown | undefined): unknown[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildTags(title: string): string[] {
  const tags = new Set(["porirua", "council", "open_data"]);

  if (/flood|hazard|tsunami|earthquake|risk/i.test(title)) {
    tags.add("hazard");
  }

  if (/district plan|zoning|property|parcel|land/i.test(title)) {
    tags.add("property_context");
  }

  if (/water|stormwater|wastewater/i.test(title)) {
    tags.add("infrastructure");
  }

  return [...tags];
}

function getString(
  record: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = record[fieldName];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
