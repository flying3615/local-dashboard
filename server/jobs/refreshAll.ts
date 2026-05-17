import { createHash } from "node:crypto";

import type { SourceAdapter } from "../adapters/types";
import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import type { Item, Source } from "../domain/types";
import type { createRepositories } from "../db/repositories";
import { linkItem } from "../pipeline/link";
import {
  normalizePropertyListing,
  type RawPropertyListing,
} from "../pipeline/normalize";
import { tagItem } from "../pipeline/tag";

type Repositories = ReturnType<typeof createRepositories>;

export interface RefreshAllOptions {
  repositories: Repositories;
  adapters?: SourceAdapter[];
  now?: () => string;
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

    try {
      const records = await adapter.fetch();

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
    enabled: adapter.source.enabled ?? true,
    refreshIntervalMinutes: adapter.source.refreshIntervalMinutes ?? 1440,
    lastSuccessAt: existingSource?.lastSuccessAt ?? null,
    lastError: existingSource?.lastError ?? null,
  });
}

function upsertNormalizedRecord(
  repositories: Repositories,
  adapter: SourceAdapter,
  source: Source,
  record: unknown,
  rawSnapshotId: string,
  fetchedAt: string,
): Item {
  if (adapter.recordType === "property_listing") {
    const normalized = normalizePropertyListing(
      {
        ...(record as RawPropertyListing),
        sourceId: adapter.sourceId,
        sourceUrl: getRecordUrl(record) ?? source.url,
        rawSnapshotId,
      },
      { fetchedAt },
    );
    const item = repositories.items.upsert(tagItem(normalized.item));
    repositories.properties.upsert(normalized.property);
    return item;
  }

  const item = repositories.items.upsert(
    tagItem(normalizeSchoolEvent(record, adapter, source, rawSnapshotId)),
  );
  return item;
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
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
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
