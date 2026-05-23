import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  KapitiPropertyRecord,
  PropertyDetail as PropertyDetailType,
  PropertySearchLink,
  PropertyWithItem,
  SchoolWithEvents,
} from "../lib/api";
import {
  getProperties,
  getPropertySearchLinks,
  getProperty,
  getSchools,
  getSources,
  searchPropertyRecords,
} from "../lib/api";
import type { Source } from "../lib/types";
import { parsePrice, median } from "../lib/analysis";
import { PropertyAnalytics } from "./PropertyAnalytics";
import { PropertyDetail } from "./PropertyDetail";
import { PropertyList } from "./PropertyList";
import { SchoolRadar } from "./SchoolRadar";
import { Sources } from "./Sources";

type Page = "main" | "schools" | "sources";

export function App() {
  const [page, setPage] = useState<Page>("main");
  const [sources, setSources] = useState<Source[]>([]);
  const [properties, setProperties] = useState<PropertyWithItem[]>([]);
  const [propertySearchLinks, setPropertySearchLinks] = useState<PropertySearchLink[]>([]);
  const [officialPropertyRecords, setOfficialPropertyRecords] = useState<KapitiPropertyRecord[]>([]);
  const [schools, setSchools] = useState<SchoolWithEvents[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyDetail, setPropertyDetail] = useState<PropertyDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propertiesRef = useRef<HTMLElement>(null);
  const analyticsRef = useRef<HTMLElement>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [props, links, srcs] = await Promise.all([
        getProperties(),
        getPropertySearchLinks(),
        getSources(),
      ]);
      setProperties(props);
      setPropertySearchLinks(links);
      setSources(srcs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    try {
      const schs = await getSchools();
      setSchools(schs);
    } catch {
      // keep stale data
    }
  }, []);

  const loadPropertyDetail = useCallback(async (id: string) => {
    try {
      const detail = await getProperty(id);
      setPropertyDetail(detail);
      setSelectedPropertyId(id);
    } catch {
      // keep stale data
    }
  }, []);

  const handleSearchOfficialRecords = useCallback(async (query: string) => {
    setOfficialPropertyRecords(await searchPropertyRecords(query));
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (page === "schools" && schools.length === 0) {
      loadSchools();
    }
  }, [page, schools.length, loadSchools]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNavClick = (target: Page | "properties" | "analytics") => {
    if (target === "schools" || target === "sources") {
      setPage(target);
      setSelectedPropertyId(null);
      setPropertyDetail(null);
      window.scrollTo({ top: 0 });
    } else if (target === "properties") {
      setPage("main");
      setTimeout(() => scrollTo(propertiesRef), 50);
    } else if (target === "analytics") {
      setPage("main");
      setTimeout(() => scrollTo(analyticsRef), 50);
    }
  };

  const handleCloseModal = useCallback(() => {
    setSelectedPropertyId(null);
    setPropertyDetail(null);
    loadInitial();
  }, [loadInitial]);

  // Compute hero stats
  const heroStats = useMemo(() => {
    const prices = properties
      .map((p) => (p.property ? parsePrice(p.property.price) : null))
      .filter((p): p is number => p != null);
    const suburbs = new Set(
      properties.map((p) => p.property?.suburb ?? p.item.area ?? "Unknown"),
    );
    return {
      total: properties.length,
      medianPrice: median(prices),
      suburbCount: suburbs.size,
    };
  }, [properties]);

  // Suburb filter state
  const [suburbFilter, setSuburbFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand" onClick={() => handleNavClick("properties")}>
            Paraparaumu
          </span>
          <div className="nav-links">
            <button
              className={page === "main" ? "active" : ""}
              onClick={() => handleNavClick("properties")}
            >
              Properties
            </button>
            <button
              className={page === "main" ? "active" : ""}
              onClick={() => handleNavClick("analytics")}
            >
              Analytics
            </button>
            <button
              className={page === "schools" ? "active" : ""}
              onClick={() => handleNavClick("schools")}
            >
              Schools
            </button>
            <button
              className={page === "sources" ? "active" : ""}
              onClick={() => handleNavClick("sources")}
            >
              Sources
            </button>
          </div>
        </div>
      </nav>

      {page === "main" && (
        <>
          {/* Hero */}
          <section className="hero">
            <div className="hero-content">
              <h1>Paraparaumu Property Dashboard</h1>
              <p className="hero-subtitle">
                Track listings, analyse market trends, and find the right property on the Kapiti Coast.
              </p>
              <div className="hero-tags">
                {suburbs.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    className={`hero-tag ${suburbFilter === s ? "active" : ""}`}
                    onClick={() => {
                      setPage("main");
                      setSuburbFilter(s);
                      setTimeout(() => scrollTo(propertiesRef), 50);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="hero-stats">
                <div>
                  <div className="hero-stat-value">{heroStats.total}</div>
                  <div className="hero-stat-label">Active Listings</div>
                </div>
                {heroStats.medianPrice != null && (
                  <div>
                    <div className="hero-stat-value">${heroStats.medianPrice.toLocaleString()}</div>
                    <div className="hero-stat-label">Median Price</div>
                  </div>
                )}
                <div>
                  <div className="hero-stat-value">{heroStats.suburbCount}</div>
                  <div className="hero-stat-label">Suburbs</div>
                </div>
              </div>
            </div>
          </section>

          {loading && (
            <section className="property-section">
              <div className="container">
                <p className="status-message">Loading...</p>
              </div>
            </section>
          )}

          {error && (
            <section className="property-section">
              <div className="container">
                <p className="status-message error-message">
                  {error}
                  <button onClick={loadInitial} className="retry-button">Retry</button>
                </p>
              </div>
            </section>
          )}

          {!loading && !error && (
            <>
              {/* Properties */}
              <section className="property-section" ref={propertiesRef}>
                <div className="container">
                  <h2>Properties</h2>
                  <PropertyList
                    properties={filteredProperties}
                    allProperties={properties}
                    searchLinks={propertySearchLinks}
                    officialRecords={officialPropertyRecords}
                    onSearchOfficialRecords={handleSearchOfficialRecords}
                    onSelectProperty={loadPropertyDetail}
                    suburbFilter={suburbFilter}
                    onSuburbFilterChange={setSuburbFilter}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    suburbs={suburbs}
                  />
                </div>
              </section>

              {/* Analytics */}
              <section className="analytics-section-wrapper" ref={analyticsRef}>
                <div className="container">
                  <h2>Analytics</h2>
                  <PropertyAnalytics properties={properties} />
                </div>
              </section>
            </>
          )}
        </>
      )}

      {page === "schools" && <SchoolRadar schools={schools} />}
      {page === "sources" && <Sources sources={sources} />}

      {/* Property Detail Modal */}
      {selectedPropertyId && propertyDetail && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleCloseModal();
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{propertyDetail.item.title}</span>
              <button className="modal-close" onClick={handleCloseModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <PropertyDetail detail={propertyDetail} />
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-bottom">
            <span>Paraparaumu Dashboard</span>
            <span>Last refreshed: {new Date().toLocaleDateString("en-NZ")}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
