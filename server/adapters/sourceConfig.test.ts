import { describe, expect, it } from "vitest";

import {
  allConfiguredAdapters,
  activeAdapters,
  adaptersForRegion,
  globalAdapters,
  mockAdapters,
} from "./sourceConfig";

describe("sourceConfig", () => {
  it("includes all configured adapters", () => {
    const configured = allConfiguredAdapters();

    expect(configured).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "trademe_property",
          }),
          status: "not_implemented",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "homes_co_nz",
          }),
          status: "active",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "realestate_co_nz",
          }),
          status: "active",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "education_counts",
          }),
          status: "active",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "kapiti_council",
          }),
          status: "active",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "wellington_council",
          }),
          status: "active",
        }),
        expect.objectContaining({
          adapter: expect.objectContaining({
            sourceId: "porirua_council",
          }),
          status: "active",
        }),
      ]),
    );
  });

  it("returns implemented official adapters as active adapters", () => {
    const active = activeAdapters();
    expect(active.map((adapter) => adapter.sourceId).sort()).toEqual([
      "education_counts",
      "homes_co_nz",
      "kapiti_council",
      "porirua_council",
      "realestate_co_nz",
      "wellington_council",
    ]);
  });

  it("returns mock adapters for seed data", () => {
    const mocks = mockAdapters();
    expect(mocks).toHaveLength(2);
    expect(mocks[0]?.sourceId).toBe("mock_properties");
    expect(mocks[1]?.sourceId).toBe("mock_schools");
  });

  it("returns region-specific adapters with region suffix in sourceId", () => {
    const kapiti = adaptersForRegion("kapiti");
    expect(kapiti.map((a) => a.sourceId)).toEqual([
      "homes_co_nz_kapiti",
      "realestate_co_nz_kapiti",
      "kapiti_council",
    ]);

    const wellington = adaptersForRegion("wellington");
    expect(wellington.map((a) => a.sourceId)).toEqual([
      "homes_co_nz_wellington",
      "realestate_co_nz_wellington",
      "wellington_council",
    ]);

    const lowerHutt = adaptersForRegion("lower-hutt");
    expect(lowerHutt.map((a) => a.sourceId)).toEqual([
      "homes_co_nz_lower-hutt",
      "realestate_co_nz_lower-hutt",
    ]);
  });

  it("returns global adapters only once", () => {
    const globals = globalAdapters();
    expect(globals.map((a) => a.sourceId)).toEqual(["education_counts"]);
  });
});
