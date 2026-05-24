import type { CacheStore } from "../server/adapters/cacheStore";

type CacheRow = {
  payload: string;
};

export function createD1CacheStore<T>(
  db: D1Database,
  id: string,
): CacheStore<T> {
  return {
    async read() {
      const row = await db
        .prepare("SELECT payload FROM adapter_caches WHERE id = ?")
        .bind(id)
        .first<CacheRow>();

      if (!row) {
        return null;
      }

      try {
        return JSON.parse(row.payload) as T;
      } catch {
        return null;
      }
    },

    async write(cache) {
      await db
        .prepare(
          `INSERT INTO adapter_caches (id, payload, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             payload = excluded.payload,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .bind(id, JSON.stringify(cache))
        .run();
    },
  };
}
