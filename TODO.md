# TransitOS — Development Backlog

This file tracks milestone completion status and active/planned work items across all platform phases.

For full milestone descriptions, see [ROADMAP.md](./ROADMAP.md).  
For architecture context, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Sprint and Version Status

| Version | Milestone | Status |
|:---|:---|:---:|
| v0.1 | Infrastructure and monorepo foundation | Complete |
| v0.2 | Spatial database and CTM schema | Complete |
| v0.3 | GTFS static ingestion engine | Complete |
| v0.4 | Dataset validation CLI and city imports | Complete |
| v0.4.5 | GIS map engine and digital twin inspector | Complete |
| v0.5 | Journey pathfinding engine | Complete |
| v0.5.1 | Realtime GTFS-RT ingestion and Redis pipeline | Complete |
| v0.5.5 | National GTFS certification and CTM v1.0 freeze | Complete |
| v0.6 | Multi-candidate routing, Pareto filtering, interchange friction | Complete |
| v0.6.5 | National transit expansion and calibration baseline | **Active** |
| v0.7 | Prediction engine and operational intelligence | Planned |
| v0.8 | Network analytics and operator intelligence | Planned |
| v0.9 | AI interface gateway and voice prototype | Planned |
| v1.0 | Fare engine and booking platform | Planned |
| v1.1+ | Ambient computing and multi-client interfaces | Planned |

---

## Completed Milestones

### v0.1 — Infrastructure Foundation
- [x] Configure monorepo (`npm` workspaces, root `package.json`, shared `packages/config`)
- [x] Docker Compose for local PostgreSQL/PostGIS and Redis
- [x] NestJS backend and Next.js frontend scaffold

### v0.2 — Spatial Database and Canonical Transit Model
- [x] Enable PostGIS extension; verify spatial queries
- [x] Prisma CTM schema (Systems, Agencies, Lines, Stations, Levels, Platforms, Entrances, Amenities, Trips, StopTimes, Shapes, Calendars, Frequencies)
- [x] GIST spatial indexes on geometry columns
- [x] Trigger-based `geom` sync from `latitude`/`longitude` floats

### v0.3 — GTFS Static Ingestion Engine
- [x] Transaction-safe GTFS zip archive importer (`apps/backend/src/modules/ingestion`)
- [x] Archive validator (`gtfs-archive.validator.ts`) — checksum, bounding box, referential integrity
- [x] `IngestionSession` tracking with per-entity counts, warnings, errors

### v0.4 — Dataset Validation CLI and City Imports
- [x] GTFS dataset validation CLI
- [x] 5-stage governance lifecycle: `DISCOVERED → ACQUIRED → VALIDATED → CERTIFIED → IMPORTED`
- [x] Delhi (DMRC, Tier A) and Kochi (KMRL, Tier A) imported and certified

### v0.4.5 — GIS Map Engine and Digital Twin Inspector
- [x] MapLibre GL vector map with CartoDB dark-matter base style
- [x] Dynamic layer registry (`GET /map/layers`)
- [x] `GeojsonService`: database-level GeoJSON aggregation via PostGIS
- [x] `DigitalTwinService` and `GET /stations/:id/digital-twin`
- [x] `SearchService`: full-text search and spatial proximity (`GET /map/search`, `GET /map/nearby`)

### v0.5 — Journey Intelligence Engine
- [x] In-memory directed multigraph G=(V,E) with TRANSIT, WALK, TRANSFER edge types
- [x] `GraphBuilderService`: graph construction from CTM, walk edge insertion, Redis graph caching
- [x] `RoutingService`: Dijkstra pathfinding with configurable weights
- [x] `ScoringService`: generalized cost scoring (`RankScore = w_t × T + P × N_transfers + w_w × T_walk + C_friction`)
- [x] `GET /journeys` endpoint with leg itinerary, GeoJSON route geometry
- [x] Dhaula Kuan travelator routing fix

### v0.5.1 — Realtime GTFS-RT Telemetry
- [x] `FeedPollerService` background scheduler
- [x] `GtfsRtParserService` Protocol Buffer decoder
- [x] Redis 30-second TTL cache with stale fallback (`isStale: true`)
- [x] `GET /realtime/vehicles` endpoint

### v0.5.5 — National GTFS Certification and CTM v1.0 Freeze
- [x] Trust Tier system (Tier A official, Tier B community, Tier X synthesized)
- [x] GTFS Quality Scorer — 5-dimension 100-point score
- [x] 6 networks certified and imported (Delhi, Kochi, Hyderabad, Bengaluru, Chennai, Ahmedabad)
- [x] National Transit Status Dashboard (`datasets/reports/INDIA_TRANSIT_STATUS.md`)
- [x] Individual system audit reports (`CERTIFICATION_*.md`)
- [x] **CTM v1.0 schema frozen**

