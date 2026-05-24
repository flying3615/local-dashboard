import { describe, expect, it } from "vitest";

import { createD1CacheStore } from "./d1CacheStore";

function fakeD1() {
  const rows = new Map<string, string>();
  let sql = "";
  let params: unknown[] = [];

  return {
    rows,
    db: {
      prepare(nextSql: string) {
        sql = nextSql;
        return {
          bind(...nextParams: unknown[]) {
            params = nextParams;
            return this;
          },
          async first<T>() {
            const id = String(params[0]);
            const payload = rows.get(id);
            return (payload === undefined ? null : { payload }) as T | null;
          },
          async run() {
            const id = String(params[0]);
            const payload = String(params[1]);
            rows.set(id, payload);
            return { success: true, meta: {}, results: [] };
          },
        };
      },
    } as unknown as D1Database,
    lastSql() {
      return sql;
    },
  };
}

describe("createD1CacheStore", () => {
  it("persists and reads cache payloads by id", async () => {
    const { db, lastSql } = fakeD1();
    const store = createD1CacheStore<{ fetchedAt: string }>(db, "cache-a");

    expect(await store.read()).toBeNull();

    await store.write({ fetchedAt: "2026-05-24T01:00:00.000Z" });

    expect(lastSql()).toContain("adapter_caches");
    expect(await store.read()).toEqual({
      fetchedAt: "2026-05-24T01:00:00.000Z",
    });
  });

  it("returns null for invalid cached JSON", async () => {
    const { db, rows } = fakeD1();
    rows.set("cache-a", "{broken");

    const store = createD1CacheStore(db, "cache-a");

    expect(await store.read()).toBeNull();
  });
});
