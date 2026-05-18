import type { Item, Source } from "../lib/types";
import { ItemCard } from "../components/ItemCard";

export interface DashboardSections {
  new_listings: Item[];
  upcoming_open_homes: Item[];
  school_events: Item[];
  needs_review: Item[];
  recent_activity: Item[];
}

interface DashboardProps {
  sections: DashboardSections;
  sources: Source[];
}

function Section({
  title,
  items,
  sources,
}: {
  title: string;
  items: Item[];
  sources: Source[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="dashboard-section">
      <h2 className="section-title">
        {title} ({items.length})
      </h2>
      <div className="item-grid">
        {items.map((item) => {
          const source = sources.find((s) => s.id === item.sourceId);
          return <ItemCard key={item.id} item={item} source={source} />;
        })}
      </div>
    </section>
  );
}

const sectionDefs: Array<{ key: keyof DashboardSections; label: string }> = [
  { key: "new_listings", label: "New Listings" },
  { key: "upcoming_open_homes", label: "Upcoming Open Homes" },
  { key: "school_events", label: "School Events" },
  { key: "needs_review", label: "Needs Review" },
  { key: "recent_activity", label: "Recent Activity" },
];

export function Dashboard({ sections, sources }: DashboardProps) {
  return (
    <div className="dashboard" data-testid="dashboard">
      {sectionDefs.map(({ key, label }) => (
        <Section
          key={key}
          title={label}
          items={sections[key]}
          sources={sources}
        />
      ))}
    </div>
  );
}
