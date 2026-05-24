import { describe, it, expect } from "vitest";
import { gzipSync } from "node:zlib";
import {
  createHomesNzAdapter,
  type PropertyCache,
  type SitemapCache,
} from "./homesNz";
import type { CacheStore } from "./cacheStore";

// ── Test helpers ────────────────────────────────────────────────

function sitemapXml(entries: Array<{ url: string }>) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset>';
  for (const entry of entries) {
    xml += `<url><loc>${entry.url}</loc></url>`;
  }
  xml += "</urlset>";
  return xml;
}

function propertyPage(details: Record<string, unknown>) {
  const state = {
    "2351154191": {
      b: {
        card: {
          property_details: details,
        },
      },
    },
    __nghData__: [],
  };
  return `<!DOCTYPE html><html><head></head><body>
    <script id="homes-app-state" type="application/json">${JSON.stringify(state)}</script>
  </body></html>`;
}

function response(body: string, ok = true) {
  return {
    ok,
    status: ok ? 200 : 404,
    headers: new Headers(),
    async text() {
      return body;
    },
    async arrayBuffer() {
      return new TextEncoder().encode(body).buffer;
    },
    async json() {
      return JSON.parse(body);
    },
  };
}

function binaryResponse(body: Uint8Array, ok = true) {
  return {
    ok,
    status: ok ? 200 : 404,
    headers: new Headers(),
    async text() {
      return new TextDecoder().decode(body);
    },
    async arrayBuffer() {
      return body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      );
    },
    async json() {
      return JSON.parse(new TextDecoder().decode(body));
    },
  };
}

function memorySitemapCache(initial: SitemapCache | null = null) {
  let saved = initial;
  return {
    store: {
      async read() {
        return saved;
      },
      async write(c: SitemapCache) {
        saved = c;
      },
    } as CacheStore<SitemapCache>,
    saved() {
      return saved;
    },
  };
}

function memoryPropertyCache(initial: PropertyCache | null = null) {
  let saved = initial;
  return {
    store: {
      async read() {
        return saved;
      },
      async write(c: PropertyCache) {
        saved = c;
      },
    } as CacheStore<PropertyCache>,
    saved() {
      return saved;
    },
  };
}

// ── Property URL fixtures ───────────────────────────────────────

const eBB0X_entry = {
  url: "https://homes.co.nz/address/paraparaumu/paraparaumu-beach/3-test-street/eBB0X",
};
const WAw7b_entry = {
  url: "https://homes.co.nz/address/paraparaumu/paraparaumu/5-sample-ave/WAw7b",
};
const YnY7V_entry = {
  url: "https://homes.co.nz/address/paraparaumu/paraparaumu/10-third-st/YnY7V",
};

const eBB0X_details: Record<string, unknown> = {
  address: "3 Test Street",
  suburb: "Paraparaumu Beach",
  display_estimated_value_short: "$950K",
  num_bedrooms: 3,
  num_bathrooms: 2,
  num_car_spaces: 1,
  land_area: 600,
  floor_area: 150,
  display_estimated_lower_value_short: "900K",
  display_estimated_upper_value_short: "1M",
  estimated_value_revision_date: "2026-05-01",
  capital_value: 850000,
  land_value: 400000,
  improvement_value: 450000,
  current_revision_date: "2025-09-01",
  display_estimated_rental_lower_value_short: "500",
  display_estimated_rental_upper_value_short: "600",
  estimated_rental_yield: "4.2%",
  decade_built: "1980s",
  contour: "Flat",
  building_construction: "Timber",
  ownership_type: "Freehold",
  legal_description: "Lot 1 DP 12345",
  certificate_of_title: "WN12A/123",
  hero_cover_image_url: "https://images.homes.co.nz/test.jpg",
};

const WAw7b_details: Record<string, unknown> = {
  address: "5 Sample Avenue",
  suburb: "Paraparaumu",
  num_bedrooms: 4,
  num_bathrooms: 2,
  land_area: 800,
  floor_area: 200,
  display_estimated_lower_value_short: "750K",
  display_estimated_upper_value_short: "850K",
  estimated_value_revision_date: "2026-04-15",
};

// ── Tests ───────────────────────────────────────────────────────

