import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { StatusBadge } from "../components/StatusBadge";
import type {
  KapitiPropertyRecord,
  PropertySearchLink,
  PropertyWithItem,
} from "../lib/api";

type SortColumn = "address" | "price" | "beds" | "baths" | "openHome" | "platform" | "status";
type SortDir = "asc" | "desc";

function sortProperties(list: PropertyWithItem[], col: SortColumn, dir: SortDir): PropertyWithItem[] {
  return [...list].sort((a, b) => {
    const pA = a.property;
    const pB = b.property;
    let va: string | number = "";
    let vb: string | number = "";

    switch (col) {
      case "openHome": {
        va = pA?.openHomeTimes?.[0] ? Date.parse(pA.openHomeTimes[0]) : 0;
        vb = pB?.openHomeTimes?.[0] ? Date.parse(pB.openHomeTimes[0]) : 0;
        break;
      }
      case "price": {
        va = pA?.price ?? "";
        vb = pB?.price ?? "";
        break;
      }
      case "beds": {
        va = pA?.bedrooms ?? -1;
        vb = pB?.bedrooms ?? -1;
        break;
      }
      case "baths": {
        va = pA?.bathrooms ?? -1;
        vb = pB?.bathrooms ?? -1;
        break;
      }
      case "address": {
        va = a.item.address ?? pA?.address ?? "";
        vb = b.item.address ?? pB?.address ?? "";
        break;
      }
      case "platform": {
        va = pA?.platform ?? "";
        vb = pB?.platform ?? "";
        break;
      }
      case "status": {
        va = pA?.watchStatus ?? "";
        vb = pB?.watchStatus ?? "";
        break;
      }
    }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function SortHeader({
  column,
  label,
  current,
  dir,
  onSort,
}: {
  column: SortColumn;
  label: string;
  current: SortColumn;
  dir: SortDir;
  onSort: (col: SortColumn) => void;
}) {
  const active = column === current;
  return (
    <th
      className={`sortable-header ${active ? "sort-active" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <span className="sort-arrow">
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </span>
    </th>
  );
}

interface PropertyListProps {
  properties: PropertyWithItem[];
  searchLinks?: PropertySearchLink[];
  officialRecords?: KapitiPropertyRecord[];
  onSearchOfficialRecords?: (query: string) => Promise<void> | void;
  onSelectProperty?: (id: string) => void;
}

export function PropertyList({
  properties,
  searchLinks = [],
  officialRecords = [],
  onSearchOfficialRecords,
  onSelectProperty,
}: PropertyListProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortColumn>("openHome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedProperties = useMemo(
    () => sortProperties(properties, sortCol, sortDir),
    [properties, sortCol, sortDir],
  );

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSearchOfficialRecords || query.trim().length < 2) {
      return;
    }

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
      {searchLinks.length > 0 && (
        <section className="external-searches">
          <h2 className="section-title">Listing Searches</h2>
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
        </section>
      )}

      <form className="official-lookup" onSubmit={handleSearch}>
        <label htmlFor="official-property-query">Official property lookup</label>
        <div className="lookup-controls">
          <input
            id="official-property-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Address or street"
          />
          <button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? "Searching" : "Search"}
          </button>
        </div>
        {searchError && <p className="lookup-error">{searchError}</p>}
      </form>

      {officialRecords.length > 0 && (
        <section className="official-records">
          <h2 className="section-title">Official KCDC Records ({officialRecords.length})</h2>
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
                      KCDC
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {properties.length === 0 ? (
        <p className="empty-state">No properties yet. Refresh a source to see listings.</p>
      ) : (
        <table className="property-table">
          <thead>
            <tr>
              <SortHeader column="address" label="Address" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="price" label="Price" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="beds" label="Beds" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="baths" label="Baths" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="openHome" label="Open Home" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="platform" label="Platform" current={sortCol} dir={sortDir} onSort={handleSort} />
              <SortHeader column="status" label="Status" current={sortCol} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedProperties.map(({ item, property }) => (
              <tr
                key={item.id}
                className={`property-row ${onSelectProperty ? "property-row-clickable" : ""}`}
                onClick={() => onSelectProperty?.(item.id)}
              >
                <td className="property-address">{item.address ?? property?.address ?? "Unknown"}</td>
                <td>{property?.price ?? "-"}</td>
                <td>{property?.bedrooms ?? "-"}</td>
                <td>{property?.bathrooms ?? "-"}</td>
                <td>
                  {property?.openHomeTimes?.[0]
                    ? new Date(property.openHomeTimes[0]).toLocaleDateString()
                    : "-"}
                </td>
                <td>{property?.platform ?? "-"}</td>
                <td>
                  {property && <StatusBadge status={property.watchStatus} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
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
