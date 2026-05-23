# Paraparaumu Dashboard

A personal web dashboard for monitoring property listings, schools, and local information in Paraparaumu, New Zealand.

## Features

- **Property Listings** — Aggregates listings from realestate.co.nz and homes.co.nz, with valuation estimates, council data (CV/RV), rental yields, and property images
- **School Radar** — Tracks schools in the Kapiti Coast area with zone and enrolment event information
- **Data Pipeline** — Normalizes, tags, dedupes, and links records from multiple sources into a unified view
- **Source Management** — Configurable source adapters with refresh intervals and error tracking

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript |
| Backend | Express 5, better-sqlite3 |
| Validation | Zod |
| Deployment | Cloudflare Workers |
| Testing | Vitest, Testing Library |

## Getting Started

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev

# Run backend dev server
npm run server:dev

# Run tests
npm test

# Type-check
npm run typecheck

# Build for production
npm run build
```

Requires Node.js >= 22.13.0.

## Project Structure

```
server/
  adapters/       # Source adapters (realestate.co.nz, homes.co.nz)
  api/            # Express API routes
  db/             # SQLite schema and repositories
  domain/         # Zod schemas and domain types
  jobs/           # Refresh orchestration
  pipeline/       # Normalize, tag, dedupe, link
src/
  app/            # Page components (Dashboard, PropertyList, PropertyDetail, SchoolRadar, Sources)
  components/     # Shared UI components
  lib/            # Types and utilities
docs/
  deployment/     # Cloudflare deployment guide
  superpowers/    # Design specs and implementation plans
```

## Data Pipeline

```
Source Adapter → Raw Snapshot → Normalized Item → Tag → Link → Dashboard
```

1. **Adapters** (`server/adapters/`) fetch raw records from external sources
2. **Pipeline** (`server/pipeline/`) normalizes into typed domain objects, tags, dedupes, and links
3. **Persistence** (`server/db/`) stores data in SQLite with upsert semantics
4. **Jobs** (`server/jobs/`) orchestrate the refresh cycle per adapter

## Deployment

The app targets Cloudflare Workers with D1 (SQLite). See `docs/deployment/cloudflare.md` for details.

```bash
npm run cf:check    # Validate Cloudflare config
npm run cf:deploy   # Deploy to Cloudflare Workers
```
