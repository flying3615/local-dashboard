import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { Server } from "node:http";

import { createInMemoryDatabase } from "../db/database";
import { createRepositories } from "../db/repositories";
import { createApiRoutes } from "./routes";
import { createMockPropertyAdapter } from "../adapters/mockProperties";

function createTestApp() {
  const db = createInMemoryDatabase();
  const repos = createRepositories(db);
  const app = express();
  app.use(express.json());
  app.use(
    "/api",
    createApiRoutes(repos, undefined, {
      searchPropertyRecords: async (query) => [
        {
          id: "kcdc_property_722260",
          valuationId: "1494100400",
          propertyNumber: 4811,
          address: `${query} Road, Paraparaumu`,
          legalDescription: "PT LOT 79 DP 14701",
          landValue: 570000,
          capitalValue: 590000,
          improvementsValue: 20000,
          hectares: 1.7585,
          valuationDate: "2023-08-01T00:00:00.000Z",
          latitude: -40.88217347,
          longitude: 175.06090763,
          sourceUrl:
            "https://maps.kapiticoast.govt.nz/server/rest/services/Public/Property_Public/MapServer/0",
        },
      ],
    }),
  );
  return { app, db, repos };
}

function startServer(app: express.Express): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}

describe("API routes", () => {
  let server: Server;
  let url: string;
  let repos: ReturnType<typeof createRepositories>;

  beforeAll(async () => {
    const { app, repos: r } = createTestApp();
    repos = r;
    const started = await startServer(app);
    server = started.server;
    url = started.url;
  });

  afterAll(() => {
    server.close();
  });

  it("GET /api/dashboard returns sections and total", async () => {
    const res = await fetch(`${url}/api/dashboard`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("sections");
    expect(body).toHaveProperty("totalItems");
    expect(body.sections).toHaveProperty("new_listings");
    expect(body.sections).toHaveProperty("upcoming_open_homes");
    expect(body.sections).toHaveProperty("school_events");
    expect(body.sections).toHaveProperty("local_updates");
    expect(body.sections).toHaveProperty("needs_review");
    expect(body.sections).toHaveProperty("recent_activity");
  });

  it("GET /api/dashboard sorts local updates by published date descending", async () => {
    repos.sources.upsert({
      id: "kapiti_council",
      name: "Kāpiti Council",
      type: "official_open_data",
      url: "https://data-kcdc.opendata.arcgis.com/",
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
      lastSuccessAt: null,
      lastError: null,
    });
    repos.items.upsert({
      id: "old_notice",
      type: "council_notice",
      title: "Old update",
      summary: "Old",
      sourceId: "kapiti_council",
      sourceUrl: "https://example.com/old",
      area: "Kāpiti Coast District",
      address: null,
      publishedAt: "2024-01-01T00:00:00.000Z",
      startsAt: null,
      endsAt: null,
      status: "new",
      tags: ["kapiti"],
      rawSnapshotId: null,
      lastSeenAt: null,
    });
    repos.items.upsert({
      id: "new_notice",
      type: "council_notice",
      title: "New update",
      summary: "New",
      sourceId: "kapiti_council",
      sourceUrl: "https://example.com/new",
      area: "Kāpiti Coast District",
      address: null,
      publishedAt: "2026-05-15T00:00:00.000Z",
      startsAt: null,
      endsAt: null,
      status: "new",
      tags: ["kapiti"],
      rawSnapshotId: null,
      lastSeenAt: null,
    });

    const res = await fetch(`${url}/api/dashboard`);
    const body = await res.json();

    expect(body.sections.local_updates.map((item: { title: string }) => item.title)).toEqual([
      "New update",
      "Old update",
    ]);
  });

  it("GET /api/properties returns empty array when no data seeded", async () => {
    const res = await fetch(`${url}/api/properties`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("GET /api/properties/:id returns 404 for unknown property", async () => {
    const res = await fetch(`${url}/api/properties/nonexistent`);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("GET /api/property-search-links returns realestate external search links", async () => {
    const res = await fetch(`${url}/api/property-search-links`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "realestate_paraparaumu_residential_sale",
          provider: "realestate.co.nz",
          url: expect.stringContaining(
            "/residential/sale/wellington/kapiti-coast/paraparaumu",
          ),
        }),
      ]),
    );
  });

  it("GET /api/property-records/search returns official KCDC property records", async () => {
    const res = await fetch(`${url}/api/property-records/search?q=Otaihanga`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual([
      expect.objectContaining({
        id: "kcdc_property_722260",
        address: "Otaihanga Road, Paraparaumu",
        capitalValue: 590000,
        sourceUrl: expect.stringContaining("Property_Public"),
      }),
    ]);
  });

  it("GET /api/property-records/search validates query length", async () => {
    const res = await fetch(`${url}/api/property-records/search?q=a`);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("GET /api/schools returns tracked schools after refresh", async () => {
    await fetch(`${url}/api/sources/mock_schools/refresh`, {
      method: "POST",
    });

    const res = await fetch(`${url}/api/schools`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual([
      expect.objectContaining({
        school: expect.objectContaining({
          name: "Paraparaumu College",
        }),
        events: expect.arrayContaining([
          expect.objectContaining({
            eventType: "open_day",
          }),
        ]),
      }),
    ]);
  });

  it("GET /api/sources returns empty array when no sources configured", async () => {
    const res = await fetch(`${url}/api/sources`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("POST /api/sources/:id/refresh returns results for mock property adapter", async () => {
    const adapter = createMockPropertyAdapter();
    const res = await fetch(`${url}/api/sources/${adapter.sourceId}/refresh`, {
      method: "POST",
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      sourceId: adapter.sourceId,
      status: "success",
      recordsProcessed: 1,
    });

    const propertiesRes = await fetch(`${url}/api/properties`);
    const properties = await propertiesRes.json();
    expect(properties).toHaveLength(1);
    expect(properties[0].item).toMatchObject({
      type: "property_listing",
      title: "42 Raumati Road",
    });
    expect(properties[0].property).toMatchObject({
      suburb: "Paraparaumu",
      bedrooms: 3,
      bathrooms: 2,
    });
    expect(properties[0].source).toMatchObject({
      id: adapter.sourceId,
      name: "Mock Paraparaumu Property Listings",
    });

    const propertyId = properties[0].item.id;
    const detailRes = await fetch(`${url}/api/properties/${propertyId}`);
    expect(detailRes.status).toBe(200);

    const detail = await detailRes.json();
    expect(detail.item).toMatchObject({ id: propertyId });
    expect(detail.source).toMatchObject({ id: adapter.sourceId });
    expect(Array.isArray(detail.links)).toBe(true);
    expect(Array.isArray(detail.notes)).toBe(true);
  });

  it("POST /api/sources/:id/refresh forces a manual refresh", async () => {
    const adapter = createMockPropertyAdapter();
    repos.sources.upsert({
      id: adapter.sourceId,
      name: adapter.source.name,
      type: adapter.source.type,
      url: adapter.source.url,
      trustLevel: adapter.source.trustLevel,
      enabled: true,
      refreshIntervalMinutes: 720,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
    });

    const res = await fetch(`${url}/api/sources/${adapter.sourceId}/refresh`, {
      method: "POST",
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      sourceId: adapter.sourceId,
      status: "success",
      recordsProcessed: 1,
    });
  });

  it("POST /api/sources/:id/refresh returns 404 for unknown source", async () => {
    const res = await fetch(`${url}/api/sources/unknown_source/refresh`, {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/sources/:id/refresh returns data from dashboard after refresh", async () => {
    const adapter = createMockPropertyAdapter();
    await fetch(`${url}/api/sources/${adapter.sourceId}/refresh`, {
      method: "POST",
    });

    const dashboardRes = await fetch(`${url}/api/dashboard`);
    const dashboard = await dashboardRes.json();
    expect(dashboard.totalItems).toBeGreaterThanOrEqual(1);
  });
});
