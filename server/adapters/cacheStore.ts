export interface CacheStore<T> {
  read(): Promise<T | null>;
  write(cache: T): Promise<void>;
}

export function createNoopCacheStore<T>(): CacheStore<T> {
  let cache: T | null = null;
  return {
    async read() {
      return cache;
    },
    async write(c) {
      cache = c;
    },
  };
}
