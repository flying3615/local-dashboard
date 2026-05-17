import type { TrustLevel } from "../domain/types";

export type AdapterRecordType = "property_listing" | "school_event";

export interface SourceAdapterMetadata {
  name: string;
  type: string;
  url: string;
  trustLevel: TrustLevel;
  enabled?: boolean;
  refreshIntervalMinutes?: number;
}

export interface SourceAdapter {
  sourceId: string;
  source: SourceAdapterMetadata;
  recordType: AdapterRecordType;
  fetch(): Promise<Array<unknown>>;
}
