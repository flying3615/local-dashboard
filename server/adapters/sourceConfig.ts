import type { SourceAdapter } from "./types";
import { createEducationCountsAdapter } from "./educationCounts";
import { createKapitiCouncilAdapter } from "./kapitiCouncil";
import { createTradeMeAdapter } from "./propertySearches";
import { createRealestateAdapter } from "./realestate";
import { createHomesNzAdapter } from "./homesNz";
import { createMockPropertyAdapter } from "./mockProperties";
import { createMockSchoolAdapter } from "./mockSchools";

export type AdapterStatus = "active" | "not_implemented" | "disabled";

export interface ConfiguredAdapter {
  adapter: SourceAdapter;
  status: AdapterStatus;
}

export function allConfiguredAdapters(): ConfiguredAdapter[] {
  return [
    { adapter: createTradeMeAdapter(), status: "not_implemented" },
    { adapter: createHomesNzAdapter(), status: "active" },
    { adapter: createRealestateAdapter(), status: "active" },
    { adapter: createEducationCountsAdapter(), status: "active" },
    { adapter: createKapitiCouncilAdapter(), status: "active" },
  ];
}

export function activeAdapters(): SourceAdapter[] {
  return allConfiguredAdapters()
    .filter((ca) => ca.status === "active")
    .map((ca) => ca.adapter);
}

export function mockAdapters(): SourceAdapter[] {
  return [createMockPropertyAdapter(), createMockSchoolAdapter()];
}
