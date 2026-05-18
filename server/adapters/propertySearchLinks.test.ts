import { describe, expect, it } from "vitest";

import { configuredPropertySearchLinks } from "./propertySearchLinks";

describe("configuredPropertySearchLinks", () => {
  it("includes a realestate.co.nz Paraparaumu residential sale search link", () => {
    expect(configuredPropertySearchLinks()).toEqual(
      expect.arrayContaining([
        {
          id: "realestate_paraparaumu_residential_sale",
          provider: "realestate.co.nz",
          label: "Paraparaumu homes for sale",
          url: "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
          area: "Paraparaumu",
          category: "residential_sale",
          notes:
            "External search link only. realestate.co.nz listings are not scraped or stored without API permission.",
        },
      ]),
    );
  });
});
