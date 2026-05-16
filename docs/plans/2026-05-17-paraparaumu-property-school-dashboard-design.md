# Paraparaumu Property And School Dashboard Design

Date: 2026-05-17

## Purpose

Build a personal web dashboard for property decisions in Paraparaumu, New Zealand.
The dashboard helps one household monitor property listings, school information,
council updates, local news, events, and other life signals from one place.

The product is not a public portal. It does not need user accounts, billing,
marketing pages, or broad New Zealand coverage. It should prioritize practical
daily use, source traceability, and easy extension.

## Product Scope

The first version is a lightweight version of a property decision dashboard.
Property listings are the main axis. School, council, local news, transport, and
community information provide context around those listings.

### Geographic Scope

- Property scope: Paraparaumu, including nearby Paraparaumu-related suburbs such
  as Paraparaumu Beach, Otaihanga, Lindale, and Mazengarb.
- School scope: a realistic candidate pool of secondary schools across Greater
  Wellington that could be considered from Paraparaumu.
- Local information scope: only items relevant to Paraparaumu, watched
  properties, or watched schools.

## MVP Features

### Dashboard

The home page shows the highest-priority changes:

- New Paraparaumu property listings.
- Upcoming open homes.
- Price changes.
- School open days, enrolment deadlines, ballots, information evenings, and
  school tours.
- Council notices, local news, transport issues, and community events related to
  Paraparaumu.
- Items that need manual review because address matching, source parsing, or
  classification is uncertain.

### Property List

The property list collects all Paraparaumu listings first, without strict price
or bedroom filters.

Each listing should show:

- Source platform.
- Address.
- Price.
- Bedrooms, bathrooms, and parking when available.
- Land area and floor area when available.
- Listed date.
- Open home times.
- Source URL.
- Status tags such as `new`, `price_changed`, `open_home_soon`,
  `needs_council_check`, and `school_info_missing`.
- User status such as `watching`, `visited`, `ignored`, and `shortlist`.

### Property Detail

Each property detail page should combine source data and decision context:

- Listing facts and original platform link.
- Council property/rates link.
- CV, LV, rates, land area, and property metadata when available.
- Address parsing and matching status.
- Nearby primary and intermediate school candidates.
- Relevant Greater Wellington secondary school candidates.
- Council, news, transport, hazard, planning, and event items linked to the
  property or area.
- Personal notes.

The system should keep source links visible and avoid presenting derived
information as a final legal or purchasing conclusion.

### School Radar

The school module should track a practical candidate pool, not every secondary
school in Greater Wellington.

Each school should record:

- Name.
- School type.
- Year range.
- Gender.
- Authority or ownership type.
- Whether it appears to have an enrolment zone.
- Website.
- Area.
- Commute practicality from Paraparaumu.
- Watch status.

The monitor should look for:

- `open day`
- `enrolment`
- `out of zone`
- `ballot`
- `information evening`
- `school tour`
- `prospectus`

### Source Management

The source page shows:

- Source name.
- Source type.
- URL.
- Trust level.
- Enabled status.
- Refresh interval.
- Last successful fetch.
- Last error.
- Manual refresh action.

This page exists to make the system maintainable and to support future life
information sources.

## Non-Goals

The first version should not include:

- User registration or permissions.
- Payment or subscriptions.
- A mobile app.
- Public SEO pages.
- Automated valuation models.
- Automated buy/no-buy recommendations.
- Full New Zealand coverage.
- Legal-grade school zone determination.
- Scraping sources that require login or clearly disallow automated access.

## Architecture

The system uses a unified information pipeline:

```text
Source Adapter -> Raw Snapshot -> Normalized Item -> Tag/Link/Score -> Dashboard
```

### Technology Stack

- Frontend: React and TypeScript.
- Backend and collectors: Node.js and TypeScript.
- Database: SQLite for the first version, with a path to Postgres later.
- Scheduler: local cron or a Node-based scheduled job.
- UI shape: practical dashboard, not a marketing site.

### Future Cloudflare Deployment

The first version can run locally with SQLite, but the architecture should leave
a clear path to Cloudflare:

- Frontend: Cloudflare Pages.
- API: Cloudflare Workers.
- Database: Cloudflare D1 as the hosted SQLite-compatible target.
- Scheduled collectors: Cloudflare Cron Triggers.
- Cache and lightweight state: Cloudflare KV if needed.
- Larger raw snapshots: Cloudflare R2 if snapshots become too large for D1.

To keep this migration practical, database access should stay behind repository
interfaces, adapters should avoid Node-only APIs unless isolated, and scheduled
jobs should accept injected fetch, clock, and persistence dependencies.

### Source Adapters

Each adapter should only know how to fetch and parse one source family. It should
not own dashboard-specific behavior.

Initial adapters:

- `realestate_co_nz`
- `trademe_property`
- `kapiti_council_news`
- `kapiti_council_events`
- `education_counts_schools`
- `school_website_monitor`
- `metlink_alerts`

Future adapters can include:

- `weather_alerts`
- `library_events`
- `gp_or_clinic_info`
- `after_school_care`
- `manual_facebook_import`
- `manual_wechat_import`
- `community_group_manual_import`

