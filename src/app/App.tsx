import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PropertyList } from "./PropertyList";
import { PropertyDetail } from "./PropertyDetail";
import { PropertyAnalytics } from "./PropertyAnalytics";
import { SchoolRadar } from "./SchoolRadar";
import { Sources } from "./Sources";
import {
  getProperties,
  getProperty,
  getPropertySearchLinks,
  getSchools,
  getSources,
  getRegions,
  searchPropertyRecords,
  type PropertyWithItem,
  type PropertyDetail as PropertyDetailType,
  type PropertySearchLink,
  type KapitiPropertyRecord,
  type SchoolWithEvents,
  type RegionInfo,
} from "../lib/api";
import type { Source } from "../lib/types";
import { parsePrice, median } from "../lib/analysis";

type Page = "main" | "analytics" | "schools" | "sources";

export function App() {
  const [page, setPage] = useState<Page>("main");
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [region, setRegion] = useState<string>("kapiti");
  const [properties, setProperties] = useState<PropertyWithItem[]>([]);
  const [searchLinks, setSearchLinks] = useState<PropertySearchLink[]>([]);
  const [schools, setSchools] = useState<SchoolWithEvents[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [officialRecords, setOfficialRecords] = useState<KapitiPropertyRecord[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PropertyDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const propertiesRef = useRef<HTMLElement>(null);

  const loadData = useCallback(async (regionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [props, links, sch, src] = await Promise.all([
        getProperties(regionId),
        getPropertySearchLinks(regionId),
        getSchools(regionId),
        getSources(),
      ]);
      setProperties(props);
      setSearchLinks(links);
      setSchools(sch);
      setSources(src);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getRegions().then(setRegions).catch(() => {});
    loadData(region);
  }, [loadData, region]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSelectedDetail(null);
      return;
    }
    getProperty(selectedPropertyId).then(setSelectedDetail).catch(() => {});
  }, [selectedPropertyId]);

  const handleSearchOfficialRecords = useCallback(async (query: string) => {
    const records = await searchPropertyRecords(query);
    setOfficialRecords(records);
  }, []);

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    setSuburbFilter("all");
    setSearchQuery("");
    setOfficialRecords([]);
    setSelectedPropertyId(null);
  };

  const currentRegion = regions.find((r) => r.id === region);

  const suburbs = useMemo(() => {
    const set = new Set(
      properties.map((p) => p.property?.suburb ?? p.item.area ?? "Unknown"),
    );
    return [...set].sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    let result = properties;
    if (suburbFilter !== "all") {
      result = result.filter(
        (p) => (p.property?.suburb ?? p.item.area ?? "Unknown") === suburbFilter,
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const addr = (p.property?.address ?? p.item.address ?? p.item.title ?? "").toLowerCase();
        return addr.includes(q);
      });
    }
    return result;
  }, [properties, suburbFilter, searchQuery]);

  const heroStats = useMemo(() => {
    const prices = properties
      .map((p) => (p.property ? parsePrice(p.property.price) : null))
      .filter((p): p is number => p != null);
    return {
      total: properties.length,
      medianPrice: median(prices),
      suburbCount: suburbs.length,
    };
  }, [properties, suburbs]);

  const handlePageChange = (target: Page) => {
    setPage(target);
    window.scrollTo({ top: 0 });
  };

  const scrollToRef = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="brand-text">{currentRegion?.name ?? "Wellington"} Properties</span>
          </div>
          <div className="nav-links">
            {regions.length > 0 && (
              <select
                className="region-selector"
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                aria-label="Select region"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className={`nav-link ${page === "main" ? "active" : ""}`}
              onClick={() => handlePageChange("main")}
            >
              Properties
            </button>
            <button
              className={`nav-link ${page === "analytics" ? "active" : ""}`}
              onClick={() => handlePageChange("analytics")}
            >
              Analytics
            </button>
            <button
              className={`nav-link ${page === "schools" ? "active" : ""}`}
              onClick={() => handlePageChange("schools")}
            >
              Schools
            </button>
            <button
              className={`nav-link ${page === "sources" ? "active" : ""}`}
              onClick={() => handlePageChange("sources")}
            >
              Sources
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        {page === "main" && (
          <>
            <section className="hero">
              <div className="container">
                <h1 className="hero-title">
                  {currentRegion?.name ?? "Wellington"} Property Dashboard
                </h1>
                <p className="hero-subtitle">
                  Track listings, analyse market trends, and find the right property in {currentRegion?.name ?? "the region"}.
                </p>
                <div className="hero-tags">
                  {suburbs.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      className={`hero-tag ${suburbFilter === s ? "active" : ""}`}
                      onClick={() => {
                        setSuburbFilter(s);
                        setTimeout(() => scrollToRef(propertiesRef), 50);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="hero-stats">
                  <div className="stat">
                    <span className="stat-value">{heroStats.total}</span>
                    <span className="stat-label">Active Listings</span>
                  </div>
                  {heroStats.medianPrice != null && (
                    <div className="stat">
                      <span className="stat-value">
                        ${heroStats.medianPrice.toLocaleString()}
                      </span>
                      <span className="stat-label">Median Price</span>
                    </div>
                  )}
                  <div className="stat">
                    <span className="stat-value">{heroStats.suburbCount}</span>
                    <span className="stat-label">Suburbs</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="container">
              {loading && <p className="loading-state">Loading...</p>}
              {error && (
                <div className="error-state">
                  <p>{error}</p>
                  <button onClick={() => loadData(region)}>Retry</button>
                </div>
              )}
              {!loading && !error && (
                <section ref={propertiesRef}>
                  <PropertyList
                    properties={filteredProperties}
                    allProperties={properties}
                    searchLinks={searchLinks}
                    officialRecords={officialRecords}
                    onSearchOfficialRecords={handleSearchOfficialRecords}
                    onSelectProperty={setSelectedPropertyId}
                    suburbFilter={suburbFilter}
                    onSuburbFilterChange={setSuburbFilter}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    suburbs={suburbs}
                  />
                </section>
              )}
            </div>
          </>
        )}

        {page === "analytics" && (
          <section className="analytics-section-wrapper">
            <div className="container">
              <h2>Analytics</h2>
              <PropertyAnalytics properties={properties} />
            </div>
          </section>
        )}

        {page === "schools" && (
          <div className="container">
            <SchoolRadar schools={schools} />
          </div>
        )}

        {page === "sources" && (
          <div className="container">
            <Sources sources={sources} />
          </div>
        )}
      </main>

      {selectedDetail && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPropertyId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedPropertyId(null);
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <span className="modal-title">{selectedDetail.item.address ?? selectedDetail.item.title}</span>
              <button
                className="modal-close"
                onClick={() => setSelectedPropertyId(null)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <PropertyDetail detail={selectedDetail} />
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-bottom">
            <p>{currentRegion?.name ?? "Wellington"} Property Dashboard</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
