export type ItemType =
  | "property_listing"
  | "school_profile"
  | "school_event"
  | "council_notice"
  | "local_news"
  | "community_event"
  | "transport_alert"
  | "manual_note";

export type TrustLevel = "official" | "platform" | "media" | "manual";

export type ItemStatus = "new" | "reviewed" | "watching" | "ignored" | "done";

export type WatchStatus =
  | "new"
  | "watching"
  | "visited"
  | "ignored"
  | "shortlist"
  | "done";

export interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  trustLevel: TrustLevel;
  enabled: boolean;
  refreshIntervalMinutes: number;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export interface RawSnapshot {
  id: string;
  sourceId: string;
  fetchedAt: string;
  url: string;
  contentHash: string;
  rawPayload: unknown;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  summary: string;
  sourceId: string;
  sourceUrl: string;
  area: string | null;
  address: string | null;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: ItemStatus;
  tags: string[];
  rawSnapshotId: string | null;
}

export interface PropertyListing {
  id: string;
  itemId: string;
  address: string;
  suburb: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  landArea: number | null;
  floorArea: number | null;
  listedAt: string | null;
  openHomeTimes: string[];
  platform: string;
  watchStatus: WatchStatus;
  notes: string | null;
  estimatedValueLow: number | null;
  estimatedValueHigh: number | null;
  estimatedValueDate: string | null;
  capitalValue: number | null;
  landValue: number | null;
  improvementValue: number | null;
  cvDate: string | null;
  estimatedRentalLow: number | null;
  estimatedRentalHigh: number | null;
  estimatedRentalYield: string | null;
  decadeBuilt: string | null;
  contour: string | null;
  buildingConstruction: string | null;
  ownershipType: string | null;
  legalDescription: string | null;
  certificateOfTitle: string | null;
  imageUrl: string | null;
}

export interface School {
  id: string;
  name: string;
  schoolType: string;
  years: string;
  gender: string;
  authority: string;
  hasZone: boolean | null;
  website: string;
  area: string;
  commuteFromParaparaumu: string | null;
  watchStatus: WatchStatus;
}

export interface SchoolEvent {
  id: string;
  schoolId: string;
  itemId: string;
  eventType: string;
  startsAt: string | null;
  deadline: string | null;
  enrolmentYear: number | null;
}

export interface ItemLink {
  id: string;
  fromItemId: string;
  toEntityType: string;
  toEntityId: string;
  linkReason: string;
  confidence: number;
}

export interface Note {
  id: string;
  entityType: string;
  entityId: string;
  body: string;
  createdAt: string;
}
