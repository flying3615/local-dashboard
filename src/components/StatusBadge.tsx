export type BadgeVariant = "new" | "active" | "warning" | "neutral" | "done";

function variantFor(status: string): BadgeVariant {
  switch (status) {
    case "new":
      return "new";
    case "watching":
    case "reviewed":
      return "active";
    case "shortlist":
      return "warning";
    case "ignored":
    case "done":
      return "done";
    default:
      return "neutral";
  }
}

function labelFor(status: string): string {
  return status.replace(/_/g, " ");
}

export function StatusBadge({ status }: { status: string }) {
  const variant = variantFor(status);

  return (
    <span className={`badge badge-${variant}`} aria-label={labelFor(status)}>
      {labelFor(status)}
    </span>
  );
}
