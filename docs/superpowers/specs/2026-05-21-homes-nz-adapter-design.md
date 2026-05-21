# homes.co.nz Adapter Design

## Summary

Add a `createHomesNzAdapter` that scrapes homes.co.nz property profile pages for Paraparaumu properties. Extend the `PropertyListing` domain type with optional valuation and council data fields.

## Discovery

homes.co.nz publishes 40 sitemaps (`sitemapv2_properties1-40.xml.gz`) containing all NZ property URLs. The adapter fetches the sitemaps, filters for URLs containing `paraparaumu`, and extracts property IDs and page URLs.

Sitemap results are cached to a local file (infrequently changing data). On each refresh, only properties whose data has changed (per `estimated_value_revision_date`) are re-fetched.

## Data Extraction

Property pages on homes.co.nz are Angular SSR pages. The property data is embedded in a `<script id="homes-app-state" type="application/json">` tag. The adapter fetches the HTML page, extracts this script tag, and parses the JSON to get `card.property_details`.

Key fields available in the SSR payload:

| homes.co.nz field | Target field | Notes |
|---|---|---|
| `address` | `address` | Full address string |
| `display_estimated_lower_value_short` | `estimatedValueLow` | Parse "655K" → 655000 |
| `display_estimated_upper_value_short` | `estimatedValueHigh` | Parse "725K" → 725000 |
| `display_estimated_value_short` | `price` | Mid-point, as display string |
| `estimated_value_revision_date` | `estimatedValueDate` | ISO date string |
| `capital_value` | `capitalValue` | Number (NZD) |
| `land_value` | `landValue` | Number (NZD) |
| `improvement_value` | `improvementValue` | Number (NZD) |
| `current_revision_date` | `cvDate` | ISO date string |
| `land_area` | `landArea` | m² |
| `floor_area` | `floorArea` | m² |
| `num_bedrooms` | `bedrooms` | Integer |
| `num_bathrooms` | `bathrooms` | Integer |
| `num_car_spaces` | `parking` | Integer |
| `decade_built` | `decadeBuilt` | e.g. "1970" |
| `contour` | `contour` | e.g. "LV" (level) |
| `building_construction` | `buildingConstruction` | Council code |
| `ownership_type` | `ownershipType` | e.g. "Freehold" |
| `legal_description` | `legalDescription` | LOT/DP reference |
| `certificate_of_title` | `certificateOfTitle` | Title reference |
| `display_estimated_rental_lower_value_short` | `estimatedRentalLow` | Weekly rent, parse "450" → 450 |
| `display_estimated_rental_upper_value_short` | `estimatedRentalHigh` | Weekly rent |
| `estimated_rental_yield` | `estimatedRentalYield` | e.g. "4.0%" (string) |

## Data Model Changes

### `server/domain/types.ts` — `propertyListingSchema`

Add optional fields:

```typescript
// Valuation
estimatedValueLow: z.number().int().nonnegative().nullable(),
estimatedValueHigh: z.number().int().nonnegative().nullable(),
estimatedValueDate: z.string().nullable(),
capitalValue: z.number().int().nonnegative().nullable(),
landValue: z.number().int().nonnegative().nullable(),
improvementValue: z.number().int().nonnegative().nullable(),
cvDate: z.string().nullable(),
// Rental estimate
estimatedRentalLow: z.number().int().nonnegative().nullable(),
estimatedRentalHigh: z.number().int().nonnegative().nullable(),
estimatedRentalYield: z.string().nullable(),
// Council / property attributes
decadeBuilt: z.string().nullable(),
contour: z.string().nullable(),
buildingConstruction: z.string().nullable(),
ownershipType: z.string().nullable(),
legalDescription: z.string().nullable(),
certificateOfTitle: z.string().nullable(),
```

All default to `null` — existing adapters and data are unaffected.

### `server/pipeline/normalize.ts` — `RawPropertyListing`

Add the same optional fields to the interface.

### `server/pipeline/normalize.ts` — `normalizePropertyListing`

Passthrough the new fields from `raw` to `property` output.

## Adapter Interface

```typescript
createHomesNzAdapter(options: HomesNzAdapterOptions): SourceAdapter
```

Options:
- `fetchImpl` — injectable fetch (default: global fetch)
- `sitemapCacheStore` — cache for sitemap results (default: file-based)
- `propertyCacheStore` — cache for fetched property IDs and their revision dates
- `maxPropertiesPerFetch` — cap per refresh (default: 20)
- `throttleMs` — delay between requests (default: 500)
- `now` — injectable timestamp

Source metadata:
- `sourceId`: `"homes_co_nz"`
- `recordType`: `"property_listing"`
- `trustLevel`: `"platform"`
- `refreshIntervalMinutes`: `1440` (daily — homes.co.nz estimates update monthly)

## Caching Strategy

**Sitemap cache** (`data/homes-nz-sitemap-cache.json`): Stores the last-fetched timestamp and the full list of Paraparaumu property URLs. Re-fetched only if older than 7 days.

**Property cache** (`data/homes-nz-property-cache.json`): Keyed by property ID, stores `estimated_value_revision_date`. On each refresh, only properties with changed or new revision dates are fetched.

## Edge Cases & Error Handling

- **Missing `homes-app-state` script**: skip the property (page may be 404 or changed layout)
- **Malformed JSON**: skip with logged error
- **Short value parsing**: `"655K"` → 655000, `"1.2M"` → 1200000, `null` → null
- **Sitemap fetch failure**: throw — entire adapter batch rolls back
- **Property outside Paraparaumu**: filtered at sitemap stage (URL must contain `paraparaumu`)
- **Rate limiting**: 500ms throttle between property page fetches

## Files Changed

| File | Action |
|---|---|
| `server/domain/types.ts` | Add optional fields to `propertyListingSchema` |
| `server/pipeline/normalize.ts` | Add optional fields to `RawPropertyListing` + passthrough |
| `server/adapters/homesNz.ts` | **New** — adapter implementation |
| `server/adapters/homesNz.test.ts` | **New** — adapter tests |
| `server/adapters/sourceConfig.ts` | Register `createHomesNzAdapter` |

## Out of Scope (future)

- Individual recent sales records (require API/headless browser)
- Nearby listings (require API call)
- Property images
- School zone assignment data
