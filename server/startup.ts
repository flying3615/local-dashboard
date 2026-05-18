import type { SourceAdapter } from "./adapters/types";
import { activeAdapters, mockAdapters } from "./adapters/sourceConfig";
import type { createRepositories } from "./db/repositories";

type Environment = Record<string, string | undefined>;
type Repositories = ReturnType<typeof createRepositories>;

export function shouldSeedMockData(env: Environment): boolean {
  return env.ENABLE_MOCK_DATA === "true";
}

export function runtimeAdapters(env: Environment): SourceAdapter[] {
  return shouldSeedMockData(env)
    ? [...mockAdapters(), ...activeAdapters()]
    : activeAdapters();
}

export function registerAdapterSources(
  repositories: Repositories,
  adapters: SourceAdapter[],
): void {
  for (const adapter of adapters) {
    const existing = repositories.sources.get(adapter.sourceId);
    repositories.sources.upsert({
      id: adapter.sourceId,
      name: adapter.source.name,
      type: adapter.source.type,
      url: adapter.source.url,
      trustLevel: adapter.source.trustLevel,
      enabled: existing?.enabled ?? adapter.source.enabled ?? false,
      refreshIntervalMinutes:
        existing?.refreshIntervalMinutes ??
        adapter.source.refreshIntervalMinutes ??
        1440,
      lastSuccessAt: existing?.lastSuccessAt ?? null,
      lastError: existing?.lastError ?? null,
    });
  }
}
