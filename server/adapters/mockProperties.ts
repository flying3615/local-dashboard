import type { SourceAdapter } from "./types";
import type { RawPropertyListing } from "../pipeline/normalize";

export type MockPropertyRecord = RawPropertyListing & {
  kind: "property_listing";
};

export function createMockPropertyAdapter(): SourceAdapter {
  return {
    sourceId: "mock_properties",
    recordType: "property_listing",
    source: {
      name: "Mock Paraparaumu Property Listings",
      type: "property_platform",
      url: "https://example.com/paraparaumu/properties",
      trustLevel: "platform",
      enabled: true,
      refreshIntervalMinutes: 720,
    },
    async fetch(): Promise<MockPropertyRecord[]> {
      return [
        {
          kind: "property_listing",
          address: "42 Raumati Road, Paraparaumu",
          title: "42 Raumati Road",
          sourceId: "mock_properties",
          sourceUrl:
            "https://example.com/paraparaumu/properties/42-raumati-road",
          platform: "Mock Realty",
          suburb: "Paraparaumu",
          area: "Paraparaumu",
          price: "By negotiation",
          bedrooms: 3,
          bathrooms: 2,
          parking: 1,
          landArea: 612,
          floorArea: 128,
          listedAt: "2026-05-16T22:00:00.000Z",
          openHomeTimes: ["2026-05-23T01:00:00.000Z"],
        },
      ];
    },
  };
}
