// Row types for D1 query results (snake_case columns)

export type ItemRow = {
  id: string;
  type: string;
  title: string;
  summary: string;
  source_id: string;
  source_url: string;
  area: string | null;
  address: string | null;
  published_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  tags: string;
  raw_snapshot_id: string | null;
  last_seen_at: string | null;
  region: string;
};

export type PropertyRow = {
  id: string;
  item_id: string;
  address: string;
  suburb: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  land_area: number | null;
  floor_area: number | null;
  listed_at: string | null;
  open_home_times: string;
  platform: string;
  watch_status: string;
  notes: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  estimated_value_date: string | null;
  capital_value: number | null;
  land_value: number | null;
  improvement_value: number | null;
  cv_date: string | null;
  estimated_rental_low: number | null;
  estimated_rental_high: number | null;
  estimated_rental_yield: string | null;
  decade_built: string | null;
  contour: string | null;
  building_construction: string | null;
  ownership_type: string | null;
  legal_description: string | null;
  certificate_of_title: string | null;
  image_url: string | null;
  region: string;
};

export type SourceRow = {
  id: string;
  name: string;
  type: string;
  url: string;
  trust_level: string;
  enabled: number;
  refresh_interval_minutes: number;
  last_success_at: string | null;
  last_error: string | null;
};

export type SchoolRow = {
  id: string;
  name: string;
  school_type: string;
  years: string;
  gender: string;
  authority: string;
  has_zone: number | null;
  website: string;
  area: string;
  commute_from_paraparaumu: string | null;
  watch_status: string;
  region: string;
};

export type SchoolEventRow = {
  id: string;
  school_id: string;
  item_id: string;
  event_type: string;
  starts_at: string | null;
  deadline: string | null;
  enrolment_year: number | null;
};

export type ItemLinkRow = {
  id: string;
  from_item_id: string;
  to_entity_type: string;
  to_entity_id: string;
  link_reason: string;
  confidence: number;
};

export type NoteRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  created_at: string;
};

// Row → domain object mappers

export function mapItemRow(row: ItemRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    area: row.area,
    address: row.address,
    publishedAt: row.published_at,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    tags: parseJsonArray(row.tags),
    rawSnapshotId: row.raw_snapshot_id,
    lastSeenAt: row.last_seen_at,
    region: row.region,
  };
}

export function mapPropertyRow(row: PropertyRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    address: row.address,
    suburb: row.suburb,
    price: row.price,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking,
    landArea: row.land_area,
    floorArea: row.floor_area,
    listedAt: row.listed_at,
    openHomeTimes: parseJsonArray(row.open_home_times),
    platform: row.platform,
    watchStatus: row.watch_status,
    notes: row.notes,
    estimatedValueLow: row.estimated_value_low,
    estimatedValueHigh: row.estimated_value_high,
    estimatedValueDate: row.estimated_value_date,
    capitalValue: row.capital_value,
    landValue: row.land_value,
    improvementValue: row.improvement_value,
    cvDate: row.cv_date,
    estimatedRentalLow: row.estimated_rental_low,
    estimatedRentalHigh: row.estimated_rental_high,
    estimatedRentalYield: row.estimated_rental_yield,
    decadeBuilt: row.decade_built,
    contour: row.contour,
    buildingConstruction: row.building_construction,
    ownershipType: row.ownership_type,
    legalDescription: row.legal_description,
    certificateOfTitle: row.certificate_of_title,
    imageUrl: row.image_url,
    region: row.region,
  };
}

export function mapSourceRow(row: SourceRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    trustLevel: row.trust_level,
    enabled: row.enabled === 1,
    refreshIntervalMinutes: row.refresh_interval_minutes,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
  };
}

export function mapSchoolRow(row: SchoolRow) {
  return {
    id: row.id,
    name: row.name,
    schoolType: row.school_type,
    years: row.years,
    gender: row.gender,
    authority: row.authority,
    hasZone: row.has_zone === null ? null : row.has_zone === 1,
    website: row.website,
    area: row.area,
    commuteFromParaparaumu: row.commute_from_paraparaumu,
    watchStatus: row.watch_status,
    region: row.region,
  };
}

export function mapSchoolEventRow(row: SchoolEventRow) {
  return {
    id: row.id,
    schoolId: row.school_id,
    itemId: row.item_id,
    eventType: row.event_type,
    startsAt: row.starts_at,
    deadline: row.deadline,
    enrolmentYear: row.enrolment_year,
  };
}

export function mapItemLinkRow(row: ItemLinkRow) {
  return {
    id: row.id,
    fromItemId: row.from_item_id,
    toEntityType: row.to_entity_type,
    toEntityId: row.to_entity_id,
    linkReason: row.link_reason,
    confidence: row.confidence,
  };
}

export function mapNoteRow(row: NoteRow) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
