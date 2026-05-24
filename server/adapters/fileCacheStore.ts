import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CacheStore } from "./cacheStore";

export function createFileCacheStore<T>(path: string): CacheStore<T> {
  return {
    async read() {
      try {
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async write(cache) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(cache), "utf-8");
    },
  };
}
