# Changelog

All notable changes to TransitOS are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### In Progress
- Mumbai Metro CTM baseline (Lines 1, 2A, 7, 3) via TDSE synthesis
- Calibration and Observation Platform schema and ingestion pipeline
- Full provenance metadata (`sourceType`, `confidence`) across all CTM entities
- Multi-city dynamic switcher (Delhi, Mumbai, Kochi, Bengaluru, Chennai, Hyderabad, Ahmedabad)

---

## [0.6.3] — 2026-10

### Added
- **Interchange Friction Model** (`interchange-evaluator.service.ts`): Built-environment penalties per transfer node — vertical level change (+10 s/m Δz), AFC turnstile re-tap (+60 s), security rescreening (+300 s), outdoor street exposure (+600 s). `frictionLevel` label (`MINIMAL | LOW | MODERATE | HIGH | CRITICAL`) exposed in journey response.
- **Barrier-Aware Corridor Routing** (`journey.service.ts`): Candidate deboarding stations on the same side of infrastructure barriers (e.g., Mumbai suburban railway divide at lon 72.851) are prioritized over barrier-crossing alternatives.
- **Same-Destination Pareto Pruning** (`candidate-filter.service.ts`): Among candidates deboarding at the same physical destination station, routes that are >15% slower or >5 min longer with equal or more transfers are pruned. Candidates routing to different deboarding stations (corridor diversity) are preserved.
- **Dynamic Feeder Catchment** (`locality-routing.service.ts`): Feeder cutoff computed as `max(d_min + 1500m, d_min × 1.6)`. Stations ≤1,200 m use pedestrian mode (1.2 m/s); beyond that, vehicular feeder mode.
- **GIS Search Priority Fix** (`search.service.ts`): Stations and localities rank above physical gates in autocomplete results. Gate/entrance results suppressed unless the query explicitly contains gate-specific terms.

### Fixed
- Yen's KSP feeder filtering: inferior multi-transfer detours to the same destination station pruned before candidate output.
- Locality snapping to gate coordinates corrected; locality reference routing snaps to primary station node.

---

## [0.6.2] — 2026-09

### Added
- **Yen's K-Shortest Loopless Paths**: Replaced single Dijkstra with Yen's algorithm generating up to K=5 distinct candidate routes. Candidates differ in transfer count, lines used, and deboarding station.
- **Two-Stage Candidate Filtering**:
  - *Feasibility filter*: Rejects paths with loops, invalid durations, or >6 transfers.
  - *Pareto dominance filter*: Prunes candidates strictly dominated across duration, transfer count, and walking distance.
- **Structured `RouteCandidate` Schema**: Boolean attribute flags per candidate — `fastest`, `fewestTransfers`, `direct`, `leastWalking`, `accessibilityFriendly` — machine-readable for intent-based re-ranking.
- **Explicit Waiting Time Model**: `TimeEstimate` interface with `source: 'estimated' | 'schedule' | 'live'` separating initial platform wait from interchange wait.
- **Multi-Candidate Map Rendering**: All K route geometries rendered concurrently; selecting a candidate focuses its trajectory and initiates route-focused train simulation.
- **63 Automated Tests**: Test suite covering candidate generation, Pareto filtering, interchange evaluation, feeder catchment boundary conditions, and barrier-aware routing.

### Fixed
- Yamuna Bank ↔ Dwarka Sector 21: direct Blue Line route correctly preserved alongside multi-transfer alternative (neither dominates the other).
- NMIA ↔ Malad: Airport Express multi-transfer route preserved without artificial transfer penalty hacks.
- Delhi Metro Grey Line color (`#808080`) rendered correctly across GIS endpoints, pathfinder legs, and station badges.

---

## [0.6.0] — 2026-09

### Added
- **Container-Presenter Architecture**: Rebuilt frontend with strict separation — presentational components receive data only via props; containers handle API calls and state.
- **Domain Model Adapters**: Backend DTOs converted to clean domain models before reaching UI components.
- **Station Digital Twin Inspector**: Interactive drawer with platform configuration, entrance positions, accessibility metadata, and serving line badges.
- **Step-by-Step Journey Itinerary**: Leg-by-leg directions with line color badges, towards headsigns, and interchange walk cards.

---

## [0.5.5] — 2026-08

### Added
- **5-Stage Certification Governance Pipeline**: `DISCOVERED → ACQUIRED → VALIDATED → CERTIFIED → IMPORTED` lifecycle for every transit dataset.
- **Trust Tier System**: Tier A (official government GTFS), Tier B (community GTFS), Tier X (TDSE synthesized).
- **GTFS Quality Scorer** (`tools/quality-scorer.ts`): 5-dimension 100-point quality score (completeness, consistency, accuracy, timeliness, coverage).
- **National Certification CLI** (`tools/certify-national-gtfs.ts`): Batch certification across all available networks.
- **6 Certified Networks Imported**: Delhi (DMRC), Kochi (KMRL), Hyderabad (HMRL), Bengaluru (BMRCL), Chennai (CMRL), Ahmedabad (GMRC).
- **National Transit Status Dashboard** (`datasets/reports/INDIA_TRANSIT_STATUS.md`).
- **Individual System Audit Reports** (`datasets/reports/CERTIFICATION_*.md`).
- **CTM v1.0 Schema Frozen**: PostgreSQL schema officially frozen; breaking changes require migration and version bump.

