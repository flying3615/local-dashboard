import { useState } from "react";

import { refreshSource } from "../lib/api";
import type { RefreshResult } from "../lib/api";

interface RefreshButtonProps {
  sourceIds: string[];
  label?: string;
  onRefreshed?: () => void;
}

export function RefreshButton({ sourceIds, label = "Refresh", onRefreshed }: RefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult[] | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setResult(null);
    try {
      const results = await Promise.all(sourceIds.map((id) => refreshSource(id)));
      setResult(results);
      onRefreshed?.();
    } finally {
      setLoading(false);
    }
  };

  const totalRecords = result?.reduce((sum, r) => sum + r.recordsProcessed, 0) ?? 0;
  const hasError = result?.some((r) => r.status === "error") ?? false;
  const hasQueued = result?.some((r) => r.status === "queued") ?? false;
  const allSkipped = result?.every((r) => r.status === "skipped") ?? false;

  return (
    <span className="refresh-control">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="refresh-button"
        aria-label={`Refresh ${sourceIds.join(", ")}`}
      >
        {loading ? "Refreshing..." : label}
      </button>
      {result && (
        <span className={`refresh-result refresh-${hasError ? "error" : hasQueued ? "queued" : allSkipped ? "skipped" : "success"}`}>
          {hasError
            ? result.find((r) => r.status === "error")?.error ?? "Error"
            : hasQueued
              ? "Queued"
            : allSkipped
              ? "Skipped"
              : `${totalRecords} records`}
        </span>
      )}
    </span>
  );
}
