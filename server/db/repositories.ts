import type {
  Item,
  ItemLink,
  ItemType,
  Note,
  PropertyListing,
  RawSnapshot,
  School,
  SchoolEvent,
  Source,
  WatchStatus,
} from "../domain/types";
import {
  itemSchema,
  itemLinkSchema,
  noteSchema,
  propertyListingSchema,
  rawSnapshotSchema,
  schoolEventSchema,
  schoolSchema,
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
  last_seen_at: string | null;
  region: string;
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
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  estimated_value_date: string | null;
  capital_value: number | null;
  land_value: number | null;
  improvement_value: number | null;
  cv_date: string | null;
  estimated_rental_low: number | null;
  estimated_rental_high: number | null;
  estimated_rental_yield: string | null;
  decade_built: string | null;
  contour: string | null;
  building_construction: string | null;
  ownership_type: string | null;
  legal_description: string | null;
  certificate_of_title: string | null;
  image_url: string | null;
  region: string;
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

type SchoolRow = {
  id: string;
  name: string;
  school_type: string;
  years: string;
  gender: string;
  authority: string;
  has_zone: number | null;
  website: string;
  area: string;
  commute_from_paraparaumu: string | null;
  watch_status: WatchStatus;
  region: string;
};

type SchoolEventRow = {
  id: string;
  school_id: string;
  item_id: string;
  event_type: string;
  starts_at: string | null;
  deadline: string | null;
  enrolment_year: number | null;
};

type NoteRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  created_at: string;
};

type ItemListFilters = {
  type?: ItemType;
  region?: string;
};