### Normalized Item Types

All sources should normalize into a small shared set of item types:

- `property_listing`
- `school_profile`
- `school_event`
- `council_notice`
- `local_news`
- `community_event`
- `transport_alert`
- `manual_note`

Common item fields:

```yaml
id:
type:
title:
summary:
source_name:
source_url:
area:
address:
published_at:
fetched_at:
starts_at:
ends_at:
tags:
status:
raw_data:
```

Property-specific fields:

```yaml
price:
bedrooms:
bathrooms:
parking:
land_area:
floor_area:
property_type:
open_home_times:
platform:
watch_status:
```

School-event-specific fields:

```yaml
school_name:
event_type:
year_level:
enrolment_year:
deadline:
```

## Data Sources

Preferred source order:

1. Official APIs, feeds, and structured data.
2. Official websites.
3. Property platforms.
4. Local media.
5. Manual imports.

Initial source families:

- Education Counts Find School and Schools Directory API.
- Education Counts school enrolment zone data.
- Individual school websites.
- Kāpiti Coast District Council website, events, property search, maps, and GIS.
- Kāpiti open GIS feed.
- realestate.co.nz and Trade Me Property public listing pages or saved search
  URLs.
- Metlink and NZTA transport alerts.
- Local media such as RNZ, Stuff, 1News, and Kāpiti News.

Every displayed item must preserve its source URL and fetch time.

## Refresh And Alert Rules

Recommended initial refresh frequencies:

- Property listings: once or twice daily.
- School websites and school events: once daily.
- Council news, events, and local news: once daily.
- Transport and weather sources: every 30-60 minutes when added later.

Initial attention rules:

- New Paraparaumu listing.
- Open home in the next 14 days.
- Price change.
- School open day, enrolment deadline, ballot, or tour.
- Council notice mentioning Paraparaumu, rates, flood, roadworks, district plan,
  water, housing, or planning.
- Source failed more than three consecutive refreshes.
- Item could not be matched to a known address, area, school, or property.

Item review statuses:

- `new`
- `reviewed`
- `watching`
- `ignored`
- `done`

## Data Model

```text
sources
- id
- name
- type
- url
- trust_level
- enabled
- refresh_interval
- last_success_at
- last_error

raw_snapshots
- id
- source_id
- fetched_at
- url
- content_hash
- raw_payload

items
- id
- type
- title
- summary
- source_id
- source_url
- area
- address
- published_at
- starts_at
- ends_at
- status
- tags
- raw_snapshot_id

properties
- id
- item_id
- address
- suburb
- price
- bedrooms
- bathrooms
- parking
- land_area
- floor_area
- listed_at
- open_home_times
- platform
- watch_status
- notes

schools
- id
- name
- school_type
- years
- gender
- authority
- has_zone
- website
- area
- commute_from_paraparaumu
- watch_status

school_events
- id
- school_id
- item_id
- event_type
- starts_at
- deadline
- enrolment_year

item_links
- id
- from_item_id
- to_entity_type
- to_entity_id
- link_reason
- confidence

notes
- id
- entity_type
- entity_id
- body
- created_at
```

## Frontend Structure

```text
src/
  app/
    Dashboard.tsx
    PropertyList.tsx
    PropertyDetail.tsx
    SchoolRadar.tsx
    Sources.tsx
  components/
    ItemCard.tsx
    StatusBadge.tsx
    SourceLink.tsx
    RefreshButton.tsx
  lib/
    api.ts
    types.ts
```

## Backend Structure

```text
server/
  adapters/
    realestate.ts
    trademe.ts
    council.ts
    educationCounts.ts
    schoolWebsite.ts
  pipeline/
    normalize.ts
    dedupe.ts
    tag.ts
    link.ts
  db/
    schema.ts
    queries.ts
  jobs/
    refreshAll.ts
```

## Extension Model

To add a future life information source, answer four questions:

1. Which normalized `type` does it map to?
2. Does it have address, time, area, or school/property relevance?
3. What keywords or filters make it relevant?
4. Does it need an attention rule?

Example:

```yaml
source: kapiti_library_events
type: community_event
area: Paraparaumu
keywords:
  - children
  - family
  - school holiday
  - storytime
attention_rule:
  starts_within_days: 14
```

This keeps future additions local to adapter configuration, normalization, and
optional dashboard filters.

## Risks And Constraints

- Recent sale prices in New Zealand are often controlled by commercial datasets
  such as REINZ, CoreLogic, or QV. The system should use free public data where
  available and mark missing sale data clearly.
- School zones and enrolment rules must be linked back to official sources.
  The system should not make legal-grade eligibility claims.
- Property platforms may limit automated access. The first version should use
  saved searches, public pages, or manual workflows where needed.
- Address matching can be unreliable. The UI should surface confidence and allow
  manual review.
- Summaries are convenience aids, not substitutes for source verification.

## Approval

Approved direction:

- Use a website interface.
- Use React and TypeScript on the frontend.
- Use TypeScript for backend collectors and source adapters.
- Focus property collection on Paraparaumu first.
- Track a practical Greater Wellington secondary school candidate pool.
- Design for future lifestyle information sources through adapters and
  normalized item types.
