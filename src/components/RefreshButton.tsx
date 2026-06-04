import { useRef, useState } from "react";

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleRefresh = async () => {
    setLoading(true);
    setResult(null);
    clearTimeout(timerRef.current);
    try {
      const results = await Promise.all(sourceIds.map((id) => refreshSource(id)));
      setResult(results);
      const isPending = results.some((r) => r.pending);
      if (isPending) {
        timerRef.current = setTimeout(() => {
          onRefreshed?.();
          setLoading(false);
        }, 30_000);
      } else {
        onRefreshed?.();
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const isPending = result?.some((r) => r.pending) ?? false;
  const totalRecords = result?.reduce((sum, r) => sum + r.recordsProcessed, 0) ?? 0;
  const hasError = result?.some((r) => r.status === "error") ?? false;
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
      {result && !isPending && (
        <span className={`refresh-result refresh-${hasError ? "error" : allSkipped ? "skipped" : "success"}`}>
          {hasError
            ? result.find((r) => r.status === "error")?.error ?? "Error"
            : allSkipped
              ? "Skipped"
              : `${totalRecords} records`}
        </span>
      )}
      {isPending && (
        <span className="refresh-result refresh-success">
          Refreshing in background...
        </span>
      )}
    </span>
  );
}
