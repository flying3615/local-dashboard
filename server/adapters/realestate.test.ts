import { describe, expect, it } from "vitest";

import { createRealestateAdapter } from "./realestate";
import type { RealestateCache, RealestateCacheStore } from "./realestate";

function sitemap(entries: Array<{ id: string; slug: string; lastmod: string }>) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset>
      ${entries
        .map(
          (entry) => `
          <url>
            <loc>https://www.realestate.co.nz/${entry.id}/residential/sale/${entry.slug}</loc>
            <lastmod>${entry.lastmod}</lastmod>
          </url>`,
        )
        .join("")}
    </urlset>`;
}

function listingResponse(id: string, address: string) {
  return {
    data: {
      id,
      attributes: {
        "bedroom-count": 3,
        "bathroom-count": 2,
        "land-area": 640,
        "floor-area": 150,
        "price-display": "Buyer enquiry over $850,000",
        "published-date": "2026-05-18T00:00:00.000Z",
        "open-homes": [{ start: "2026-05-24T01:00:00.000Z" }],
        address: {
          "full-address": address,
          suburb: "Paraparaumu",
        },
      },
    },
  };
}

function response(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 503,
    async text() {
      return String(body);
    },
    async json() {
      return body;
    },
  };
}

function memoryCache(initial: RealestateCache | null = null) {
  let saved: RealestateCache | null = initial;
  const store: RealestateCacheStore = {
    async read() {
      return saved;
    },
    async write(cache) {
      saved = cache;
    },
  };

  return {
    store,
    saved() {
      return saved;
    },
  };
}

describe("createRealestateAdapter", () => {
  it("fetches changed Paraparaumu listings and caches only successful listings", async () => {
    const cache = memoryCache();
    const fetchedUrls: string[] = [];
    const adapter = createRealestateAdapter({
      cacheStore: cache.store,
      throttleMs: 0,
      maxListingsPerFetch: 2,
      fetchImpl: async (url) => {
        fetchedUrls.push(url);
        if (url.includes("residential-sale-listings.xml")) {
          return response(
            sitemap([
              {
                id: "111",
                slug: "wellington/kapiti-coast/paraparaumu/1-test-street",
                lastmod: "2026-05-18T00:00:00.000Z",
              },
              {
                id: "222",
                slug: "wellington/kapiti-coast/paraparaumu/2-test-street",
                lastmod: "2026-05-18T01:00:00.000Z",
              },
              {
                id: "333",
                slug: "wellington/kapiti-coast/paraparaumu/3-test-street",
                lastmod: "2026-05-18T02:00:00.000Z",
              },
            ]),
          );
        }

        if (url.includes("/111?")) {
          return response(listingResponse("111", "1 Test Street, Paraparaumu"));
        }

        return response({ error: "temporary failure" }, false);
      },
    });

    const records = await adapter.fetch();

    expect(records).toEqual([
      expect.objectContaining({
        address: "1 Test Street, Paraparaumu",
        platform: "realestate.co.nz",
        bedrooms: 3,
        bathrooms: 2,
        price: "Buyer enquiry over $850,000",
      }),
    ]);
    expect(fetchedUrls.filter((url) => url.includes("/search/v1/listings/"))).toHaveLength(2);
    expect(cache.saved()?.listings).toEqual({
      "111": "2026-05-18T00:00:00.000Z",
    });
  });

  it("skips unchanged cached listings and retries uncached failures later", async () => {
    const cache = memoryCache({
      fetchedAt: "2026-05-18T00:00:00.000Z",
      listings: {
        "111": "2026-05-18T00:00:00.000Z",
      },
    });
    const fetchedUrls: string[] = [];
    const adapter = createRealestateAdapter({
      cacheStore: cache.store,
      throttleMs: 0,
      maxListingsPerFetch: 10,
      fetchImpl: async (url) => {
        fetchedUrls.push(url);
        if (url.includes("residential-sale-listings.xml")) {
          return response(
            sitemap([
              {
                id: "111",
                slug: "wellington/kapiti-coast/paraparaumu/1-test-street",
                lastmod: "2026-05-18T00:00:00.000Z",
              },
              {
                id: "222",
                slug: "wellington/kapiti-coast/paraparaumu/2-test-street",
                lastmod: "2026-05-18T01:00:00.000Z",
              },
            ]),
          );
        }

        return response(listingResponse("222", "2 Test Street, Paraparaumu"));
      },
    });

    const records = await adapter.fetch();

    expect(records).toHaveLength(1);
    expect(fetchedUrls.some((url) => url.includes("/111?"))).toBe(false);
    expect(fetchedUrls.some((url) => url.includes("/222?"))).toBe(true);
    expect(cache.saved()?.listings).toEqual({
      "111": "2026-05-18T00:00:00.000Z",
      "222": "2026-05-18T01:00:00.000Z",
    });
  });
});
