import { describe, expect, it } from "vitest";

import { allConfiguredAdapters, activeAdapters, mockAdapters } from "./sourceConfig";

describe("sourceConfig", () => {
  it("includes Trade Me, realestate.co.nz, homes.co.nz, Education Counts, and Kapiti Council", () => {
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
      ]),
    );
  });

  it("returns implemented official adapters as active adapters", () => {
    const active = activeAdapters();
    expect(active.map((adapter) => adapter.sourceId).sort()).toEqual([
      "education_counts",
      "homes_co_nz",
      "kapiti_council",
      "realestate_co_nz",
    ]);
  });

  it("returns mock adapters for seed data", () => {
    const mocks = mockAdapters();
    expect(mocks).toHaveLength(2);
    expect(mocks[0]?.sourceId).toBe("mock_properties");
    expect(mocks[1]?.sourceId).toBe("mock_schools");
  });
});
