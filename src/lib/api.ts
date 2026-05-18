import type { Item, ItemLink, Note, PropertyListing, School, SchoolEvent, Source } from "./types";

const BASE_URL = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface DashboardSections {
  new_listings: Item[];
  upcoming_open_homes: Item[];
  school_events: Item[];
  local_updates: Item[];
  needs_review: Item[];
  recent_activity: Item[];
}

export interface DashboardResponse {
  sections: DashboardSections;
  totalItems: number;
}

export interface PropertyWithItem {
  item: Item;
  property: PropertyListing | null;
  source: Source | null;
}

export interface PropertySearchLink {
  id: string;
  provider: string;
  label: string;
  url: string;
  area: string;
  category: "residential_sale";
  notes: string;
}

export interface PropertyDetail {
  item: Item;
  property: PropertyListing | null;
  source: Source | null;
  links: ItemLink[];
  notes: Note[];
}

export interface SchoolWithEvents {
  school: School;
  events: SchoolEvent[];
  notes: Note[];
}

export interface KapitiPropertyRecord {
  id: string;
  valuationId: string | null;
  propertyNumber: number | null;
  address: string;
  legalDescription: string | null;
  landValue: number | null;
  capitalValue: number | null;
  improvementsValue: number | null;
  hectares: number | null;
  valuationDate: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
}

export interface RefreshResult {
  sourceId: string;
  status: "success" | "skipped" | "error";
  recordsProcessed: number;
  error?: string;
}

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/dashboard");
}

export function getProperties(): Promise<PropertyWithItem[]> {
  return request<PropertyWithItem[]>("/properties");
}

export function getPropertySearchLinks(): Promise<PropertySearchLink[]> {
  return request<PropertySearchLink[]>("/property-search-links");
}

export function getProperty(id: string): Promise<PropertyDetail> {
  return request<PropertyDetail>(`/properties/${encodeURIComponent(id)}`);
}

export function getSchools(): Promise<SchoolWithEvents[]> {
  return request<SchoolWithEvents[]>("/schools");
}

export function getSources(): Promise<Source[]> {
  return request<Source[]>("/sources");
}

export function searchPropertyRecords(
  query: string,
): Promise<KapitiPropertyRecord[]> {
  return request<KapitiPropertyRecord[]>(
    `/property-records/search?q=${encodeURIComponent(query)}`,
  );
}

export function refreshSource(id: string): Promise<RefreshResult> {
  return request<RefreshResult>(`/sources/${encodeURIComponent(id)}/refresh`, {
    method: "POST",
  });
}
