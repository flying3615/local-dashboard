import { RefreshButton } from "../components/RefreshButton";
import type { Source } from "../lib/types";

interface SourcesProps {
  sources: Source[];
}

export function Sources({ sources }: SourcesProps) {
  if (sources.length === 0) {
    return (
      <div className="sources-view" data-testid="sources-view">
        <p className="empty-state">No sources configured. Refresh a source to populate the list.</p>
      </div>
    );
  }

  return (
    <div className="sources-view" data-testid="sources-view">
      <table className="sources-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Trust</th>
            <th>Status</th>
            <th>Last Success</th>
            <th>Last Error</th>
            <th>Refresh</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  {source.name}
                </a>
              </td>
              <td>{source.type}</td>
              <td>{source.trustLevel}</td>
              <td>{source.enabled ? "Enabled" : "Disabled"}</td>
              <td>
                {source.lastSuccessAt
                  ? new Date(source.lastSuccessAt).toLocaleString()
                  : "Never"}
              </td>
              <td className="error-cell">
                {source.lastError ?? "-"}
              </td>
              <td>
                <RefreshButton sourceId={source.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
