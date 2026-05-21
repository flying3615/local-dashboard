import { createHash } from "node:crypto";

import type { Item, PropertyListing } from "../domain/types";

export interface RawPropertyListing {
  address?: string | null;
  title?: string | null;
  sourceId: string;
  sourceUrl: string;
  platform: string;
  suburb?: string | null;
  area?: string | null;
  price?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  landArea?: number | null;
  floorArea?: number | null;
  listedAt?: string | null;
  openHomeTimes?: string[];
  rawSnapshotId?: string | null;
  estimatedValueLow?: number | null;
  estimatedValueHigh?: number | null;
  estimatedValueDate?: string | null;
  capitalValue?: number | null;
  landValue?: number | null;
  improvementValue?: number | null;
  cvDate?: string | null;
  estimatedRentalLow?: number | null;
  estimatedRentalHigh?: number | null;
  estimatedRentalYield?: string | null;
  decadeBuilt?: string | null;
  contour?: string | null;
  buildingConstruction?: string | null;
  ownershipType?: string | null;
  legalDescription?: string | null;
  certificateOfTitle?: string | null;
  imageUrl?: string | null;
}

export interface NormalizeContext {
  fetchedAt: string;
}

export interface NormalizedPropertyListing {
  item: Item;
  property: PropertyListing;
}

export function normalizePropertyListing(
  raw: RawPropertyListing,
  _context: NormalizeContext,
): NormalizedPropertyListing {
  const rawAddress = cleanNullable(raw.address);
  const rawSuburb = cleanNullable(raw.suburb) ?? cleanNullable(raw.area);
  const address = rawAddress ?? "Unknown address";
  const suburb = rawSuburb ?? "Unknown suburb";
  const title = cleanNullable(raw.title) ?? address;
  const openHomeTimes = raw.openHomeTimes ?? [];
  const itemId = createStableItemId(raw);
  const initialTags =
    rawAddress === null || rawSuburb === null
      ? ["needs_manual_address_check"]
      : [];

  return {
    item: {
      id: itemId,
      type: "property_listing",
      title,
      summary: createSummary(raw, suburb),
      sourceId: raw.sourceId,
      sourceUrl: raw.sourceUrl,
      area: suburb,
      address,
      publishedAt: raw.listedAt ?? null,
      startsAt: openHomeTimes[0] ?? null,
      endsAt: null,
      status: "new",
      tags: initialTags,
      rawSnapshotId: raw.rawSnapshotId ?? null,
    },
    property: {
      id: `property_${stableHash(itemId)}`,
      itemId,
      address,
      suburb,
      price: raw.price ?? null,
      bedrooms: raw.bedrooms ?? null,
      bathrooms: raw.bathrooms ?? null,
      parking: raw.parking ?? null,
      landArea: raw.landArea ?? null,
      floorArea: raw.floorArea ?? null,
      listedAt: raw.listedAt ?? null,
      openHomeTimes,
      platform: raw.platform,
      watchStatus: "new",
      notes: null,
      estimatedValueLow: raw.estimatedValueLow ?? null,
      estimatedValueHigh: raw.estimatedValueHigh ?? null,
      estimatedValueDate: raw.estimatedValueDate ?? null,
      capitalValue: raw.capitalValue ?? null,
      landValue: raw.landValue ?? null,
      improvementValue: raw.improvementValue ?? null,
      cvDate: raw.cvDate ?? null,
      estimatedRentalLow: raw.estimatedRentalLow ?? null,
      estimatedRentalHigh: raw.estimatedRentalHigh ?? null,
      estimatedRentalYield: raw.estimatedRentalYield ?? null,
      decadeBuilt: raw.decadeBuilt ?? null,
      contour: raw.contour ?? null,
      buildingConstruction: raw.buildingConstruction ?? null,
      ownershipType: raw.ownershipType ?? null,
      legalDescription: raw.legalDescription ?? null,
      certificateOfTitle: raw.certificateOfTitle ?? null,
      imageUrl: raw.imageUrl ?? null,
    },
  };
}

function createStableItemId(raw: RawPropertyListing): string {
  // Stable item IDs prefer the source URL because listing URLs are platform-owned.
  // When a URL is unavailable in later importers, source/platform plus address is the fallback.
  const sourceKey = raw.sourceUrl || cleanNullable(raw.address) || "unknown";
  return `item_${stableHash(`${raw.sourceId}|${raw.platform}|${sourceKey}`)}`;
}

function createSummary(raw: RawPropertyListing, suburb: string): string {
  const details = [
    raw.price,
    formatCount(raw.bedrooms, "bed"),
    formatCount(raw.bathrooms, "bath"),
    formatCount(raw.parking, "park"),
  ].filter(Boolean);

  const suffix = details.length > 0 ? `: ${details.join(", ")}` : "";
  return `Property listing in ${suburb}${suffix}`;
}

function formatCount(value: number | null | undefined, label: string): string | null {
  return value == null ? null : `${value} ${label}`;
}

function cleanNullable(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
