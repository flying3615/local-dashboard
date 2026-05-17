import type {
  Item,
  ItemLink,
  ItemType,
  PropertyListing,
  RawSnapshot,
  Source,
  WatchStatus,
} from "../domain/types";
import {
  itemSchema,
  itemLinkSchema,
  propertyListingSchema,
  rawSnapshotSchema,
  sourceSchema,
} from "../domain/types";
import type { AppDatabase } from "./database";

type ItemRow = {
  id: string;
  type: ItemType;
  title: string;
  summary: string;
  source_id: string;
  source_url: string;
  area: string | null;
  address: string | null;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: Item["status"];
  tags: string;
  raw_snapshot_id: string | null;
};

type PropertyListingRow = {
  id: string;
  item_id: string;
  address: string;
  suburb: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  land_area: number | null;
  floor_area: number | null;
  listed_at: string | null;
  open_home_times: string;
  platform: string;
  watch_status: WatchStatus;
  notes: string | null;
};

type SourceRow = {
  id: string;
  name: string;
  type: string;
  url: string;
  trust_level: Source["trustLevel"];
  enabled: number;
  refresh_interval_minutes: number;
  last_success_at: string | null;
  last_error: string | null;
};

type RawSnapshotRow = {
  id: string;
  source_id: string;
  fetched_at: string;
  url: string;
  content_hash: string;
  raw_payload: string;
};

type ItemLinkRow = {
  id: string;
  from_item_id: string;
  to_entity_type: string;
  to_entity_id: string;
  link_reason: string;
  confidence: number;
};

type ItemListFilters = {
  type?: ItemType;
};

export function createRepositories(db: AppDatabase) {
  return {
    sources: {
      upsert(source: Source): Source {
        const parsed = sourceSchema.parse(source);

        db.prepare(
          `
            INSERT INTO sources (
              id,
              name,
              type,
              url,
              trust_level,
              enabled,
              refresh_interval_minutes,
              last_success_at,
              last_error
            )
            VALUES (
              @id,
              @name,
              @type,
              @url,
              @trustLevel,
              @enabled,
              @refreshIntervalMinutes,
              @lastSuccessAt,
              @lastError
            )
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              type = excluded.type,
              url = excluded.url,
              trust_level = excluded.trust_level,
              enabled = excluded.enabled,
              refresh_interval_minutes = excluded.refresh_interval_minutes,
              last_success_at = excluded.last_success_at,
              last_error = excluded.last_error,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          enabled: parsed.enabled ? 1 : 0,
        });

        return parsed;
      },

      list(): Source[] {
        const rows = db
          .prepare("SELECT * FROM sources ORDER BY id")
          .all() as SourceRow[];

        return rows.map(mapSourceRow);
      },

      get(id: string): Source | null {
        const row = db
          .prepare("SELECT * FROM sources WHERE id = ?")
          .get(id) as SourceRow | undefined;

        return row === undefined ? null : mapSourceRow(row);
      },
    },

    rawSnapshots: {
      insert(snapshot: RawSnapshot): RawSnapshot {
        const parsed = rawSnapshotSchema.parse(snapshot);

        db.prepare(
          `
            INSERT INTO raw_snapshots (
              id,
              source_id,
              fetched_at,
              url,
              content_hash,
              raw_payload
            )
            VALUES (
              @id,
              @sourceId,
              @fetchedAt,
              @url,
              @contentHash,
              @rawPayload
            )
          `,
        ).run({
          ...parsed,
          rawPayload: serializeJsonField(parsed.rawPayload, "rawPayload"),
        });

        return parsed;
      },

      get(id: string): RawSnapshot | null {
        const row = db
          .prepare("SELECT * FROM raw_snapshots WHERE id = ?")
          .get(id) as RawSnapshotRow | undefined;

        return row === undefined ? null : mapRawSnapshotRow(row);
      },

      listBySource(sourceId: string): RawSnapshot[] {
        const rows = db
          .prepare("SELECT * FROM raw_snapshots WHERE source_id = ? ORDER BY id")
          .all(sourceId) as RawSnapshotRow[];

        return rows.map(mapRawSnapshotRow);
      },
    },

    items: {
      upsert(item: Item): Item {
        const parsed = itemSchema.parse(item);

        db.prepare(
          `
            INSERT INTO items (
              id,
              type,
              title,
              summary,
              source_id,
              source_url,
              area,
              address,
              published_at,
              starts_at,
              ends_at,
              status,
              tags,
              raw_snapshot_id
            )
            VALUES (
              @id,
              @type,
              @title,
              @summary,
              @sourceId,
              @sourceUrl,
              @area,
              @address,
              @publishedAt,
              @startsAt,
              @endsAt,
              @status,
              @tags,
              @rawSnapshotId
            )
            ON CONFLICT(id) DO UPDATE SET
              type = excluded.type,
              title = excluded.title,
              summary = excluded.summary,
              source_id = excluded.source_id,
              source_url = excluded.source_url,
              area = excluded.area,
              address = excluded.address,
              published_at = excluded.published_at,
              starts_at = excluded.starts_at,
              ends_at = excluded.ends_at,
              status = excluded.status,
              tags = excluded.tags,
              raw_snapshot_id = excluded.raw_snapshot_id,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          tags: JSON.stringify(parsed.tags),
        });

        return parsed;
      },

      list(filters: ItemListFilters = {}): Item[] {
        const rows =
          filters.type === undefined
            ? (db.prepare("SELECT * FROM items ORDER BY id").all() as ItemRow[])
            : (db
                .prepare("SELECT * FROM items WHERE type = ? ORDER BY id")
                .all(filters.type) as ItemRow[]);

        return rows.map(mapItemRow);
      },
    },

    properties: {
      upsert(property: PropertyListing): PropertyListing {
        const parsed = propertyListingSchema.parse(property);

        db.prepare(
          `
            INSERT INTO property_listings (
              id,
              item_id,
              address,
              suburb,
              price,
              bedrooms,
              bathrooms,
              parking,
              land_area,
              floor_area,
              listed_at,
              open_home_times,
              platform,
              watch_status,
              notes
            )
            VALUES (
              @id,
              @itemId,
              @address,
              @suburb,
              @price,
              @bedrooms,
              @bathrooms,
              @parking,
              @landArea,
              @floorArea,
              @listedAt,
              @openHomeTimes,
              @platform,
              @watchStatus,
              @notes
            )
            ON CONFLICT(item_id) DO UPDATE SET
              id = excluded.id,
              address = excluded.address,
              suburb = excluded.suburb,
              price = excluded.price,
              bedrooms = excluded.bedrooms,
              bathrooms = excluded.bathrooms,
              parking = excluded.parking,
              land_area = excluded.land_area,
              floor_area = excluded.floor_area,
              listed_at = excluded.listed_at,
              open_home_times = excluded.open_home_times,
              platform = excluded.platform,
              watch_status = excluded.watch_status,
              notes = excluded.notes,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          openHomeTimes: JSON.stringify(parsed.openHomeTimes),
        });

        return parsed;
      },

      list(): PropertyListing[] {
        const rows = db
          .prepare("SELECT * FROM property_listings ORDER BY id")
          .all() as PropertyListingRow[];

        return rows.map(mapPropertyListingRow);
      },
    },

    itemLinks: {
      upsert(link: ItemLink): ItemLink {
        const parsed = itemLinkSchema.parse(link);

        db.prepare(
          `
            INSERT INTO item_links (
              id,
              from_item_id,
              to_entity_type,
              to_entity_id,
              link_reason,
              confidence
            )
            VALUES (
              @id,
              @fromItemId,
              @toEntityType,
              @toEntityId,
              @linkReason,
              @confidence
            )
            ON CONFLICT(id) DO UPDATE SET
              from_item_id = excluded.from_item_id,
              to_entity_type = excluded.to_entity_type,
              to_entity_id = excluded.to_entity_id,
              link_reason = excluded.link_reason,
              confidence = excluded.confidence,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run(parsed);

        return parsed;
      },

      listByItem(itemId: string): ItemLink[] {
        const rows = db
          .prepare("SELECT * FROM item_links WHERE from_item_id = ? ORDER BY id")
          .all(itemId) as ItemLinkRow[];

        return rows.map(mapItemLinkRow);
      },
    },
  };
}

