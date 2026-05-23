import { describe, expect, it } from "vitest";

import { configuredPropertySearchLinks } from "./propertySearchLinks";

describe("configuredPropertySearchLinks", () => {
  it("includes a realestate.co.nz Kapiti Coast residential sale search link", () => {
    expect(configuredPropertySearchLinks("kapiti")).toEqual(
      expect.arrayContaining([
        {
          id: "realestate_kapiti_residential_sale",
          provider: "realestate.co.nz",
          label: "Kapiti Coast homes for sale",
          url: "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
          area: "Kapiti Coast",
          category: "residential_sale",
          notes:
            "External search link only. realestate.co.nz listings are not scraped or stored without API permission.",
        },
      ]),
    );
  });
});
