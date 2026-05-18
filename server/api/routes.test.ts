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
  app.use("/api", createApiRoutes(repos));
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
    expect(body.sections).toHaveProperty("needs_review");
    expect(body.sections).toHaveProperty("recent_activity");
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
