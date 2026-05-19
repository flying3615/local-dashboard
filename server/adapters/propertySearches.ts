import type { SourceAdapter } from "./types";

export function createTradeMeAdapter(): SourceAdapter {
  return {
    sourceId: "trademe_property",
    recordType: "property_listing",
    source: {
      name: "Trade Me Property",
      type: "property_platform",
      url: "https://www.trademe.co.nz/a/property/residential/sale",
      trustLevel: "platform",
      enabled: false,
      refreshIntervalMinutes: 720,
    },
    async fetch() {
      return [];
    },
  };
}

