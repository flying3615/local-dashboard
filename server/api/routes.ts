import { Router } from "express";
import type { Request, Response } from "express";
import { createHash } from "node:crypto";

import type { SourceAdapter } from "../adapters/types";
import { createMockPropertyAdapter } from "../adapters/mockProperties";
import { createMockSchoolAdapter } from "../adapters/mockSchools";
import type { createRepositories } from "../db/repositories";
import { refreshAll } from "../jobs/refreshAll";

type Repositories = ReturnType<typeof createRepositories>;

export function createApiRoutes(
  repositories: Repositories,
  adapters: SourceAdapter[] = [
    createMockPropertyAdapter(),
    createMockSchoolAdapter(),
  ],
): Router {
  const router = Router();

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

export function seedMockData(repositories: Repositories): void {
  const adapters = [createMockPropertyAdapter(), createMockSchoolAdapter()];
  const now = new Date().toISOString();

  refreshAll({ repositories, adapters, now: () => now }).catch(
    (error: unknown) => {
      console.error("Seed failed:", error);
    },
  );
}
