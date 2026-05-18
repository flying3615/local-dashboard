import type { SourceAdapter } from "./types";

export function createEducationCountsAdapter(): SourceAdapter {
  return {
    sourceId: "education_counts",
    recordType: "school_event",
    source: {
      name: "Education Counts",
      type: "official_api",
      url: "https://www.educationcounts.govt.nz/",
      trustLevel: "official",
      enabled: false,
      refreshIntervalMinutes: 1440,
    },
    async fetch() {
      return [];
    },
  };
}
