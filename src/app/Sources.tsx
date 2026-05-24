import { useMemo } from "react";
import { RefreshButton } from "../components/RefreshButton";
import type { Source } from "../lib/types";

interface SourcesProps {
  sources: Source[];
}

interface SourceGroup {
  name: string;
  url: string;
  type: string;
  trustLevel: string;
  regions: Source[];
}

function groupSources(sources: Source[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();

  for (const source of sources) {
    const existing = map.get(source.name);
    if (existing) {
      existing.regions.push(source);
    } else {
      map.set(source.name, {
        name: source.name,
        url: source.url,
        type: source.type,
        trustLevel: source.trustLevel,
        regions: [source],
      });
    }
  }

  return [...map.values()];
}

const regionIds = new Set([
  "kapiti", "wellington", "lower-hutt", "upper-hutt", "porirua",
]);

function regionLabel(sourceId: string): string {
  const parts = sourceId.split("_");
  const last = parts[parts.length - 1];
  if (!last || last === sourceId) return "global";
  if (regionIds.has(last)) return last.replace(/-/g, " ");
  return "global";
}

function latestSuccess(sources: Source[]): string | null {
  let latest: string | null = null;
  for (const s of sources) {
    if (s.lastSuccessAt && (!latest || s.lastSuccessAt > latest)) {
      latest = s.lastSuccessAt;
    }
  }
  return latest;
}

function hasError(sources: Source[]): boolean {
  return sources.some((s) => s.lastError != null);
}

function firstError(sources: Source[]): string | null {
  for (const s of sources) {
    if (s.lastError) return s.lastError;
  }
  return null;
}

export function Sources({ sources }: SourcesProps) {
  const groups = useMemo(() => groupSources(sources), [sources]);

  return (
    <div className="sources-view" data-testid="sources-view">
      <div className="container">
        <h2 style={{ marginBottom: "var(--space-8)" }}>Sources</h2>
        {groups.length === 0 ? (
          <p className="empty-state">
            No sources configured. Refresh a source to populate the list.
          </p>
        ) : (
          <table className="sources-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Trust</th>
                <th>Regions</th>
                <th>Last Success</th>
                <th>Status</th>
                <th>Refresh</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const success = latestSuccess(group.regions);
                const error = firstError(group.regions);
                const allEnabled = group.regions.every((s) => s.enabled);
                return (
                  <tr key={group.name}>
                    <td>
                      <a
                        href={group.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        {group.name}
                      </a>
                    </td>
                    <td>{group.type}</td>
                    <td>{group.trustLevel}</td>
                    <td>
                      <div className="source-regions">
                        {group.regions.map((s) => {
                          const label = regionLabel(s.id);
                          const hasErr = s.lastError != null;
                          return (
                            <span
                              key={s.id}
                              className={`source-region-chip ${hasErr ? "source-region-chip--error" : ""} ${!s.enabled ? "source-region-chip--disabled" : ""}`}
                              title={hasErr ? s.lastError ?? undefined : undefined}
                            >
                              {label || "global"}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {success
                        ? new Date(success).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="error-cell">
                      {!allEnabled && (
                        <span className="source-status-badge source-status-badge--disabled">
                          Partial
                        </span>
                      )}
                      {error && (
                        <span className="source-status-badge source-status-badge--error" title={error}>
                          Error
                        </span>
                      )}
                      {allEnabled && !error && (
                        <span className="source-status-badge source-status-badge--ok">
                          OK
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="source-refresh-group">
                        {group.regions.map((s) => (
                          <RefreshButton key={s.id} sourceId={s.id} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
