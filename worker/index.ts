import { searchKapitiPropertyRecords } from "../server/adapters/kapitiPropertyRecords";
import { configuredPropertySearchLinks } from "../server/adapters/propertySearchLinks";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

type ItemRow = {
  id: string;
  type: string;
  title: string;
  summary: string;
  source_id: string;
  source_url: string;
  area: string | null;
  address: string | null;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  tags: string;
  raw_snapshot_id: string | null;
};

type PropertyRow = {
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
  watch_status: string;
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
};

type SourceRow = {
  id: string;
  name: string;
  type: string;
  url: string;
  trust_level: string;
  enabled: number;
  refresh_interval_minutes: number;
  last_success_at: string | null;
  last_error: string | null;
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
  watch_status: string;
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

type ItemLinkRow = {
  id: string;
  from_item_id: string;
  to_entity_type: string;
  to_entity_id: string;
  link_reason: string;
  confidence: number;
};

type NoteRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  created_at: string;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await routeApi(request, env, url);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Internal error" },
        500,
      );
    }
  },
};

async function routeApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    return json(await getDashboard(env.DB));
  }

  if (request.method === "GET" && url.pathname === "/api/properties") {
    return json(await getProperties(env.DB));
  }

  const propertyMatch = url.pathname.match(/^\/api\/properties\/([^/]+)$/);
  if (request.method === "GET" && propertyMatch) {
    return getProperty(env.DB, decodeURIComponent(propertyMatch[1]!));
  }

  if (request.method === "GET" && url.pathname === "/api/property-search-links") {
    return json(configuredPropertySearchLinks());
  }

  if (request.method === "GET" && url.pathname === "/api/property-records/search") {
    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return json({ error: "Query must contain at least 2 characters" }, 400);
    }

    return json(await searchKapitiPropertyRecords(query));
  }

  if (request.method === "GET" && url.pathname === "/api/schools") {
    return json(await getSchools(env.DB));
  }

  if (request.method === "GET" && url.pathname === "/api/sources") {
    return json(await getSources(env.DB));
  }

  const refreshMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/refresh$/);
  if (request.method === "POST" && refreshMatch) {
    return json({
      sourceId: decodeURIComponent(refreshMatch[1]!),
      status: "skipped",
      recordsProcessed: 0,
      error: "Cloudflare refresh is not enabled in this deployment yet.",
    });
  }

  return json({ error: "Not found" }, 404);
}

async function getDashboard(db: D1Database) {
  const items = await listItems(db);
  const localTypes = new Set([
    "council_notice",
    "local_news",
    "community_event",
    "transport_alert",
  ]);

  return {
    sections: {
      new_listings: items.filter(
        (item) => item.type === "property_listing" && item.status === "new",
      ),
      upcoming_open_homes: items.filter((item) =>
        item.tags.includes("open_home_soon"),
      ),
      school_events: items.filter((item) => item.type === "school_event"),
      local_updates: byNewest(items.filter((item) => localTypes.has(item.type))),
      needs_review: items.filter((item) =>
        item.tags.includes("needs_manual_address_check"),
      ),
      recent_activity: items.filter(
        (item) =>
          !item.tags.includes("open_home_soon") &&
          !item.tags.includes("needs_manual_address_check") &&
          item.status !== "new",
      ),
    },
    totalItems: items.length,
  };
}

async function getProperties(db: D1Database) {
  const [items, properties, sources] = await Promise.all([
    listItems(db, "property_listing"),
    listProperties(db),
    getSources(db),
  ]);

  return items.map((item) => ({
    item,
    property:
      properties.find((property) => property.itemId === item.id) ?? null,
    source: sources.find((source) => source.id === item.sourceId) ?? null,
  }));
}

async function getProperty(db: D1Database, id: string): Promise<Response> {
  const item = (await listItems(db)).find((candidate) => candidate.id === id);

  if (!item || item.type !== "property_listing") {
    return json({ error: "Property not found" }, 404);
  }

  const [properties, source, links, notes] = await Promise.all([
    listProperties(db),
    getSource(db, item.sourceId),
    listItemLinks(db, id),
    listNotes(db, "property", id),
  ]);

  return json({
    item,
    property: properties.find((property) => property.itemId === id) ?? null,
    source,
    links,
    notes,
  });
}