### v0.6 — Multi-Candidate Routing and Interchange Analysis
- [x] Yen's K-Shortest Loopless Paths (K=5)
- [x] Feasibility filter (loops, invalid durations, excessive transfers)
- [x] Pareto dominance filter (duration, transfers, walking)
- [x] Same-destination pruning: candidates >15% slower or >5 min longer with ≥ transfers pruned
- [x] Corridor diversity preservation: different deboarding stations retained
- [x] `InterchangeEvaluatorService`: built-environment friction (level change, AFC re-tap, security, outdoor)
- [x] `frictionLevel` label (MINIMAL | LOW | MODERATE | HIGH | CRITICAL)
- [x] Barrier-aware routing (infrastructure divide detection and prioritization)
- [x] Dynamic feeder catchment (`max(d_min + 1500m, d_min × 1.6)`)
- [x] GIS search: stations and localities ranked above physical gates
- [x] `RouteCandidate` attribute flags (`fastest`, `fewestTransfers`, `direct`, `leastWalking`, `accessibilityFriendly`)
- [x] 63 automated tests passing (9 test suites)

---

## Active: v0.6.5 — National Transit Expansion and Calibration Baseline

### Mumbai Metro CTM Baseline (TDSE Synthesis)
- [ ] Line 1 (Blue): Versova ↔ Andheri ↔ Ghatkopar — synthesize from DPR + timetables + OSM
- [ ] Line 2A (Yellow): Dahisar East ↔ Andheri West (DN Nagar) — synthesize
- [ ] Line 7 (Red): Dahisar East ↔ Gundavali (Andheri East) — synthesize
- [ ] Line 3 (Aqua): Underground Aarey JVLR ↔ BKC ↔ Cuffe Parade — synthesize
- [ ] Suburban railway interchange walk paths (Ghatkopar, Andheri, Dadar)

### Tier-2 Networks
- [ ] Pune Metro — ingest and model
- [ ] Nagpur Metro — ingest and model

### Calibration and Observation Platform
- [ ] Observation data schema (station run times, dwell times, transfer walk times, headways, GPS traces)
- [ ] Field telemetry ingestion pipeline
- [ ] Calibration Data Warehouse tables in PostgreSQL
- [ ] Confidence elevation workflow: modeled → learned on calibration data ingestion

### Data Provenance
- [ ] Attach `sourceType` and `confidence` to all CTM entities
- [ ] Provenance record API exposure (per-field confidence accessible to analytical tools)

### Frontend
- [ ] Dynamic multi-city switcher (Delhi, Mumbai, Kochi, Bengaluru, Chennai, Hyderabad, Ahmedabad)

---

## Planned: v0.7 — Prediction Engine and Operational Intelligence

- [ ] Prediction Engine consuming CTM schedule + calibration warehouse + historical distributions
- [ ] Live delay propagation model: delay at station n propagates to stops n+1…N
- [ ] Empirical dwell time and headway distributions replacing physics model defaults
- [ ] Estimated fleet-state digital twins (all modeled networks)
- [ ] Push notification service for service interruptions

---

## Planned: v0.8 — Network Analytics and Operator Intelligence

- [ ] Line efficiency metrics and transfer friction heatmaps
- [ ] Station crowding index and capacity utilization forecasting
- [ ] Network bottleneck identification by delay frequency and magnitude
- [ ] Operator analytics dashboard

---

## Planned: v0.9 — AI Interface Gateway

- [ ] Intelligence Gateway routing (classify: can TransitOS answer directly vs. requires LLM)
- [ ] AI capability registry (provider, fallback, purpose per capability)
- [ ] Sarvam AI speech recognition and TTS integration
- [ ] Telegram Voice Bot laboratory prototype

---

## Planned: v1.0 — Fare Engine and Booking Platform

- [ ] Fare Intelligence Engine (zone pricing, flat rates, transfer discounts, fare capping, pass optimization)
- [ ] Booking Engine with provider adapter pattern
- [ ] Payment Abstraction Layer (UPI, Card, NCMC, partner wallets)
- [ ] Standardized QR ticket representation and verification

---

## Planned: v1.1+ — Multi-Client Interfaces

- [ ] WhatsApp Business conversational ticketing interface
- [ ] Wear OS smartwatch client (next train ETAs, platform guidance, transfer steps)
- [ ] Proactive calendar-to-transit recommendations
