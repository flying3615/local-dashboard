import type { Item, Source } from "../lib/types";
import { SourceLink } from "./SourceLink";

interface ItemCardProps {
  item: Item;
  source?: Source | null;
  detailHref?: string;
}

const typeLabels: Record<string, string> = {
  property_listing: "Property",
  school_event: "School Event",
  school_profile: "School",
  council_notice: "Council",
  local_news: "News",
  community_event: "Event",
  transport_alert: "Transport",
  manual_note: "Note",
};

export function ItemCard({ item, source, detailHref }: ItemCardProps) {
  const content = (
    <article className="item-card">
      <div className="item-card-header">
        <span className="item-type-label">
          {typeLabels[item.type] ?? item.type}
        </span>
        <div className="item-tags">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>
      <h3 className="item-card-title">{item.title}</h3>
      {item.summary && <p className="item-card-summary">{item.summary}</p>}
      <div className="item-card-meta">
        {item.address && <span>{item.address}</span>}
        {item.area && <span>{item.area}</span>}
        {item.startsAt && (
          <time dateTime={item.startsAt}>
            {new Date(item.startsAt).toLocaleDateString()}
          </time>
        )}
      </div>
      <div className="item-card-footer">
        {source && <SourceLink name={source.name} url={source.url} />}
        {!source && item.sourceUrl && (
          <SourceLink name="Source" url={item.sourceUrl} />
        )}
      </div>
    </article>
  );

  if (detailHref) {
    return <a href={detailHref}>{content}</a>;
  }

  return content;
}