function mapSourceRow(row: SourceRow): Source {
  return sourceSchema.parse({
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    trustLevel: row.trust_level,
    enabled: row.enabled === 1,
    refreshIntervalMinutes: row.refresh_interval_minutes,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
  });
}

function mapRawSnapshotRow(row: RawSnapshotRow): RawSnapshot {
  return rawSnapshotSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    fetchedAt: row.fetched_at,
    url: row.url,
    contentHash: row.content_hash,
    rawPayload: JSON.parse(row.raw_payload) as unknown,
  });
}

function mapItemRow(row: ItemRow): Item {
  return itemSchema.parse({
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    area: row.area,
    address: row.address,
    publishedAt: row.published_at,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    tags: JSON.parse(row.tags),
    rawSnapshotId: row.raw_snapshot_id,
  });
}

function mapPropertyListingRow(row: PropertyListingRow): PropertyListing {
  return propertyListingSchema.parse({
    id: row.id,
    itemId: row.item_id,
    address: row.address,
    suburb: row.suburb,
    price: row.price,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking,
    landArea: row.land_area,
    floorArea: row.floor_area,
    listedAt: row.listed_at,
    openHomeTimes: JSON.parse(row.open_home_times),
    platform: row.platform,
    watchStatus: row.watch_status,
    notes: row.notes,
  });
}

function mapItemLinkRow(row: ItemLinkRow): ItemLink {
  return itemLinkSchema.parse({
    id: row.id,
    fromItemId: row.from_item_id,
    toEntityType: row.to_entity_type,
    toEntityId: row.to_entity_id,
    linkReason: row.link_reason,
    confidence: row.confidence,
  });
}

function serializeJsonField(value: unknown, fieldName: string): string {
  try {
    assertJsonSerializable(value, fieldName, new WeakSet<object>());

    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      throw new Error("Value is not representable as JSON");
    }

    return serialized;
  } catch (error) {
    throw new TypeError(
      `${fieldName} must be JSON serializable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertJsonSerializable(
  value: unknown,
  fieldName: string,
  seen: WeakSet<object>,
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} contains a non-finite number`);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new Error(`${fieldName} contains a circular reference`);
    }

    seen.add(value);
    for (const item of value) {
      assertJsonSerializable(item, fieldName, seen);
    }
    seen.delete(value);
    return;
  }

  if (typeof value === "object") {
    if (!isPlainJsonObject(value)) {
      throw new Error(`${fieldName} contains a non-plain object`);
    }

    if (seen.has(value)) {
      throw new Error(`${fieldName} contains a circular reference`);
    }

    seen.add(value);
    for (const nestedValue of Object.values(value)) {
      assertJsonSerializable(nestedValue, fieldName, seen);
    }
    seen.delete(value);
    return;
  }

  throw new Error(`${fieldName} contains ${typeof value}`);
}

function isPlainJsonObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
