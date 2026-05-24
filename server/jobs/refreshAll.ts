import { createHash } from "node:crypto";

import type { SourceAdapter } from "../adapters/types";
import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import { getRegion, allRegions } from "../config/regions";
import type { Item, School, SchoolEvent, Source } from "../domain/types";
import type { createRepositories } from "../db/repositories";
import { linkItem } from "../pipeline/link";
import {
  normalizePropertyListing,
  type RawPropertyListing,
} from "../pipeline/normalize";
import { tagItem } from "../pipeline/tag";

type Repositories = ReturnType<typeof createRepositories>;

const STALE_ITEM_THRESHOLD_DAYS = 7;

const regionIds = new Set(allRegions().map((r) => r.id));

function regionFromAdapter(adapter: SourceAdapter): string {
  for (const id of regionIds) {
    if (adapter.sourceId.endsWith(`_${id}`) || adapter.sourceId === `${id}_council`) {
      return id;
    }
  }
  return "kapiti";
}

export interface RefreshAllOptions {
  repositories: Repositories;
  adapters?: SourceAdapter[];
  now?: () => string;
  force?: boolean;
}

export interface RefreshAdapterResult {
  sourceId: string;
  status: "success" | "skipped" | "error";
  recordsProcessed: number;
  error?: string;
}

