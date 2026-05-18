const PROPERTY_LAYER_URL =
  "https://maps.kapiticoast.govt.nz/server/rest/services/Public/Property_Public/MapServer/0";
const PROPERTY_QUERY_URL = `${PROPERTY_LAYER_URL}/query`;

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

type FetchImpl = (url: string) => Promise<FetchResponse>;

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

export interface SearchKapitiPropertyRecordsOptions {
  fetchImpl?: FetchImpl;
  limit?: number;
}

type ArcGisQueryResponse = {
  error?: { message?: string };
  features?: Array<{ attributes?: Record<string, unknown> }>;
};

export async function searchKapitiPropertyRecords(
  query: string,
  options: SearchKapitiPropertyRecordsOptions = {},
): Promise<KapitiPropertyRecord[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    throw new Error("Search query must contain at least 2 characters");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(
    buildPropertyRecordSearchUrl(normalizedQuery, options.limit ?? 10),
  );

  if (!response.ok) {
    throw new Error(
      `KCDC property record request failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as ArcGisQueryResponse;
  if (body.error) {
    throw new Error(
      `KCDC property record query failed: ${body.error.message ?? "Unknown error"}`,
    );
  }

  return (body.features ?? [])
    .map((feature) => mapFeature(feature.attributes))
    .filter((record): record is KapitiPropertyRecord => record !== null);
}

function buildPropertyRecordSearchUrl(query: string, limit: number): string {
  const params = new URLSearchParams({
    f: "json",
    where: `UPPER(Location) LIKE '%${escapeSqlLike(query.toUpperCase())}%'`,
    outFields:
      "OBJECTID,Valuation_ID,Property_Number,Legal,Land_Value,Capital_Value,Improvements_Value,Hectares,Location,Valuation_Date,Latitude,Longitude",
    returnGeometry: "false",
    orderByFields: "Location ASC",
    resultRecordCount: String(limit),
  });

  return `${PROPERTY_QUERY_URL}?${params.toString()}`;
}

function mapFeature(
  attributes: Record<string, unknown> | undefined,
): KapitiPropertyRecord | null {
  if (attributes === undefined) {
    return null;
  }

  const objectId = getNumber(attributes, "OBJECTID");
  const address = getString(attributes, "Location");
  if (objectId === null || address === null) {
    return null;
  }

  return {
    id: `kcdc_property_${objectId}`,
    valuationId: getString(attributes, "Valuation_ID"),
    propertyNumber: getNumber(attributes, "Property_Number"),
    address,
    legalDescription: getString(attributes, "Legal"),
    landValue: getNumber(attributes, "Land_Value"),
    capitalValue: getNumber(attributes, "Capital_Value"),
    improvementsValue: getNumber(attributes, "Improvements_Value"),
    hectares: getNumber(attributes, "Hectares"),
    valuationDate: parseArcGisDate(getNumber(attributes, "Valuation_Date")),
    latitude: getNumber(attributes, "Latitude"),
    longitude: getNumber(attributes, "Longitude"),
    sourceUrl: PROPERTY_LAYER_URL,
  };
}

function escapeSqlLike(value: string): string {
  return value.replaceAll("'", "''").replaceAll("%", "").replaceAll("_", "");
}

function parseArcGisDate(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getString(
  record: Record<string, unknown>,
  fieldName: string,
): string | null {
  const value = record[fieldName];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getNumber(
  record: Record<string, unknown>,
  fieldName: string,
): number | null {
  const value = record[fieldName];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
