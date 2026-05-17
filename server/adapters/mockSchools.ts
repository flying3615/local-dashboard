import type { SourceAdapter } from "./types";

export interface MockSchoolEventRecord {
  kind: "school_event";
  schoolName: string;
  eventType: string;
  title: string;
  summary: string;
  sourceUrl: string;
  area: string;
  startsAt: string;
  endsAt: string | null;
  publishedAt: string | null;
  tags: string[];
}

export function createMockSchoolAdapter(): SourceAdapter {
  return {
    sourceId: "mock_schools",
    recordType: "school_event",
    source: {
      name: "Mock Paraparaumu School Updates",
      type: "school_directory",
      url: "https://example.com/paraparaumu/schools",
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
    },
    async fetch(): Promise<MockSchoolEventRecord[]> {
      return [
        {
          kind: "school_event",
          schoolName: "Paraparaumu College",
          eventType: "open_day",
          title: "Paraparaumu College open day",
          summary:
            "Open day for prospective Paraparaumu College families and students.",
          sourceUrl:
            "https://example.com/paraparaumu/schools/paraparaumu-college/open-day",
          area: "Paraparaumu",
          startsAt: "2026-06-04T21:30:00.000Z",
          endsAt: "2026-06-04T23:00:00.000Z",
          publishedAt: "2026-05-10T00:00:00.000Z",
          tags: ["school"],
        },
      ];
    },
  };
}
