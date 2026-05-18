import type { SourceAdapter } from "./types";

const SCHOOLS_DIRECTORY_RESOURCE_ID = "4b292323-9fcc-41f8-814b-3c7b19cf14b3";
const DATASTORE_SQL_ENDPOINT =
  "https://catalogue.data.govt.nz/api/3/action/datastore_search_sql";
const SOURCE_URL =
  "https://www.educationcounts.govt.nz/directories/school-directory-api";

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

type FetchImpl = (url: string) => Promise<FetchResponse>;

export interface EducationCountsAdapterOptions {
  fetchImpl?: FetchImpl;
}

type SchoolDirectoryResponse = {
  success?: boolean;
  error?: { message?: string };
  result?: {
    records?: unknown[];
  };
};

export function createEducationCountsAdapter(
  options: EducationCountsAdapterOptions = {},
): SourceAdapter {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    sourceId: "education_counts",
    recordType: "school_profile",
    source: {
      name: "Education Counts",
      type: "official_api",
      url: SOURCE_URL,
      trustLevel: "official",
      enabled: true,
      refreshIntervalMinutes: 1440,
    },
    async fetch() {
      const response = await fetchImpl(buildSchoolsDirectoryUrl());

      if (!response.ok) {
        throw new Error(
          `Education Counts API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const body = (await response.json()) as SchoolDirectoryResponse;
      if (body.success !== true) {
        throw new Error(
          `Education Counts API rejected the request: ${
            body.error?.message ?? "Unknown error"
          }`,
        );
      }

      return (body.result?.records ?? [])
        .map(mapSchoolDirectoryRecord)
        .filter((record): record is ReturnType<typeof mapSchoolDirectoryRecord> =>
          record !== null,
        );
    },
  };
}

function buildSchoolsDirectoryUrl(): string {
  const sql = `
    SELECT
      "School_Id",
      "Org_Name",
      "Org_Type",
      "Authority",
      "CoEd_Status",
      "URL",
      "Add1_Line1",
      "Add1_Suburb",
      "Add1_City",
      "Regional_Council",
      "Enrolment_Scheme",
      "Total"
    FROM "${SCHOOLS_DIRECTORY_RESOURCE_ID}"
    WHERE "Regional_Council"='Wellington Region'
      AND "Status"='Open'
      AND "Org_Type" IN (
        'Secondary (Year 7-15)',
        'Secondary (Year 9-15)',
        'Composite',
        'Area School'
      )
    ORDER BY "Org_Name"
  `.replace(/\s+/g, " ").trim();

  const params = new URLSearchParams({ sql });
  return `${DATASTORE_SQL_ENDPOINT}?${params.toString()}`;
}

function mapSchoolDirectoryRecord(record: unknown) {
  if (!isRecord(record)) {
    return null;
  }

  const schoolId = getString(record, "School_Id");
  const schoolName = getString(record, "Org_Name");
  if (schoolId === null || schoolName === null) {
    return null;
  }

  const schoolType = getString(record, "Org_Type") ?? "Secondary";
  const area =
    getString(record, "Add1_Suburb") ??
    getString(record, "Add1_City") ??
    "Wellington Region";
  const city = getString(record, "Add1_City");
  const addressParts = [
    getString(record, "Add1_Line1"),
    getString(record, "Add1_Suburb"),
    city,
  ].filter((part): part is string => part !== null);

  return {
    schoolId,
    schoolName,
    schoolType,
    years: parseYears(schoolType),
    gender: normalizeGender(getString(record, "CoEd_Status")),
    authority: getString(record, "Authority") ?? "Unknown",
    hasZone: parseYesNo(getString(record, "Enrolment_Scheme")),
    website: normalizeUrl(getString(record, "URL")) ?? SOURCE_URL,
    area,
    address: addressParts.join(", "),
    roll: parseNumber(getString(record, "Total")),
    sourceUrl: normalizeUrl(getString(record, "URL")) ?? SOURCE_URL,
    tags: buildTags(schoolType, area, city),
  };
}

function parseYears(schoolType: string): string {
  const match = schoolType.match(/Year\s+([^)]+)/i);
  return match ? `Year ${match[1]}` : schoolType;
}

function normalizeGender(value: string | null): string {
  if (value === null) {
    return "unknown";
  }

  if (/co-?educational/i.test(value)) {
    return "co-ed";
  }

  return value;
}

function parseYesNo(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  if (/^yes$/i.test(value)) {
    return true;
  }

  if (/^no$/i.test(value)) {
    return false;
  }

  return null;
}

function normalizeUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function parseNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildTags(
  schoolType: string,
  area: string,
  city: string | null,
): string[] {
  const tags = new Set(["school", "wellington_region"]);

  if (/secondary/i.test(schoolType)) {
    tags.add("secondary");
  }

  if (/\bparaparaumu\b/i.test(`${area} ${city ?? ""}`)) {
    tags.add("paraparaumu");
  }

  return [...tags];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
