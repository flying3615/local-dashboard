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
} from "../server/domain/types";
import {
  sourceSchema,
  itemSchema,
  propertyListingSchema,
  itemLinkSchema,
  schoolSchema,
  schoolEventSchema,
  noteSchema,
} from "../server/domain/types";
import {
  type ItemRow,
  type PropertyRow,
  type SourceRow,
  type SchoolRow,
  type SchoolEventRow,
  type ItemLinkRow,
  type NoteRow,
  parseJsonArray,
} from "./rowMappers";

interface QueuedStatement {
  sql: string;
  params: unknown[];
}

type WriteResult = Promise<unknown> | void;

export function createD1Repositories(db: D1Database) {
  let statementQueue: QueuedStatement[] | null = null;

  function enqueue(sql: string, params: unknown[]) {
    if (statementQueue) {
      statementQueue.push({ sql, params });
    }
  }

  /** Execute a write — queues for batch if in a transaction, otherwise runs directly. */
  function write(sql: string, params: unknown[]): WriteResult {
    if (statementQueue) {
      enqueue(sql, params);
      return undefined;
    } else {
      return db.prepare(sql).bind(...params).run();
    }
  }

  function afterWrite<T>(result: WriteResult, value: T): T | Promise<T> {
    if (
      result !== undefined &&
      typeof (result as PromiseLike<unknown>).then === "function"
    ) {
      return Promise.resolve(result).then(() => value);
    }
    return value;
  }

  /** Execute a read — always runs directly (D1 reads are consistent with the replica). */
  async function readAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await db.prepare(sql).bind(...params).all<T>()).results ?? [];
  }

  async function readFirst<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
  }

  // ── Row → domain mappers (with Zod parsing for type narrowing) ──

  function mapSource(row: SourceRow): Source {
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

  function mapItem(row: ItemRow): Item {
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
      tags: parseJsonArray(row.tags),
      rawSnapshotId: row.raw_snapshot_id,
      lastSeenAt: row.last_seen_at,
      region: row.region,
    });
  }

  function mapProperty(row: PropertyRow): PropertyListing {
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
      openHomeTimes: parseJsonArray(row.open_home_times),
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

  function mapSchool(row: SchoolRow): School {
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

  function mapSchoolEvent(row: SchoolEventRow): SchoolEvent {
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

  function mapItemLink(row: ItemLinkRow): ItemLink {
    return itemLinkSchema.parse({
      id: row.id,
      fromItemId: row.from_item_id,
      toEntityType: row.to_entity_type,
      toEntityId: row.to_entity_id,
      linkReason: row.link_reason,
      confidence: row.confidence,
    });
  }

  function mapNote(row: NoteRow): Note {
    return noteSchema.parse({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      body: row.body,
      createdAt: row.created_at,
    });
  }

  // ── Repository ──

  return {
    async transaction<T>(work: () => T): Promise<T> {
      if (statementQueue) {
        return work();
      }

      statementQueue = [];
      try {
        const result = work();

        if (statementQueue.length > 0) {
          const statements = statementQueue.map((s) =>
            db.prepare(s.sql).bind(...s.params),
          );
          await db.batch(statements);
        }

        return result;
      } finally {
        statementQueue = null;
      }
    },

    sources: {
      upsert(source: Source): Source | Promise<Source> {
        const parsed = sourceSchema.parse(source);
        const result = write(
          `INSERT INTO sources (id, name, type, url, trust_level, enabled, refresh_interval_minutes, last_success_at, last_error)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, type = excluded.type, url = excluded.url,
             trust_level = excluded.trust_level, enabled = excluded.enabled,
             refresh_interval_minutes = excluded.refresh_interval_minutes,
             last_success_at = excluded.last_success_at, last_error = excluded.last_error,
             updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.name, parsed.type, parsed.url, parsed.trustLevel,
           parsed.enabled ? 1 : 0, parsed.refreshIntervalMinutes,
           parsed.lastSuccessAt, parsed.lastError],
        );
        return afterWrite(result, parsed);
      },

      async get(id: string): Promise<Source | null> {
        const row = await readFirst<SourceRow>("SELECT * FROM sources WHERE id = ?", [id]);
        return row ? mapSource(row) : null;
      },

      async list(): Promise<Source[]> {
        return (await readAll<SourceRow>("SELECT * FROM sources ORDER BY id")).map(mapSource);
      },
    },

    rawSnapshots: {
      insert(snapshot: RawSnapshot): RawSnapshot | Promise<RawSnapshot> {
        const parsed = snapshot; // RawSnapshot is already validated by caller
        const result = write(
          `INSERT INTO raw_snapshots (id, source_id, fetched_at, url, content_hash, raw_payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [parsed.id, parsed.sourceId, parsed.fetchedAt, parsed.url,
           parsed.contentHash, JSON.stringify(parsed.rawPayload)],
        );
        return afterWrite(result, parsed);
      },
    },

    items: {
      upsert(item: Item): Item | Promise<Item> {
        const parsed = itemSchema.parse(item);
        const result = write(
          `INSERT INTO items (id, type, title, summary, source_id, source_url, area, address,
             published_at, starts_at, ends_at, status, tags, raw_snapshot_id, last_seen_at, region)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             type = excluded.type, title = excluded.title, summary = excluded.summary,
             source_id = excluded.source_id, source_url = excluded.source_url,
             area = excluded.area, address = excluded.address,
             published_at = excluded.published_at, starts_at = excluded.starts_at,
             ends_at = excluded.ends_at, status = excluded.status, tags = excluded.tags,
             raw_snapshot_id = excluded.raw_snapshot_id, last_seen_at = excluded.last_seen_at,
             region = excluded.region, updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.type, parsed.title, parsed.summary, parsed.sourceId,
           parsed.sourceUrl, parsed.area, parsed.address, parsed.publishedAt,
           parsed.startsAt, parsed.endsAt, parsed.status, JSON.stringify(parsed.tags),
           parsed.rawSnapshotId, parsed.lastSeenAt, parsed.region],
        );
        return afterWrite(result, parsed);
      },

      async list(filters: { type?: ItemType; region?: string } = {}): Promise<Item[]> {
        const conditions: string[] = [];
        const params: unknown[] = [];
        if (filters.type !== undefined) { conditions.push("type = ?"); params.push(filters.type); }
        if (filters.region !== undefined) { conditions.push("region = ?"); params.push(filters.region); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        return (await readAll<ItemRow>(`SELECT * FROM items ${where} ORDER BY id`, params)).map(mapItem);
      },

      deleteStale(sourceId: string, olderThanIso: string): number | Promise<number> {
        const result = write("DELETE FROM items WHERE source_id = ? AND last_seen_at < ?", [sourceId, olderThanIso]);
        return afterWrite(result, 0);
      },
    },

    properties: {
      upsert(property: PropertyListing): PropertyListing | Promise<PropertyListing> {
        const parsed = propertyListingSchema.parse(property);
        const result = write(
          `INSERT INTO property_listings (id, item_id, address, suburb, price, bedrooms, bathrooms,
             parking, land_area, floor_area, listed_at, open_home_times, platform, watch_status,
             notes, estimated_value_low, estimated_value_high, estimated_value_date, capital_value,
             land_value, improvement_value, cv_date, estimated_rental_low, estimated_rental_high,
             estimated_rental_yield, decade_built, contour, building_construction, ownership_type,
             legal_description, certificate_of_title, image_url, region)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(item_id) DO UPDATE SET
             id = excluded.id, address = excluded.address, suburb = excluded.suburb,
             price = excluded.price, bedrooms = excluded.bedrooms, bathrooms = excluded.bathrooms,
             parking = excluded.parking, land_area = excluded.land_area, floor_area = excluded.floor_area,
             listed_at = excluded.listed_at, open_home_times = excluded.open_home_times,
             platform = excluded.platform, watch_status = excluded.watch_status, notes = excluded.notes,
             estimated_value_low = excluded.estimated_value_low, estimated_value_high = excluded.estimated_value_high,
             estimated_value_date = excluded.estimated_value_date, capital_value = excluded.capital_value,
             land_value = excluded.land_value, improvement_value = excluded.improvement_value,
             cv_date = excluded.cv_date, estimated_rental_low = excluded.estimated_rental_low,
             estimated_rental_high = excluded.estimated_rental_high, estimated_rental_yield = excluded.estimated_rental_yield,
             decade_built = excluded.decade_built, contour = excluded.contour,
             building_construction = excluded.building_construction, ownership_type = excluded.ownership_type,
             legal_description = excluded.legal_description, certificate_of_title = excluded.certificate_of_title,
             image_url = excluded.image_url, region = excluded.region, updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.itemId, parsed.address, parsed.suburb, parsed.price,
           parsed.bedrooms, parsed.bathrooms, parsed.parking, parsed.landArea,
           parsed.floorArea, parsed.listedAt, JSON.stringify(parsed.openHomeTimes),
           parsed.platform, parsed.watchStatus, parsed.notes, parsed.estimatedValueLow,
           parsed.estimatedValueHigh, parsed.estimatedValueDate, parsed.capitalValue,
           parsed.landValue, parsed.improvementValue, parsed.cvDate,
           parsed.estimatedRentalLow, parsed.estimatedRentalHigh, parsed.estimatedRentalYield,
           parsed.decadeBuilt, parsed.contour, parsed.buildingConstruction, parsed.ownershipType,
           parsed.legalDescription, parsed.certificateOfTitle, parsed.imageUrl, parsed.region],
        );
        return afterWrite(result, parsed);
      },

      async list(): Promise<PropertyListing[]> {
        return (await readAll<PropertyRow>("SELECT * FROM property_listings ORDER BY id")).map(mapProperty);
      },
    },

    itemLinks: {
      upsert(link: ItemLink): ItemLink | Promise<ItemLink> {
        const parsed = itemLinkSchema.parse(link);
        const result = write(
          `INSERT INTO item_links (id, from_item_id, to_entity_type, to_entity_id, link_reason, confidence)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             from_item_id = excluded.from_item_id, to_entity_type = excluded.to_entity_type,
             to_entity_id = excluded.to_entity_id, link_reason = excluded.link_reason,
             confidence = excluded.confidence, updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.fromItemId, parsed.toEntityType, parsed.toEntityId,
           parsed.linkReason, parsed.confidence],
        );
        return afterWrite(result, parsed);
      },
    },

    schools: {
      upsert(school: School): School | Promise<School> {
        const parsed = schoolSchema.parse(school);
        const result = write(
          `INSERT INTO schools (id, name, school_type, years, gender, authority, has_zone,
             website, area, commute_from_paraparaumu, watch_status, region)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, school_type = excluded.school_type, years = excluded.years,
             gender = excluded.gender, authority = excluded.authority, has_zone = excluded.has_zone,
             website = excluded.website, area = excluded.area,
             commute_from_paraparaumu = excluded.commute_from_paraparaumu,
             watch_status = excluded.watch_status, region = excluded.region,
             updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.name, parsed.schoolType, parsed.years, parsed.gender,
           parsed.authority, parsed.hasZone === null ? null : parsed.hasZone ? 1 : 0,
           parsed.website, parsed.area, parsed.commuteFromParaparaumu,
           parsed.watchStatus, parsed.region],
        );
        return afterWrite(result, parsed);
      },

      async list(): Promise<School[]> {
        return (await readAll<SchoolRow>("SELECT * FROM schools ORDER BY name")).map(mapSchool);
      },

      async get(id: string): Promise<School | null> {
        const row = await readFirst<SchoolRow>("SELECT * FROM schools WHERE id = ?", [id]);
        return row ? mapSchool(row) : null;
      },
    },

    schoolEvents: {
      upsert(event: SchoolEvent): SchoolEvent | Promise<SchoolEvent> {
        const parsed = schoolEventSchema.parse(event);
        const result = write(
          `INSERT INTO school_events (id, school_id, item_id, event_type, starts_at, deadline, enrolment_year)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(item_id) DO UPDATE SET
             id = excluded.id, school_id = excluded.school_id, event_type = excluded.event_type,
             starts_at = excluded.starts_at, deadline = excluded.deadline,
             enrolment_year = excluded.enrolment_year, updated_at = CURRENT_TIMESTAMP`,
          [parsed.id, parsed.schoolId, parsed.itemId, parsed.eventType,
           parsed.startsAt, parsed.deadline, parsed.enrolmentYear],
        );
        return afterWrite(result, parsed);
      },
    },

    notes: {
      upsert(note: Note): Note | Promise<Note> {
        const parsed = noteSchema.parse(note);
        const result = write(
          `INSERT INTO notes (id, entity_type, entity_id, body, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             entity_type = excluded.entity_type, entity_id = excluded.entity_id,
             body = excluded.body, created_at = excluded.created_at`,
          [parsed.id, parsed.entityType, parsed.entityId, parsed.body, parsed.createdAt],
        );
        return afterWrite(result, parsed);
      },
    },
  };
}
