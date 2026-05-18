import { describe, expect, it } from "vitest";

import { searchKapitiPropertyRecords } from "./kapitiPropertyRecords";

describe("searchKapitiPropertyRecords", () => {
  it("queries KCDC property records by location and maps valuation fields", async () => {
    const records = await searchKapitiPropertyRecords("Paraparaumu", {
      fetchImpl: async (url) => {
        const parsed = new URL(url);
        expect(parsed.hostname).toBe("maps.kapiticoast.govt.nz");
        expect(parsed.pathname).toContain("/Property_Public/MapServer/0/query");
        expect(parsed.searchParams.get("where")).toBe(
          "UPPER(Location) LIKE '%PARAPARAUMU%'",
        );
        expect(parsed.searchParams.get("returnGeometry")).toBe("false");

        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async json() {
            return {
              features: [
                {
                  attributes: {
                    OBJECTID: 722260,
                    Valuation_ID: "1494100400",
                    Property_Number: 4811,
                    Legal: "PT LOT 79 DP 14701 PT LOT 2 DP 17509",
                    Land_Value: 570000,
                    Capital_Value: 590000,
                    Improvements_Value: 20000,
                    Hectares: 1.7585,
                    Location: "545 State Highway 1, Paraparaumu",
                    Valuation_Date: 1690848000000,
                    Latitude: -40.88217347,
                    Longitude: 175.06090763,
                  },
                },
              ],
            };
          },
        };
      },
    });

    expect(records).toEqual([
      {
        id: "kcdc_property_722260",
        valuationId: "1494100400",
        propertyNumber: 4811,
        address: "545 State Highway 1, Paraparaumu",
        legalDescription: "PT LOT 79 DP 14701 PT LOT 2 DP 17509",
        landValue: 570000,
        capitalValue: 590000,
        improvementsValue: 20000,
        hectares: 1.7585,
        valuationDate: "2023-08-01T00:00:00.000Z",
        latitude: -40.88217347,
        longitude: 175.06090763,
        sourceUrl:
          "https://maps.kapiticoast.govt.nz/server/rest/services/Public/Property_Public/MapServer/0",
      },
    ]);
  });

  it("requires at least two search characters", async () => {
    await expect(searchKapitiPropertyRecords("a")).rejects.toThrow(
      "Search query must contain at least 2 characters",
    );
  });
});