async function getSchools(db: D1Database) {
  const [schools, events, notes] = await Promise.all([
    all<SchoolRow>(db, "SELECT * FROM schools ORDER BY name"),
    all<SchoolEventRow>(db, "SELECT * FROM school_events ORDER BY id"),
    all<NoteRow>(
      db,
      "SELECT * FROM notes WHERE entity_type = ? ORDER BY created_at DESC",
      ["school"],
    ),
  ]);

  return schools.map((schoolRow) => {
    const school = mapSchoolRow(schoolRow);
    return {
      school,
      events: events
        .filter((event) => event.school_id === school.id)
        .map(mapSchoolEventRow),
      notes: notes
        .filter((note) => note.entity_id === school.id)
        .map(mapNoteRow),
    };
  });
}

async function listItems(db: D1Database, type?: string) {
  const rows =
    type === undefined
      ? await all<ItemRow>(db, "SELECT * FROM items ORDER BY id")
      : await all<ItemRow>(db, "SELECT * FROM items WHERE type = ? ORDER BY id", [
          type,
        ]);
  return rows.map(mapItemRow);
}

async function listProperties(db: D1Database) {
  const rows = await all<PropertyRow>(
    db,
    "SELECT * FROM property_listings ORDER BY id",
  );
  return rows.map(mapPropertyRow);
}

async function getSources(db: D1Database) {
  const rows = await all<SourceRow>(db, "SELECT * FROM sources ORDER BY id");
  return rows.map(mapSourceRow);
}

async function getSource(db: D1Database, id: string) {
  const row = await first<SourceRow>(db, "SELECT * FROM sources WHERE id = ?", [
    id,
  ]);
  return row ? mapSourceRow(row) : null;
}

async function listItemLinks(db: D1Database, itemId: string) {
  const rows = await all<ItemLinkRow>(
    db,
    "SELECT * FROM item_links WHERE from_item_id = ? ORDER BY id",
    [itemId],
  );
  return rows.map(mapItemLinkRow);
}

async function listNotes(db: D1Database, entityType: string, entityId: string) {
  const rows = await all<NoteRow>(
    db,
    "SELECT * FROM notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
    [entityType, entityId],
  );
  return rows.map(mapNoteRow);
}

async function all<T>(db: D1Database, sql: string, params: unknown[] = []) {
  return (await db.prepare(sql).bind(...params).all<T>()).results ?? [];
}

async function first<T>(db: D1Database, sql: string, params: unknown[] = []) {
  return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

function mapItemRow(row: ItemRow) {
  return {
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
  };
}

function mapPropertyRow(row: PropertyRow) {
  return {
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
  };
}

function mapSourceRow(row: SourceRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    trustLevel: row.trust_level,
    enabled: row.enabled === 1,
    refreshIntervalMinutes: row.refresh_interval_minutes,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
  };
}

function mapSchoolRow(row: SchoolRow) {
  return {
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
  };
}

function mapSchoolEventRow(row: SchoolEventRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    itemId: row.item_id,
    eventType: row.event_type,
    startsAt: row.starts_at,
    deadline: row.deadline,
    enrolmentYear: row.enrolment_year,
  };
}

function mapItemLinkRow(row: ItemLinkRow) {
  return {
    id: row.id,
    fromItemId: row.from_item_id,
    toEntityType: row.to_entity_type,
    toEntityId: row.to_entity_id,
    linkReason: row.link_reason,
    confidence: row.confidence,
  };
}

function mapNoteRow(row: NoteRow) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function byNewest<T extends { publishedAt: string | null; startsAt: string | null }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    return itemTime(right) - itemTime(left);
  });
}

function itemTime(item: { publishedAt: string | null; startsAt: string | null }) {
  const value = item.publishedAt ?? item.startsAt;
  if (value === null) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
