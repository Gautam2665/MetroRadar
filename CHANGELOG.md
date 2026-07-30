# Changelog

All notable changes to the MetroRadar project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-07-29
### Added
- **Journey Intelligence Routing Engine (`GET /journeys`)**: Multi-modal Dijkstra pathfinding engine supporting station-to-station graph traversal, line transfers, and walking connections.
- **Graph Builder Service (`GraphBuilderService`)**: In-memory transit graph construction supporting custom node line associations, multi-station walk connections, transfer penalties, and Redis graph version caching (`transit:graph:v7:${systemId}`).
- **Routing & Scoring Engine (`RoutingService`, `ScoringService`)**: Implemented configurable Dijkstra pathfinding algorithm with custom weights (`walkingWeight: 0.8`, `transferPenalty: 180s`) and multi-criteria journey scoring.
- **GeoJSON Journey Highlighting**: Added automatic GeoJSON feature collection generation for calculated journey routes, highlighting line segment tracks and transfer station nodes.
- **Interchange & Station Twin Enrichment**: Updated `DigitalTwinService` spatial query (`ST_DistanceSphere <= 1000`) to detect and display nearby walking transfer lines (e.g. Airport Express travelator connection at Durgabai Deshmukh South Campus).

### Fixed
- **Dhaula Kuan Travelator Routing**: Fixed Pink Line to Airport Express transfer routing ( Sarai Kale Khan ➔ Dhaula Kuan ➔ IGI Airport) to choose the direct 3-leg route via South Campus travelator connection.
- **Same-Line Walk Edge Elimination**: Resolved graph building issue that generated fake 0-minute walk steps between stations on the same metro line.
- **Digital Twin Redis Cache Versioning**: Bumped Redis cache key in `StationsController` to `digitaltwin:v2:station:${id}` to flush stale single-line payloads and immediately serve updated interchange data.
- **CI Build & Lint Standardization**: Fixed all TypeScript compile errors, React hook warnings (`set-state-in-effect`), and unused variables across backend and frontend workspaces.

---

## [0.4.0] - 2026-07-22
### Added
- **Dynamic GIS Layer Registry (`GET /map/layers`)**: Standardized configuration payload letting the backend define layers, endpoints, visibility, and custom styles.
- **Dynamic Route Color Coding**: Added backend name-based route color resolver (mapping keywords like `YELLOW`, `BLUE`, `PINK`, `RED` etc. to their true vibrant hex codes) to replace generic black/null/white GTFS route colors.
- **Decomposed GIS Module**: Built specialized services (`GeojsonService`, `DigitalTwinService`, `SearchService`).
- **Composite Digital Twin API (`GET /stations/:id/digital-twin`)**: Assembles station physical levels, platforms, entrances, amenities, and operational states.
- **Diagnostics HUD (`Ctrl+Shift+D`)**: Embedded canvas overlay displaying real-time FPS, coordinates, layer counts, and API latencies.
- **Diagnostics Developer Console**: Added administrative controls page showing processed records and import logs.
- **Tabbed Digital Twin Inspector**: Slide drawer drawer presenting station structural tabs.

### Fixed
- **Deduplicated Route Line Geometry**: Switched lines reconstruction from shapes to unique `(lineId, shapeId)` coordinates, decreasing coordinates bloat from 23,800+ repeated points to ~100 unique points per line.
- **Station Location Mismatches**: Corrected data mapping issue that hardcoded all GTFS stations to Mumbai; 262 Delhi stations updated to `Delhi` and 25 Kochi stations updated to `Kochi` in database.
- **Delhi/Kochi Empty Serving Lines**: Switched serving lines resolution from `station_sequences` to query via `trips` and `stop_times` relationships.
- **Map Viewport Lag**: Replaced MapLibre `move` listener with `moveend` to eliminate feedback rendering loops and restore smooth 60 FPS city jumping.
- **Client-Side Safe Guards**: Added null-safe checks for station city and coordinates in the digital twin inspector.
- **TypeScript & ESLint compiler warnings**: Refactored loose type castings to strictly defined interfaces resolving all ESLint checks.

---

## [0.3.5] - 2026-07-15
### Added
- **Validation CLI**: Bounding boxes, checksums, and reference checks.
- **Authoritative Data Catalog**: Delhi and Kochi GTFS static imports.

---

## [0.2.0] - 2026-07-08
### Added
- **Database Schema**: Unified Canonical Transit Model (CTM) tables.
- **PostGIS Extension**: Enabled spatial indexes.

---

## [0.1.0] - 2026-07-01
### Added
- **Monorepo Structure**: NestJS backend and Next.js frontend folders.
- **Docker Compose Configurations**: Local Postgres/PostGIS and Redis services.
