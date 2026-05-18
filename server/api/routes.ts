import { Router } from "express";
import type { Request, Response } from "express";
import { createHash } from "node:crypto";

import type { SourceAdapter } from "../adapters/types";
import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import { searchKapitiPropertyRecords } from "../adapters/kapitiPropertyRecords";
import type { KapitiPropertyRecord } from "../adapters/kapitiPropertyRecords";
import type { createRepositories } from "../db/repositories";
import { refreshAll } from "../jobs/refreshAll";

type Repositories = ReturnType<typeof createRepositories>;
type SearchPropertyRecords = (query: string) => Promise<KapitiPropertyRecord[]>;

export interface CreateApiRoutesOptions {
  searchPropertyRecords?: SearchPropertyRecords;
}

export function createApiRoutes(
  repositories: Repositories,
  adapters: SourceAdapter[] = [
    createMockPropertyAdapter(),
    createMockSchoolAdapter(),
  ],
  options: CreateApiRoutesOptions = {},
): Router {
  const router = Router();
  const searchPropertyRecords =
    options.searchPropertyRecords ?? searchKapitiPropertyRecords;

  router.get("/dashboard", (_req: Request, res: Response) => {
    const items = repositories.items.list();

    const sections = {
      new_listings: items.filter(
        (item) => item.type === "property_listing" && item.status === "new",
      ),
      upcoming_open_homes: items.filter((item) =>
        item.tags.includes("open_home_soon"),
      ),
      school_events: items.filter((item) => item.type === "school_event"),
      local_updates: byNewest(
        items.filter((item) =>
          [
            "council_notice",
            "local_news",
            "community_event",
            "transport_alert",
          ].includes(item.type),
        ),
      ),
      needs_review: items.filter((item) =>
        item.tags.includes("needs_manual_address_check"),
      ),
      recent_activity: items.filter(
        (item) =>
          !item.tags.includes("open_home_soon") &&
          !item.tags.includes("needs_manual_address_check") &&
          item.status !== "new",
      ),
    };

    res.json({
      sections,
      totalItems: items.length,
    });
  });

  router.get("/properties", (_req: Request, res: Response) => {
    const propertyItems = repositories.items.list({
      type: "property_listing",
    });
    const properties = repositories.properties.list();
    const sources = repositories.sources.list();

    const result = propertyItems.map((item) => {
      const property = properties.find((p) => p.itemId === item.id);
      const source = sources.find((s) => s.id === item.sourceId);
      return { item, property: property ?? null, source: source ?? null };
    });

    res.json(result);
  });

  router.get("/properties/:id", (req: Request, res: Response) => {
    const id = String(req.params.id);
    const item = repositories.items.list().find((candidate) => candidate.id === id);

    if (!item || item.type !== "property_listing") {
      res.status(404).json({ error: "Property not found" });
      return;
    }

    const property = repositories.properties
      .list()
      .find((p) => p.itemId === id);
    const source = repositories.sources.get(item.sourceId);
    const links = repositories.itemLinks.listByItem(id);
    const notes = repositories.notes.listByEntity("property", id);

    res.json({ item, property: property ?? null, source, links, notes });
  });

  router.get("/property-records/search", async (req: Request, res: Response) => {
    const query = String(req.query.q ?? "").trim();

    if (query.length < 2) {
      res.status(400).json({ error: "Query must contain at least 2 characters" });
      return;
    }

    try {
      res.json(await searchPropertyRecords(query));
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : "Property lookup failed",
      });
    }
  });

  router.get("/schools", (_req: Request, res: Response) => {
    const schools = repositories.schools.list();

    const result = schools.map((school) => {
      const events = repositories.schoolEvents.listBySchool(school.id);
      const notes = repositories.notes.listByEntity("school", school.id);
      return { school, events, notes };
    });

    res.json(result);
  });

  router.get("/sources", (_req: Request, res: Response) => {
    const sources = repositories.sources.list();
    res.json(sources);
  });

  router.post("/sources/:id/refresh", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const adapter = adapters.find((adapter) => adapter.sourceId === id);

    if (!adapter) {
      res.status(404).json({ error: "Source not found" });
      return;
    }

    const results = await refreshAll({
      repositories,
      adapters: [adapter],
    });

    res.json(results[0]);
  });

  return router;
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

export function seedMockData(repositories: Repositories): void {
  const adapters = [createMockPropertyAdapter(), createMockSchoolAdapter()];
  const now = new Date().toISOString();

  refreshAll({ repositories, adapters, now: () => now }).catch(
    (error: unknown) => {
      console.error("Seed failed:", error);
    },
  );
}