describe("homesNz adapter", () => {
  it("decompresses homes.co.nz gzip sitemaps before matching Paraparaumu URLs", async () => {
    const sitemap = sitemapXml([eBB0X_entry]);

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return binaryResponse(gzipSync(sitemap));
      }
      if (url.includes("eBB0X")) {
        return response(propertyPage(eBB0X_details));
      }
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: memorySitemapCache().store,
      propertyCacheStore: memoryPropertyCache().store,
      maxPropertiesPerFetch: 1,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    expect(records).toHaveLength(1);
    expect(records[0]?.sourceUrl).toBe(eBB0X_entry.url);
  });

  it("discovers Paraparaumu properties from sitemaps and extracts data from SSR pages", async () => {
    const sitemapCache = memorySitemapCache();
    const propertyCache = memoryPropertyCache();
    const propertyPageCalls: string[] = [];

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return response(sitemapXml([eBB0X_entry, WAw7b_entry, YnY7V_entry]));
      }
      if (url.includes("eBB0X")) {
        propertyPageCalls.push("eBB0X");
        return response(propertyPage(eBB0X_details));
      }
      if (url.includes("WAw7b")) {
        propertyPageCalls.push("WAw7b");
        return response("", false);
      }
      if (url.includes("YnY7V")) {
        propertyPageCalls.push("YnY7V");
        return response("", false);
      }
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: sitemapCache.store,
      propertyCacheStore: propertyCache.store,
      maxPropertiesPerFetch: 2,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    // Only eBB0X and WAw7b were attempted (within the cap of 2); YnY7V was NOT fetched
    expect(propertyPageCalls).toHaveLength(2);
    expect(propertyPageCalls).toContain("eBB0X");
    expect(propertyPageCalls).toContain("WAw7b");
    expect(propertyPageCalls).not.toContain("YnY7V");

    // eBB0X succeeded, WAw7b returned 404 → only 1 record
    expect(records).toHaveLength(1);

    const record = records[0] as Record<string, unknown>;
    expect(record.address).toBe("3 Test Street");
    expect(record.platform).toBe("homes.co.nz");
    expect(record.sourceId).toBe("homes_co_nz");
    expect(record.suburb).toBe("Paraparaumu Beach");
    expect(record.area).toBe("Paraparaumu Beach");
    expect(record.price).toBe("$950K");
    expect(record.estimatedValueLow).toBe(900000);
    expect(record.estimatedValueHigh).toBe(1000000);
    expect(record.estimatedValueDate).toBe("2026-05-01");
    expect(record.capitalValue).toBe(850000);
    expect(record.landValue).toBe(400000);
    expect(record.improvementValue).toBe(450000);
    expect(record.cvDate).toBe("2025-09-01");
    expect(record.landArea).toBe(600);
    expect(record.floorArea).toBe(150);
    expect(record.bedrooms).toBe(3);
    expect(record.bathrooms).toBe(2);
    expect(record.parking).toBe(1);
    expect(record.decadeBuilt).toBe("1980s");
    expect(record.contour).toBe("Flat");
    expect(record.ownershipType).toBe("Freehold");
    expect(record.legalDescription).toBe("Lot 1 DP 12345");
    expect(record.certificateOfTitle).toBe("WN12A/123");
    expect(record.imageUrl).toBe("https://images.homes.co.nz/test.jpg");

    // Sitemap cache was written after discovery
    const savedSitemap = sitemapCache.saved();
    expect(savedSitemap).not.toBeNull();
    expect(savedSitemap!.properties).toHaveLength(3);
  });

  it("skips properties already in cache", async () => {
    const propertyCache = memoryPropertyCache({
      fetchedAt: new Date().toISOString(),
      revisions: { eBB0X: "2026-05-01" },
    });

    const propertyPageCalls: string[] = [];

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return response(sitemapXml([eBB0X_entry, WAw7b_entry]));
      }
      if (url.includes("eBB0X")) {
        propertyPageCalls.push("eBB0X");
        return response(propertyPage(eBB0X_details));
      }
      if (url.includes("WAw7b")) {
        propertyPageCalls.push("WAw7b");
        return response(propertyPage(WAw7b_details));
      }
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: memorySitemapCache().store,
      propertyCacheStore: propertyCache.store,
      maxPropertiesPerFetch: 5,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    // Only WAw7b is fetched; eBB0X was already cached
    expect(propertyPageCalls).toEqual(["WAw7b"]);
    expect(records).toHaveLength(1);

    const record = records[0] as Record<string, unknown>;
    expect(record.address).toBe("5 Sample Avenue");
    expect(record.sourceId).toBe("homes_co_nz");
  });

  it("returns empty when all properties are cached", async () => {
    const propertyCache = memoryPropertyCache({
      fetchedAt: new Date().toISOString(),
      revisions: {
        eBB0X: "2026-05-01",
        WAw7b: "2026-04-15",
      },
    });

    const propertyPageCalls: string[] = [];

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return response(sitemapXml([eBB0X_entry, WAw7b_entry]));
      }
      propertyPageCalls.push(url);
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: memorySitemapCache().store,
      propertyCacheStore: propertyCache.store,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    // No property pages fetched
    expect(propertyPageCalls).toHaveLength(0);
    expect(records).toHaveLength(0);
  });

  it("returns empty for pages missing homes-app-state script", async () => {
    const propertyPageCalls: string[] = [];

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return response(sitemapXml([eBB0X_entry]));
      }
      if (url.includes("eBB0X")) {
        propertyPageCalls.push("eBB0X");
        return response("<!DOCTYPE html><html><body>404</body></html>");
      }
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: memorySitemapCache().store,
      propertyCacheStore: memoryPropertyCache().store,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    expect(propertyPageCalls).toHaveLength(1);
    expect(records).toHaveLength(0);
  });

  it("parses million-format values correctly", async () => {
    const details: Record<string, unknown> = {
      address: "10 Million Dollar View",
      suburb: "Paraparaumu Beach",
      display_estimated_lower_value_short: "1.2M",
      display_estimated_upper_value_short: "1.5M",
    };

    async function mockFetch(url: string) {
      if (url.includes("sitemapv2_properties")) {
        return response(sitemapXml([eBB0X_entry]));
      }
      if (url.includes("eBB0X")) {
        return response(propertyPage(details));
      }
      return response("", false);
    }

    const adapter = createHomesNzAdapter({
      fetchImpl: mockFetch,
      sitemapCacheStore: memorySitemapCache().store,
      propertyCacheStore: memoryPropertyCache().store,
      throttleMs: 0,
    });

    const records = await adapter.fetch();

    expect(records).toHaveLength(1);

    const record = records[0] as Record<string, unknown>;
    expect(record.estimatedValueLow).toBe(1200000);
    expect(record.estimatedValueHigh).toBe(1500000);
  });
});
