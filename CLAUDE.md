# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Next.js (App Router) frontend that displays Biodiversity Gain Sites (BGS) data scraped from the UK government's BGS Register API (https://environment.data.gov.uk/bng/api). Live at https://bgs.bristoltrees.space/.

## Commands

- `npm run dev` — start the dev server (clears `dev-api-cache/` on startup)
- `npm run build` — production build (also requires `MONGODB_URI` and `GOOGLE_MAPS_API_KEY` env vars; reads git commit hash via `git rev-parse`)
- `npm run start` — run production build
- `npm run lint` — ESLint (`next/core-web-vitals`); CI runs this with `--max-warnings 0`
- `npm run setup-db-indexes` — run `scripts/setup-database-indexes.js` to (re)create MongoDB indexes

There is no test suite configured. CI (`.github/workflows/ci.yml`) runs lint on push and lint+build on PRs into `prod`.

### Env vars (`.env.local`)
- `MONGODB_URI` — enables the MongoDB cache layer (site names, API response cache, geocoding cache, slug mappings). If unset, these caches are disabled (functions fall back to direct API calls / no-ops).
- `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — map providers
- `ADMIN_API_KEYS` — auth for `/admin` actions
- `CRON_SECRET` — auth for `/api/cron`

## Architecture

### Routing structure (`app/`)
- `app/(main)/` — main site layout/nav (`layout.js` includes JSON-LD schema, global nav, footer, toaster)
- `app/(modal)/` — intercepted/parallel routes rendered as modals (about, feedback, glossary)
- `app/(main)/api/` and `app/api/` — route handlers (e.g. `/api/cron` for the scheduled stats job, `/api/modal/*` for modal data fetches, `/api/query/[mode]` for the public query tool)
- Dynamic routes use a `referenceNumber` (BGS site ID) or `[lpa]/[planningRef]` (allocation, identified by Local Planning Authority + planning reference, with slugified URL segments)
- Each route's `page.js` is a server component that fetches data via `lib/api.js` and passes it to a co-located `*Content.js` / `*Tab.js` client component for interactivity

### Data layer (`lib/api.js`)
This is the central data-fetching module. Key flow:
1. `fetchAllRefNos()` / `fetchAllSites()` / `fetchSite()` fetch raw site & allocation data from the BGS Register API (`config.js` → `API_URL`)
2. All external API calls go through `queryBGSAPI`, which is wrapped in `unstable_cache` and backed by a MongoDB cache collection (`bgs-register-cache`) — falls back to the live API only on cache miss, with `p-queue` rate-limiting (concurrency 1, throttled)
3. Raw site data is post-processed by `lib/habitat.js` (`preProcessSiteHabitatData`, `processSiteHabitatData`) and `lib/sites.js` (`processSiteForListView`, `convertSankeySourceDataToGraph`) to compute Habitat Units (HUs), Sankey graphs, etc.
4. Spatial data (geocoding, polygons, distances) comes from `lib/geo.js`, which calls ArcGIS endpoints (`config.js` → `ARCGIS_*` URLs) with results cached via MongoDB
5. Allocations (development site ↔ BGS offset site pairings) are derived from sites via `transformAllocations()`; LPA/planning-ref slugs are cached via `cacheSlugMappingsBulk` / `getUnslugifiedValues` for stable URLs

In dev/build, `queryBGSAPI`-style responses are also cached to disk under `dev-api-cache/` (cleared on each `next dev` start by `next.config.js`).

### Habitat Unit (HU) calculations (`lib/habitat.js`)
This module encodes the BNG metric methodology: distinctiveness/condition scores, time-to-target, difficulty multipliers, trading rules, and `calculateBaselineHU` / `calculateImprovementHU`. Reference data lives as CSVs in `data/` (habitat codes, temporal multipliers, UKHab codes, LSOA/LNRS/NCA datasets). When changing HU math, check both the baseline and improvement/enhancement calculation paths and the Sankey graph conversion in `lib/sites.js`, since the site detail page's Sankey chart and the HU figures must stay consistent.

### Caching model
Two layers, both backed by MongoDB (`lib/mongodb.js`, single shared `clientPromise`):
- **API response cache** (`bgs-register-cache` collection) — raw responses from the government BGS API, refreshed periodically via `unstable_cache`
- **Derived/enriched data caches** — site names/admin overrides (`siteName` collection), geocoding results, slug↔ID mappings

If `MONGODB_URI` is not set, caching is silently disabled and the app falls back to live API calls each time — useful for quick local checks but slow.

### Charts
Built with `recharts` (statistics/allocation analysis charts) and `plotly.js`/`react-plotly.js` (Sankey habitat-flow charts, using a custom fork with sankey label formatting — see `package.json`). Chart components live under `components/charts/`.

### Maps
Built with `leaflet`/`react-leaflet`. Spatial layers (site boundaries, allocation polygons, LPA/LNRS/NCA boundary overlays) live under `components/map/`, backed by `lib/geo.js` and `lib/polygonCache.js`.

### UI/styling
Chakra UI v3 (`@chakra-ui/react`), themed via `theme/index.js` and `components/styles/provider`. Shared UI primitives (modals, tooltips, searchable dropdowns/tables) live in `components/ui/`. Path aliases (`@/components`, `@/lib`, `@/data`, `@/config`, etc.) are defined in `jsconfig.json`.

### Infrastructure projects (`/infrastructure-projects`)
A map + searchable/filterable table of Nationally Significant Infrastructure Projects (NSIPs), separate from the BGS site data. `lib/nsip.js` fetches the project geometries (planning.data.gov.uk NSIP geojson) and developer/applicant names — primarily from the Planning Inspectorate's Register of Applications CSV, with two SDNPA ArcGIS layers as fallback for gaps — all via `fetchWithMongoCache` into the `nsip-cache` collection (`unstable_cache`, 24h revalidate). `lib/nsip-data.js` (`processNSIPData`) flattens the geojson into table/map records; `NSIP_TYPE_LABELS`/`NSIP_TYPE_COLORS` define the project-type taxonomy used by both the table swatches and `components/map/NSIPMap.js`. The table (`InfrastructureProjectsContent.js`, via `SearchableTableLayout`) and map stay in sync: filtering/searching updates `NSIPMap`'s `projects` prop, and hovering a row highlights the corresponding map feature in red (`NSIPMap` forces a `GeoJSON` remount via a content-derived `key` since react-leaflet's `GeoJSON` doesn't react to `data` prop changes).
