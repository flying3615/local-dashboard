import { useCallback, useEffect, useState } from "react";

import type {
  DashboardResponse,
  KapitiPropertyRecord,
  PropertyDetail as PropertyDetailType,
  PropertySearchLink,
  PropertyWithItem,
  SchoolWithEvents,
} from "../lib/api";
import {
  getDashboard,
  getProperties,
  getPropertySearchLinks,
  getProperty,
  getSchools,
  getSources,
  searchPropertyRecords,
} from "../lib/api";
import type { Source } from "../lib/types";
import { Dashboard } from "./Dashboard";
import { PropertyDetail } from "./PropertyDetail";
import { PropertyList } from "./PropertyList";
import { SchoolRadar } from "./SchoolRadar";
import { Sources } from "./Sources";

type Tab = "dashboard" | "properties" | "schools" | "sources";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [properties, setProperties] = useState<PropertyWithItem[]>([]);
  const [propertySearchLinks, setPropertySearchLinks] = useState<PropertySearchLink[]>([]);
  const [officialPropertyRecords, setOfficialPropertyRecords] = useState<KapitiPropertyRecord[]>([]);
  const [schools, setSchools] = useState<SchoolWithEvents[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [propertyDetail, setPropertyDetail] = useState<PropertyDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, srcs] = await Promise.all([
        getDashboard(),
        getSources(),
      ]);
      setDashboardData(dashboard);
      setSources(srcs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      const [props, links] = await Promise.all([
        getProperties(),
        getPropertySearchLinks(),
      ]);
      setProperties(props);
      setPropertySearchLinks(links);
    } catch {
      // keep stale data if fetch fails
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
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "properties" && properties.length === 0) {
      loadProperties();
    }
  }, [activeTab, properties.length, loadProperties]);

  useEffect(() => {
    if (activeTab === "schools" && schools.length === 0) {
      loadSchools();
    }
  }, [activeTab, schools.length, loadSchools]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedPropertyId(null);
    setPropertyDetail(null);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "properties", label: "Properties" },
    { id: "schools", label: "Schools" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Paraparaumu Dashboard</h1>
        <nav className="tab-nav" aria-label="Main navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "tab-active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {loading && <p className="status-message">Loading...</p>}
        {error && (
          <p className="status-message error-message">
            {error}
            <button onClick={loadData} className="retry-button">
              Retry
            </button>
          </p>
        )}

        {!loading && !error && activeTab === "dashboard" && dashboardData && (
          <Dashboard sections={dashboardData.sections} sources={sources} />
        )}

        {!loading && !error && activeTab === "properties" && !selectedPropertyId && (
          <PropertyList
            properties={properties}
            searchLinks={propertySearchLinks}
            officialRecords={officialPropertyRecords}
            onSearchOfficialRecords={handleSearchOfficialRecords}
            onSelectProperty={loadPropertyDetail}
          />
        )}

        {!loading && !error && activeTab === "properties" && selectedPropertyId && propertyDetail && (
          <PropertyDetail
            detail={propertyDetail}
            onBack={() => {
              setSelectedPropertyId(null);
              setPropertyDetail(null);
              loadProperties();
            }}
          />
        )}

        {!loading && !error && activeTab === "schools" && (
          <SchoolRadar schools={schools} />
        )}

        {!loading && !error && activeTab === "sources" && (
          <Sources sources={sources} />
        )}
      </main>
    </div>
  );
}
