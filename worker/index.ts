import { searchKapitiPropertyRecords } from "../server/adapters/kapitiPropertyRecords";
import { configuredPropertySearchLinks } from "../server/adapters/propertySearchLinks";
import { allRegions, defaultRegion } from "../server/config/regions";
import { scheduledRefresh } from "./refresh";
import {
  mapItemRow,
  mapPropertyRow,
  mapSourceRow,
  mapSchoolRow,
  mapSchoolEventRow,
  mapItemLinkRow,
  mapNoteRow,
  parseJsonArray,
  type ItemRow,
  type PropertyRow,
  type SourceRow,
  type SchoolRow,
  type SchoolEventRow,
  type ItemLinkRow,
  type NoteRow,
} from "./rowMappers";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

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

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(scheduledRefresh(event, env));
  },
};

async function routeApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (request.method === "GET" && url.pathname === "/api/regions") {
    return json(allRegions().map((r) => ({
      id: r.id,
      name: r.name,
      council: r.council,
    })));
  }

  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    const region = url.searchParams.get("region") ?? defaultRegion().id;
    return json(await getDashboard(env.DB, region));
  }

  if (request.method === "GET" && url.pathname === "/api/properties") {
    const region = url.searchParams.get("region") ?? defaultRegion().id;
    return json(await getProperties(env.DB, region));
  }

  const propertyMatch = url.pathname.match(/^\/api\/properties\/([^/]+)$/);
  if (request.method === "GET" && propertyMatch) {
    return getProperty(env.DB, decodeURIComponent(propertyMatch[1]!));
  }

  if (request.method === "GET" && url.pathname === "/api/property-search-links") {
    const region = url.searchParams.get("region") ?? defaultRegion().id;
    return json(configuredPropertySearchLinks(region));
  }

  if (request.method === "GET" && url.pathname === "/api/property-records/search") {
    const query = url.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return json({ error: "Query must contain at least 2 characters" }, 400);
    }

    return json(await searchKapitiPropertyRecords(query));
  }

  if (request.method === "GET" && url.pathname === "/api/schools") {
    const region = url.searchParams.get("region") ?? defaultRegion().id;
    return json(await getSchools(env.DB, region));
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

async function getDashboard(db: D1Database, region: string) {
  const items = await listItems(db, undefined, region);
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

async function getProperties(db: D1Database, region: string) {
  const [items, properties, sources] = await Promise.all([
    listItems(db, "property_listing", region),
    listProperties(db, region),
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

async function getSchools(db: D1Database, region: string) {
  const [schools, events, notes] = await Promise.all([
    all<SchoolRow>(db, "SELECT * FROM schools WHERE region = ? ORDER BY name", [region]),
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

async function listItems(db: D1Database, type?: string, region?: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (type !== undefined) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (region !== undefined) {
    conditions.push("region = ?");
    params.push(region);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await all<ItemRow>(db, `SELECT * FROM items ${where} ORDER BY id`, params);
  return rows.map(mapItemRow);
}

async function listProperties(db: D1Database, region?: string) {
  const rows = region
    ? await all<PropertyRow>(db, "SELECT * FROM property_listings WHERE region = ? ORDER BY id", [region])
    : await all<PropertyRow>(db, "SELECT * FROM property_listings ORDER BY id");
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}
