import { useState } from "react";

import { refreshSource } from "../lib/api";
import type { RefreshResult } from "../lib/api";

interface RefreshButtonProps {
  sourceId: string;
  label?: string;
}

export function RefreshButton({ sourceId, label = "Refresh" }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await refreshSource(sourceId);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="refresh-control">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="refresh-button"
        aria-label={`Refresh ${sourceId}`}
      >
        {loading ? "Refreshing..." : label}
      </button>
      {result && (
        <span className={`refresh-result refresh-${result.status}`}>
          {result.status === "success"
            ? `${result.recordsProcessed} records`
            : result.status === "error"
              ? result.error ?? "Error"
              : "Skipped"}
        </span>
      )}
    </span>
  );
}
