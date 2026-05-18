import type { SourceAdapter } from "./types";

export function createKapitiCouncilAdapter(): SourceAdapter {
  return {
    sourceId: "kapiti_council",
    recordType: "property_listing",
    source: {
      name: "Kapiti Coast District Council",
      type: "official_website",
      url: "https://www.kapiticoast.govt.nz/",
      trustLevel: "official",
      enabled: false,
      refreshIntervalMinutes: 1440,
    },
    async fetch() {
      return [];
    },
  };
}
