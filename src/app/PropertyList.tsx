import { useState } from "react";
import type { FormEvent } from "react";

import { StatusBadge } from "../components/StatusBadge";
import type { KapitiPropertyRecord, PropertyWithItem } from "../lib/api";

interface PropertyListProps {
  properties: PropertyWithItem[];
  officialRecords?: KapitiPropertyRecord[];
  onSearchOfficialRecords?: (query: string) => Promise<void> | void;
  onSelectProperty?: (id: string) => void;
}

export function PropertyList({
  properties,
  officialRecords = [],
  onSearchOfficialRecords,
  onSelectProperty,
}: PropertyListProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
              <th>Address</th>
              <th>Price</th>
              <th>Beds</th>
              <th>Baths</th>
              <th>Open Home</th>
              <th>Platform</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {properties.map(({ item, property }) => (
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