---

## [0.5.1] — 2026-08

### Added
- **GTFS-Realtime Feed Poller** (`FeedPollerService`): Background scheduler polling operator GTFS-RT feeds on a configurable interval.
- **Protocol Buffer Decoder** (`GtfsRtParserService`): Decodes binary GTFS-RT `.pb` streams into normalized vehicle position objects.
- **Redis Realtime Cache**: Decoded vehicle positions cached with 30-second TTL; stale fallback with `isStale: true`.
- **`GET /realtime/vehicles`**: Sub-5 ms response from Redis cache; graceful degradation during feed outages.

---

## [0.5.0] — 2026-07

### Added
- **Journey Intelligence Engine** (`GET /journeys`): In-memory directed multigraph G=(V,E) with typed edges (TRANSIT, WALK, TRANSFER). Dijkstra pathfinding with configurable weights (`walkingWeight: 0.8`, `transferPenalty: 120 s equivalent`).
- **`GraphBuilderService`**: Constructs graph from CTM data; walk edges inserted automatically for stations within interchange radius (≤1000 m on different lines); Redis graph version caching.
- **`ScoringService`**: Generalized cost function: `RankScore = w_t × T_duration + P_transfer × N_transfers + w_w × T_walking + C_friction`.
- **GeoJSON Route Geometry**: Journey response includes GeoJSON FeatureCollection highlighting line segments and transfer station nodes.
- **Interchange Walk Detection**: `DigitalTwinService` spatial query (`ST_DistanceSphere ≤ 1000 m`) detects and displays nearby walking transfer options.

### Fixed
- Dhaula Kuan travelator routing: correct 3-leg path (Sarojini Nagar → Durgabai Deshmukh South Campus travelator → Dhaula Kuan → IGI Airport T3) via Airport Express.
- Same-line walk edge elimination: resolved graph-building issue generating spurious 0-minute walk steps between adjacent stations on the same line.
- Redis cache versioning: `digitaltwin:v2:station:<id>` key bump to flush stale single-line payloads.

---

## [0.4.5] — 2026-07

### Added
- **MapLibre GL Vector Map**: CartoDB dark-matter base style with operator line colors and station circle layers.
- **Dynamic Layer Registry** (`GET /map/layers`): Backend controls layer configuration, endpoints, visibility, and style. Client renders all registered layers without code changes.
- **Station Digital Twin API** (`GET /stations/:id/digital-twin`): Composite payload with physical levels, platforms, entrances, and amenities.
- **`GeojsonService`**: Database-level GeoJSON aggregation using PostGIS (`ST_AsGeoJSON`, `ST_MakeLine`). Zero client-side coordinate transformation.
- **`SearchService`**: Full-text station search and spatial proximity queries (`GET /map/search`, `GET /map/nearby`).
- **Diagnostics HUD** (`Ctrl+Shift+D`): Developer overlay displaying FPS, map coordinates, layer counts, and API latencies.

### Fixed
- Route line geometry: switched from shapes to unique `(lineId, shapeId)` coordinate reconstruction — reduced coordinate count from 23,800+ repeated points to ~100 unique points per line.
- Station city assignment: corrected data mapping that hardcoded all stations to Mumbai; 262 Delhi and 25 Kochi stations updated.
- Serving lines resolution: switched from `station_sequences` to `trips`/`stop_times` join to correctly identify lines serving each station.
- MapLibre viewport lag: replaced `move` listener with `moveend` to eliminate rendering feedback loops.

---

## [0.3.5] — 2026-07

### Added
- **Validation CLI**: Bounding box validation, checksum verification, and referential constraint checks for GTFS feeds.
- **Authoritative Data Catalog**: Delhi (DMRC) and Kochi (KMRL) GTFS static feeds imported.

---

## [0.2.0] — 2026-07

### Added
- **CTM Database Schema**: Full Prisma schema for Systems, Agencies, Lines, Stations, Levels, Platforms, Entrances, Amenities, Trips, StopTimes, Shapes, Calendars, Frequencies.
- **PostGIS Extension**: Spatial geometry columns with GIST indexes and trigger-based sync.

---

## [0.1.0] — 2026-07

### Added
- **Monorepo Structure**: npm workspaces with NestJS backend (`apps/backend`) and Next.js frontend (`apps/frontend`).
- **Docker Compose**: Local PostgreSQL/PostGIS and Redis services.
- **Shared Tooling**: ESLint and TypeScript configurations in `packages/config`.
