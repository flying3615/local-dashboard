import type { SourceAdapter } from "./types";
import { createEducationCountsAdapter } from "./educationCounts";
import { createKapitiCouncilAdapter } from "./kapitiCouncil";
import {
  createRealestateAdapter,
  createTradeMeAdapter,
} from "./propertySearches";
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
    { adapter: createRealestateAdapter(), status: "not_implemented" },
    { adapter: createEducationCountsAdapter(), status: "not_implemented" },
    { adapter: createKapitiCouncilAdapter(), status: "not_implemented" },
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