export function createRepositories(db: AppDatabase) {
  return {
    transaction<T>(work: () => T): T {
      return db.transaction(work)();
    },

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
              raw_snapshot_id,
              last_seen_at,
              region
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
              @rawSnapshotId,
              @lastSeenAt,
              @region
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
              last_seen_at = excluded.last_seen_at,
              region = excluded.region,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          tags: JSON.stringify(parsed.tags),
        });

        return parsed;
      },

      list(filters: ItemListFilters = {}): Item[] {
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (filters.type !== undefined) {
          conditions.push("type = ?");
          params.push(filters.type);
        }
        if (filters.region !== undefined) {
          conditions.push("region = ?");
          params.push(filters.region);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const rows = db
          .prepare(`SELECT * FROM items ${where} ORDER BY id`)
          .all(...params) as ItemRow[];

        return rows.map(mapItemRow);
      },

      deleteStale(sourceId: string, olderThanIso: string): number {
        const result = db
          .prepare(
            "DELETE FROM items WHERE source_id = ? AND last_seen_at < ?",
          )
          .run(sourceId, olderThanIso);
        return result.changes;
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
              notes,
              estimated_value_low,
              estimated_value_high,
              estimated_value_date,
              capital_value,
              land_value,
              improvement_value,
              cv_date,
              estimated_rental_low,
              estimated_rental_high,
              estimated_rental_yield,
              decade_built,
              contour,
              building_construction,
              ownership_type,
              legal_description,
              certificate_of_title,
              image_url,
              region
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
              @notes,
              @estimatedValueLow,
              @estimatedValueHigh,
              @estimatedValueDate,
              @capitalValue,
              @landValue,
              @improvementValue,
              @cvDate,
              @estimatedRentalLow,
              @estimatedRentalHigh,
              @estimatedRentalYield,
              @decadeBuilt,
              @contour,
              @buildingConstruction,
              @ownershipType,
              @legalDescription,
              @certificateOfTitle,
              @imageUrl,
              @region
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
              estimated_value_low = excluded.estimated_value_low,
              estimated_value_high = excluded.estimated_value_high,
              estimated_value_date = excluded.estimated_value_date,
              capital_value = excluded.capital_value,
              land_value = excluded.land_value,
              improvement_value = excluded.improvement_value,
              cv_date = excluded.cv_date,
              estimated_rental_low = excluded.estimated_rental_low,
              estimated_rental_high = excluded.estimated_rental_high,
              estimated_rental_yield = excluded.estimated_rental_yield,
              decade_built = excluded.decade_built,
              contour = excluded.contour,
              building_construction = excluded.building_construction,
              ownership_type = excluded.ownership_type,
              legal_description = excluded.legal_description,
              certificate_of_title = excluded.certificate_of_title,
              image_url = excluded.image_url,
              region = excluded.region,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          openHomeTimes: JSON.stringify(parsed.openHomeTimes),
        });

        return parsed;
      },

      list(region?: string): PropertyListing[] {
        const rows = region
          ? (db
              .prepare("SELECT * FROM property_listings WHERE region = ? ORDER BY id")
              .all(region) as PropertyListingRow[])
          : (db
              .prepare("SELECT * FROM property_listings ORDER BY id")
              .all() as PropertyListingRow[]);

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

    schools: {
      upsert(school: School): School {
        const parsed = schoolSchema.parse(school);

        db.prepare(
          `
            INSERT INTO schools (
              id,
              name,
              school_type,
              years,
              gender,
              authority,
              has_zone,
              website,
              area,
              commute_from_paraparaumu,
              watch_status,
              region
            )
            VALUES (
              @id,
              @name,
              @schoolType,
              @years,
              @gender,
              @authority,
              @hasZone,
              @website,
              @area,
              @commuteFromParaparaumu,
              @watchStatus,
              @region
            )
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              school_type = excluded.school_type,
              years = excluded.years,
              gender = excluded.gender,
              authority = excluded.authority,
              has_zone = excluded.has_zone,
              website = excluded.website,
              area = excluded.area,
              commute_from_paraparaumu = excluded.commute_from_paraparaumu,
              watch_status = excluded.watch_status,
              region = excluded.region,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run({
          ...parsed,
          hasZone: parsed.hasZone === null ? null : parsed.hasZone ? 1 : 0,
        });

        return parsed;
      },

      list(region?: string): School[] {
        const rows = region
          ? (db
              .prepare("SELECT * FROM schools WHERE region = ? ORDER BY name")
              .all(region) as SchoolRow[])
          : (db
              .prepare("SELECT * FROM schools ORDER BY name")
              .all() as SchoolRow[]);

        return rows.map(mapSchoolRow);
      },

      get(id: string): School | null {
        const row = db
          .prepare("SELECT * FROM schools WHERE id = ?")
          .get(id) as SchoolRow | undefined;

        return row === undefined ? null : mapSchoolRow(row);
      },
    },

    schoolEvents: {
      upsert(event: SchoolEvent): SchoolEvent {
        const parsed = schoolEventSchema.parse(event);

        db.prepare(
          `
            INSERT INTO school_events (
              id,
              school_id,
              item_id,
              event_type,
              starts_at,
              deadline,
              enrolment_year
            )
            VALUES (
              @id,
              @schoolId,
              @itemId,
              @eventType,
              @startsAt,
              @deadline,
              @enrolmentYear
            )
            ON CONFLICT(item_id) DO UPDATE SET
              id = excluded.id,
              school_id = excluded.school_id,
              event_type = excluded.event_type,
              starts_at = excluded.starts_at,
              deadline = excluded.deadline,
              enrolment_year = excluded.enrolment_year,
              updated_at = CURRENT_TIMESTAMP
          `,
        ).run(parsed);

        return parsed;
      },

      listBySchool(schoolId: string): SchoolEvent[] {
        const rows = db
          .prepare(
            "SELECT * FROM school_events WHERE school_id = ? ORDER BY id",
          )
          .all(schoolId) as SchoolEventRow[];

        return rows.map(mapSchoolEventRow);
      },

      list(): SchoolEvent[] {
        const rows = db
          .prepare("SELECT * FROM school_events ORDER BY id")
          .all() as SchoolEventRow[];

        return rows.map(mapSchoolEventRow);
      },
    },

    notes: {
      upsert(note: Note): Note {
        const parsed = noteSchema.parse(note);

        db.prepare(
          `
            INSERT INTO notes (
              id,
              entity_type,
              entity_id,
              body,
              created_at
            )
            VALUES (
              @id,
              @entityType,
              @entityId,
              @body,
              @createdAt
            )
            ON CONFLICT(id) DO UPDATE SET
              entity_type = excluded.entity_type,
              entity_id = excluded.entity_id,
              body = excluded.body,
              created_at = excluded.created_at
          `,
        ).run(parsed);

        return parsed;
      },

      listByEntity(entityType: string, entityId: string): Note[] {
        const rows = db
          .prepare(
            "SELECT * FROM notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
          )
          .all(entityType, entityId) as NoteRow[];

        return rows.map(mapNoteRow);
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
    lastSeenAt: row.last_seen_at,
    region: row.region,
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
    estimatedValueLow: row.estimated_value_low,
    estimatedValueHigh: row.estimated_value_high,
    estimatedValueDate: row.estimated_value_date,
    capitalValue: row.capital_value,
    landValue: row.land_value,
    improvementValue: row.improvement_value,
    cvDate: row.cv_date,
    estimatedRentalLow: row.estimated_rental_low,
    estimatedRentalHigh: row.estimated_rental_high,
    estimatedRentalYield: row.estimated_rental_yield,
    decadeBuilt: row.decade_built,
    contour: row.contour,
    buildingConstruction: row.building_construction,
    ownershipType: row.ownership_type,
    legalDescription: row.legal_description,
    certificateOfTitle: row.certificate_of_title,
    imageUrl: row.image_url,
    region: row.region,
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

function mapSchoolRow(row: SchoolRow): School {
  return schoolSchema.parse({
    id: row.id,
    name: row.name,
    schoolType: row.school_type,
    years: row.years,
    gender: row.gender,
    authority: row.authority,
    hasZone: row.has_zone === null ? null : row.has_zone === 1,
    website: row.website,
    area: row.area,
    commuteFromParaparaumu: row.commute_from_paraparaumu,
    watchStatus: row.watch_status,
    region: row.region,
  });
}

function mapSchoolEventRow(row: SchoolEventRow): SchoolEvent {
  return schoolEventSchema.parse({
    id: row.id,
    schoolId: row.school_id,
    itemId: row.item_id,
    eventType: row.event_type,
    startsAt: row.starts_at,
    deadline: row.deadline,
    enrolmentYear: row.enrolment_year,
  });
}

function mapNoteRow(row: NoteRow): Note {
  return noteSchema.parse({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    body: row.body,
    createdAt: row.created_at,
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