export async function refreshAll({
  repositories,
  adapters = [createMockPropertyAdapter(), createMockSchoolAdapter()],
  now = () => new Date().toISOString(),
  force = false,
}: RefreshAllOptions): Promise<RefreshAdapterResult[]> {
  const results: RefreshAdapterResult[] = [];

  for (const adapter of adapters) {
    const fetchedAt = now();
    const existingSource = repositories.sources.get(adapter.sourceId);
    const source = upsertAdapterSource(repositories, adapter, existingSource);

    if (!source.enabled) {
      results.push({
        sourceId: adapter.sourceId,
        status: "skipped",
        recordsProcessed: 0,
      });
      continue;
    }

    if (!force && !shouldRefresh(source, fetchedAt)) {
      results.push({
        sourceId: adapter.sourceId,
        status: "skipped",
        recordsProcessed: 0,
      });
      continue;
    }

    try {
      const records = await adapter.fetch();

      repositories.transaction(() => {
        for (const [index, record] of records.entries()) {
          const snapshot = repositories.rawSnapshots.insert({
            id: createSnapshotId(adapter.sourceId, fetchedAt, index, record),
            sourceId: adapter.sourceId,
            fetchedAt,
            url: getRecordUrl(record) ?? source.url,
            contentHash: hashJson(record),
            rawPayload: record,
          });

          const item = upsertNormalizedRecord(
            repositories,
            adapter,
            source,
            record,
            snapshot.id,
            fetchedAt,
          );

          for (const link of linkItem(item, { sources: [source] })) {
            repositories.itemLinks.upsert(link);
          }
        }

        repositories.sources.upsert({
          ...source,
          lastSuccessAt: fetchedAt,
          lastError: null,
        });

        const cutoff = new Date(
          Date.parse(fetchedAt) - STALE_ITEM_THRESHOLD_DAYS * 86_400_000,
        ).toISOString();
        repositories.items.deleteStale(adapter.sourceId, cutoff);
      });

      results.push({
        sourceId: adapter.sourceId,
        status: "success",
        recordsProcessed: records.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      repositories.sources.upsert({
        ...source,
        lastError: message,
      });
      results.push({
        sourceId: adapter.sourceId,
        status: "error",
        recordsProcessed: 0,
        error: message,
      });
    }
  }

  return results;
}

function upsertAdapterSource(
  repositories: Repositories,
  adapter: SourceAdapter,
  existingSource: Source | null,
): Source {
  return repositories.sources.upsert({
    id: adapter.sourceId,
    name: adapter.source.name,
    type: adapter.source.type,
    url: adapter.source.url,
    trustLevel: adapter.source.trustLevel,
    enabled: existingSource?.enabled ?? adapter.source.enabled ?? true,
    refreshIntervalMinutes:
      existingSource?.refreshIntervalMinutes ??
      adapter.source.refreshIntervalMinutes ??
      1440,
    lastSuccessAt: existingSource?.lastSuccessAt ?? null,
    lastError: existingSource?.lastError ?? null,
  });
}

function shouldRefresh(source: Source, fetchedAt: string): boolean {
  if (source.lastSuccessAt === null) {
    return true;
  }

  const lastSuccessAt = Date.parse(source.lastSuccessAt);
  const nextFetchedAt = Date.parse(fetchedAt);

  if (Number.isNaN(lastSuccessAt) || Number.isNaN(nextFetchedAt)) {
    return true;
  }

  const elapsedMinutes = (nextFetchedAt - lastSuccessAt) / 60_000;
  return elapsedMinutes >= source.refreshIntervalMinutes;
}

function upsertNormalizedRecord(
  repositories: Repositories,
  adapter: SourceAdapter,
  source: Source,
  record: unknown,
  rawSnapshotId: string,
  fetchedAt: string,
): Item {
  switch (adapter.recordType) {
    case "property_listing": {
      const normalized = normalizePropertyListing(
        {
          ...(record as RawPropertyListing),
          sourceId: adapter.sourceId,
          sourceUrl: getRecordUrl(record) ?? source.url,
          rawSnapshotId,
        },
        { fetchedAt },
      );
      const item = {
        ...mergeExistingItemState(repositories, tagItem(normalized.item)),
        lastSeenAt: fetchedAt,
      };
      const property = mergeExistingPropertyState(
        repositories,
        normalized.property,
      );
      const savedItem = repositories.items.upsert(item);
      repositories.properties.upsert(property);
      return savedItem;
    }

    case "school_event": {
      const normalizedItem = normalizeSchoolEvent(
        record,
        adapter,
        source,
        rawSnapshotId,
      );
      const item = {
        ...mergeExistingItemState(
          repositories,
          tagSchoolEvent(normalizedItem),
        ),
        lastSeenAt: fetchedAt,
      };
      const savedItem = repositories.items.upsert(item);
      const school = createSchoolFromEventRecord(record, savedItem);
      const savedSchool = repositories.schools.upsert(school);
      repositories.schoolEvents.upsert(
        createSchoolEventFromItem(record, savedSchool.id, savedItem),
      );
      return savedItem;
    }

    case "school_profile": {
      const normalizedItem = normalizeSchoolProfile(
        record,
        adapter,
        source,
        rawSnapshotId,
      );
      const item = {
        ...mergeExistingItemState(
          repositories,
          tagSchoolEvent(normalizedItem),
        ),
        lastSeenAt: fetchedAt,
      };
      const savedItem = repositories.items.upsert(item);
      repositories.schools.upsert(
        mergeExistingSchoolState(
          repositories,
          createSchoolFromProfileRecord(record, savedItem),
        ),
      );
      return savedItem;
    }

    case "council_notice": {
      const item = {
        ...mergeExistingItemState(
          repositories,
          normalizeCouncilNotice(record, adapter, source, rawSnapshotId),
        ),
        lastSeenAt: fetchedAt,
      };
      return repositories.items.upsert(item);
    }

    default:
      return assertNeverRecordType(adapter.recordType);
  }
}

function mergeExistingItemState(repositories: Repositories, item: Item): Item {
  const existing = repositories
    .items
    .list()
    .find((candidate) => candidate.id === item.id);
  return existing ? { ...item, status: existing.status } : item;
}

function mergeExistingPropertyState(
  repositories: Repositories,
  property: ReturnType<typeof normalizePropertyListing>["property"],
): ReturnType<typeof normalizePropertyListing>["property"] {
  const existing = repositories
    .properties
    .list()
    .find((candidate) => candidate.itemId === property.itemId);

  return existing
    ? {
        ...property,
        watchStatus: existing.watchStatus,
        notes: existing.notes,
      }
    : property;
}

function tagSchoolEvent(item: Item): Item {
  const tags = new Set(item.tags);
  const regionId = item.region ?? "kapiti";
  const locationText = [item.area, item.address].filter(Boolean).join(" ");

  // Add region tag if location matches the item's region
  const region = getRegion(regionId);
  if (region) {
    const lower = locationText.toLowerCase();
    if (region.suburbs.some((suburb) => lower.includes(suburb.toLowerCase()))) {
      tags.add(regionId);
    }
  }

  return {
    ...item,
    tags: [...tags],
  };
}

function createSchoolFromEventRecord(record: unknown, item: Item): School {
  const raw = assertRecord(record, item.sourceId);
  const schoolName = requireString(raw, "schoolName", item.sourceId);
  const sourceUrl = getString(raw, "sourceUrl") ?? item.sourceUrl;

  return {
    id: `school_${stableHash(`${item.sourceId}|${schoolName}`)}`,
    name: schoolName,
    schoolType: getString(raw, "schoolType") ?? "secondary",
    years: getString(raw, "years") ?? "9-13",
    gender: getString(raw, "gender") ?? "co-ed",
    authority: getString(raw, "authority") ?? "state",
    hasZone: getBoolean(raw, "hasZone"),
    website: sourceUrl,
    area: item.area ?? "Greater Wellington",
    commuteFromParaparaumu: getString(raw, "commuteFromParaparaumu"),
    watchStatus: "new",
    region: item.region ?? "kapiti",
  };
}

function createSchoolFromProfileRecord(record: unknown, item: Item): School {
  const raw = assertRecord(record, item.sourceId);
  const schoolId = getString(raw, "schoolId");
  const schoolName = requireString(raw, "schoolName", item.sourceId);
  const website = getString(raw, "website") ?? item.sourceUrl;

  return {
    id: schoolId ? `school_${schoolId}` : `school_${stableHash(schoolName)}`,
    name: schoolName,
    schoolType: getString(raw, "schoolType") ?? "secondary",
    years: getString(raw, "years") ?? "Year 9-15",
    gender: getString(raw, "gender") ?? "unknown",
    authority: getString(raw, "authority") ?? "unknown",
    hasZone: getBoolean(raw, "hasZone"),
    website,
    area: item.area ?? "Wellington Region",
    commuteFromParaparaumu: getString(raw, "commuteFromParaparaumu"),
    watchStatus: "new",
    region: item.region ?? "kapiti",
  };
}

function mergeExistingSchoolState(
  repositories: Repositories,
  school: School,
): School {
  const existing = repositories.schools.list().find((candidate) => {
    return (
      candidate.id === school.id ||
      candidate.name.toLocaleLowerCase() === school.name.toLocaleLowerCase()
    );
  });

  return existing
    ? { ...school, id: existing.id, watchStatus: existing.watchStatus }
    : school;
}

function createSchoolEventFromItem(
  record: unknown,
  schoolId: string,
  item: Item,
): SchoolEvent {
  const raw = assertRecord(record, item.sourceId);

  return {
    id: `school_event_${stableHash(`${schoolId}|${item.id}`)}`,
    schoolId,
    itemId: item.id,
    eventType: getString(raw, "eventType") ?? "school_event",
    startsAt: item.startsAt,
    deadline: getString(raw, "deadline"),
    enrolmentYear: getNumber(raw, "enrolmentYear"),
  };
}

function assertNeverRecordType(recordType: never): never {
  throw new Error(`Unsupported adapter record type: ${String(recordType)}`);
}

function normalizeSchoolProfile(
  record: unknown,
  adapter: SourceAdapter,
  source: Source,
  rawSnapshotId: string,
): Item {
  const raw = assertRecord(record, adapter.sourceId);
  const schoolId = getString(raw, "schoolId");
  const schoolName = requireString(raw, "schoolName", adapter.sourceId);
  const sourceUrl = getString(raw, "sourceUrl") ?? source.url;
  const roll = getNumber(raw, "roll");
  const schoolType = getString(raw, "schoolType");
  const area = getString(raw, "area") ?? "Wellington Region";
  const summaryParts = [
    schoolType,
    getString(raw, "years"),
    roll === null ? null : `Roll ${roll}`,
    getBoolean(raw, "hasZone") === null
      ? null
      : getBoolean(raw, "hasZone")
        ? "Has enrolment zone"
        : "No enrolment zone",
  ].filter((part): part is string => part !== null);
  const region = regionFromAdapter(adapter);

  return {
    id: `item_${stableHash(
      `${adapter.sourceId}|${schoolId ?? schoolName}|${sourceUrl}`,
    )}`,
    type: "school_profile",
    title: schoolName,
    summary: summaryParts.join(" · "),
    sourceId: adapter.sourceId,
    sourceUrl,
    area,
    address: getString(raw, "address"),
    publishedAt: null,
    startsAt: null,
    endsAt: null,
    status: "new",
    tags: getStringArray(raw, "tags"),
    rawSnapshotId,
    lastSeenAt: null,
    region,
  };
}

function normalizeCouncilNotice(
  record: unknown,
  adapter: SourceAdapter,
  source: Source,
  rawSnapshotId: string,
): Item {
  const raw = assertRecord(record, adapter.sourceId);
  const sourceUrl = getString(raw, "sourceUrl") ?? source.url;
  const title = requireString(raw, "title", adapter.sourceId);
  const region = regionFromAdapter(adapter);
  const regionConfig = getRegion(region);

  return {
    id: `item_${stableHash(`${adapter.sourceId}|${sourceUrl}|${title}`)}`,
    type: "council_notice",
    title,
    summary: getString(raw, "summary") ?? title,
    sourceId: adapter.sourceId,
    sourceUrl,
    area: getString(raw, "area") ?? regionConfig?.name ?? "Greater Wellington",
    address: getString(raw, "address"),
    publishedAt: getString(raw, "publishedAt"),
    startsAt: null,
    endsAt: null,
    status: "new",
    tags: getStringArray(raw, "tags"),
    rawSnapshotId,
    lastSeenAt: null,
    region,
  };
}

function normalizeSchoolEvent(
  record: unknown,
  adapter: SourceAdapter,
  source: Source,
  rawSnapshotId: string,
): Item {
  const raw = assertRecord(record, adapter.sourceId);
  const sourceUrl = getString(raw, "sourceUrl") ?? source.url;
  const schoolName = requireString(raw, "schoolName", adapter.sourceId);
  const eventType = requireString(raw, "eventType", adapter.sourceId);
  const startsAt = getString(raw, "startsAt");
  const title =
    getString(raw, "title") ??
    `${schoolName} ${eventType.replaceAll("_", " ")}`;
  const tags = getStringArray(raw, "tags");

  return {
    id: `item_${stableHash(
      `${adapter.sourceId}|${sourceUrl}|${schoolName}|${eventType}|${startsAt ?? ""}`,
    )}`,
    type: "school_event",
    title,
    summary: getString(raw, "summary") ?? title,
    sourceId: adapter.sourceId,
    sourceUrl,
    area: getString(raw, "area"),
    address: null,
    publishedAt: getString(raw, "publishedAt"),
    startsAt,
    endsAt: getString(raw, "endsAt"),
    status: "new",
    tags,
    rawSnapshotId,
    lastSeenAt: null,
    region: regionFromAdapter(adapter),
  };
}

function createSnapshotId(
  sourceId: string,
  fetchedAt: string,
  index: number,
  record: unknown,
): string {
  return `raw_${stableHash(`${sourceId}|${fetchedAt}|${index}|${hashJson(record)}`)}`;
}

function getRecordUrl(record: unknown): string | null {
  if (!isRecord(record)) {
    return null;
  }

  const sourceUrl = record.sourceUrl;
  return typeof sourceUrl === "string" && sourceUrl.length > 0
    ? sourceUrl
    : null;
}

function hashJson(value: unknown): string {
  return stableHash(stableJsonStringify(value));
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function requireString(
  record: Record<string, unknown>,
  fieldName: string,
  sourceId: string,
): string {
  const value = getString(record, fieldName);
  if (value === null) {
    throw new Error(`${sourceId} record is missing ${fieldName}`);
  }
  return value;
}

function getString(
  record: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = record[fieldName];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getStringArray(
  record: Record<string, unknown>,
  fieldName: string,
): string[] {
  const value = record[fieldName];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getBoolean(
  record: Record<string, unknown>,
  fieldName: string,
): boolean | null {
  const value = record[fieldName];
  return typeof value === "boolean" ? value : null;
}

function getNumber(
  record: Record<string, unknown>,
  fieldName: string,
): number | null {
  const value = record[fieldName];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function assertRecord(
  record: unknown,
  sourceId: string,
): Record<string, unknown> {
  if (!isRecord(record)) {
    throw new Error(`${sourceId} returned a non-object record`);
  }
  return record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
