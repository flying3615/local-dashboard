import { useState, type FormEvent } from "react";

function PropertyImg({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="card-img-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="card-img-placeholder-text">No image</span>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} />;
}

import { StatusBadge } from "../components/StatusBadge";
import type {
  KapitiPropertyRecord,
  PropertySearchLink,
  PropertyWithItem,
} from "../lib/api";

type SortOrder = "default" | "price-asc" | "price-desc";

interface PropertyListProps {
  properties: PropertyWithItem[];
  allProperties: PropertyWithItem[];
  searchLinks?: PropertySearchLink[];
  officialRecords?: KapitiPropertyRecord[];
  onSearchOfficialRecords?: (query: string) => Promise<void> | void;
  onSelectProperty?: (id: string) => void;
  suburbFilter: string;
  onSuburbFilterChange: (suburb: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  suburbs: string[];
  councilName?: string;
}

export function PropertyList({
  properties,
  allProperties,
  searchLinks = [],
  officialRecords = [],
  onSearchOfficialRecords,
  onSelectProperty,
  suburbFilter,
  onSuburbFilterChange,
  searchQuery,
  onSearchQueryChange,
  suburbs,
  councilName = "Council",
}: PropertyListProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [bedroomFilter, setBedroomFilter] = useState<number | null>(null);

  const availableBedrooms = [...new Set(
    allProperties.map((p) => p.property?.bedrooms ?? null).filter((b): b is number => b !== null)
  )].sort((a, b) => a - b);

  const filteredProperties = bedroomFilter === null
    ? properties
    : properties.filter((p) => p.property?.bedrooms === bedroomFilter);

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortOrder === "default") return 0;
    const priceA = parsePrice(a.property?.price ?? null);
    const priceB = parsePrice(b.property?.price ?? null);
    if (priceA === null && priceB === null) return 0;
    if (priceA === null) return 1;
    if (priceB === null) return -1;
    return sortOrder === "price-asc" ? priceA - priceB : priceB - priceA;
  });

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSearchOfficialRecords || query.trim().length < 2) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      await onSearchOfficialRecords(query.trim());
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Official property lookup failed",
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="property-list" data-testid="property-list">
      {/* Search links */}
      {searchLinks.length > 0 && (
        <div className="external-searches">
          <div className="search-link-list">
            {searchLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="search-link-card"
                aria-label={link.label}
              >
                <span className="search-link-provider">{link.provider}</span>
                <span className="search-link-label">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Official lookup */}
      <form className="official-lookup" onSubmit={handleSearch}>
        <label htmlFor="official-property-query">Official property lookup</label>
        <div className="lookup-controls">
          <input
            id="official-property-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Address or street"
          />
          <button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? "Searching" : "Search"}
          </button>
        </div>
        {searchError && <p className="lookup-error">{searchError}</p>}
      </form>

      {/* Official records table */}
      {officialRecords.length > 0 && (
        <section className="official-records">
          <h3 className="section-title">Official {councilName} Records ({officialRecords.length})</h3>
          <table className="property-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Capital Value</th>
                <th>Land Value</th>
                <th>Area</th>
                <th>Valuation Date</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {officialRecords.map((record) => (
                <tr key={record.id}>
                  <td className="property-address">{record.address}</td>
                  <td>{formatCurrency(record.capitalValue)}</td>
                  <td>{formatCurrency(record.landValue)}</td>
                  <td>{record.hectares === null ? "-" : `${record.hectares} ha`}</td>
                  <td>{formatDate(record.valuationDate)}</td>
                  <td>
                    <a
                      href={record.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {councilName}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Filter chips + search */}
      <div className="filters">
        <button
          className={`filter-chip ${suburbFilter === "all" ? "active" : ""}`}
          onClick={() => onSuburbFilterChange("all")}
        >
          All ({allProperties.length})
        </button>
        {suburbs.map((s) => {
          const count = allProperties.filter(
            (p) => (p.property?.suburb ?? p.item.area ?? "Unknown") === s,
          ).length;
          return (
            <button
              key={s}
              className={`filter-chip ${suburbFilter === s ? "active" : ""}`}
              onClick={() => onSuburbFilterChange(s)}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Bedroom filter */}
      {availableBedrooms.length > 0 && (
        <div className="filters" style={{ marginTop: "var(--space-2)" }}>
          <button
            className={`filter-chip ${bedroomFilter === null ? "active" : ""}`}
            onClick={() => setBedroomFilter(null)}
          >
            Any beds
          </button>
          {availableBedrooms.map((n) => (
            <button
              key={n}
              className={`filter-chip ${bedroomFilter === n ? "active" : ""}`}
              onClick={() => setBedroomFilter(n)}
            >
              {n} bed
            </button>
          ))}
        </div>
      )}

      {/* Search input + sort */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search by address..."
          style={{
            flex: "1 1 200px",
            maxWidth: 360,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
          }}
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            background: "var(--surface)",
            color: "var(--fg)",
            cursor: "pointer",
          }}
        >
          <option value="default">Sort: Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {/* Property grid */}
      {sortedProperties.length === 0 ? (
        <p className="empty-state">No properties match the current filter.</p>
      ) : (
        <div className="property-grid">
          {sortedProperties.map(({ item, property }) => (
            <article
              key={item.id}
              className="card"
              onClick={() => onSelectProperty?.(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectProperty?.(item.id);
                }
              }}
            >
              <div className="card-img">
                {property?.imageUrl ? (
                  <PropertyImg src={property.imageUrl} alt={item.title} />
                ) : (
                  <div className="card-img-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="card-img-placeholder-text">No image</span>
                  </div>
                )}
                {property?.watchStatus && property.watchStatus !== "new" && (
                  <span className="property-tag">
                    <StatusBadge status={property.watchStatus} />
                  </span>
                )}
              </div>
              <div className="card-body">
                <div className="card-price">{property?.price ?? "Price TBC"}</div>
                <div className="card-address">
                  {item.address ?? property?.address ?? item.title}
                </div>
                <div className="card-suburb">{property?.suburb ?? item.area ?? ""}</div>
                <div className="card-meta">
                  {property?.bedrooms != null && <span>{property.bedrooms} bed</span>}
                  {property?.bathrooms != null && <span>{property.bathrooms} bath</span>}
                  {property?.parking != null && <span>{property.parking} park</span>}
                  {property?.landArea != null && <span>{property.landArea} m²</span>}
                </div>
                <div className="card-footer">
                  <span className="card-suburb">{property?.platform ?? ""}</span>
                  {property?.openHomeTimes && property.openHomeTimes.length > 0 && (
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--accent)" }}>
                      Open home: {new Date(property.openHomeTimes[0]).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

}

function parsePrice(price: string | null): number | null {
  if (price === null) return null;
  const digits = price.replace(/[^0-9]/g, "");
  const num = parseInt(digits, 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function formatCurrency(value: number | null): string {
  return value === null
    ? "-"
    : new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: "NZD",
        maximumFractionDigits: 0,
      }).format(value);
}

function formatDate(value: string | null): string {
  return value === null ? "-" : new Date(value).toLocaleDateString();
}
