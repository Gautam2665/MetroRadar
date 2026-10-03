# TransitOS Development Backlog & Milestone Tracker

Follow this unified Sprint & Version checklist to build **TransitOS** as a modular set of platform blocks.

---

## 🚦 Unified Sprint & Version Mapping

| Sprint / Version | Scope / Milestone Name | Status |
| :--- | :--- | :---: |
| **v0.1** | **Infra & Monorepo Foundation** | ✅ Complete |
| **v0.2** | **Spatial Database & CTM Schema** | ✅ Complete |
| **v0.3** | **GTFS Static Ingestion Engine** | ✅ Complete |
| **v0.4** | **Dataset Validation CLI & City Imports** | ✅ Complete |
| **v0.4.5** | **GIS Map Engine & Digital Twin Inspector** | ✅ Complete |
| **v0.5** | **Journey Intelligence Pathfinder (Dijkstra Engine)** | ✅ Complete |
| **v0.5.1** | **Realtime GTFS-RT Ingestion & Redis Cache Pipeline** | ✅ Complete |
| **v0.5.5** | **National GTFS Certification & CTM v1.0 Schema Freeze** | ✅ Complete |
| **v0.6** | **Passenger Experience & World-Class Benchmark UI** | ✅ Complete |
| **v0.6.5** | **National Transit Expansion & Calibration Baseline** | 🚧 **Active / Next** |
| **v0.7** | **Prediction Engine & Operational Intelligence** | ⏳ Planned |
| **v0.8** | **Analytics & Operator Intelligence** | ⏳ Planned |
| **v0.9** | **Intelligence Gateway & Voice Laboratory (Sarvam AI)** | ⏳ Planned |
| **v1.0** | **Commerce & Booking Platform (ONDC Integration)** | ⏳ Planned |
| **v1.1+** | **Ambient Computing & Advanced Interfaces (Wear OS, WhatsApp)** | ⏳ Planned |

---

## 🧱 Completed Milestones (Authoritative Record)

### ✅ Sprint 1 - v0.1: Monorepo & Infrastructure Foundation
- [x] Configure monorepo environments (`npm` workspaces, root `package.json`).
- [x] Create shared tooling configurations (`packages/config` containing eslint, tsconfig).
- [x] Build local developer container environments in `docker/dev`.
- [x] Establish NestJS backend framework (`apps/backend`) and Next.js frontend framework (`apps/frontend`).

### ✅ Sprint 2 - v0.2: Spatial Database & Canonical Transit Model
- [x] Enable PostGIS extension (`CREATE EXTENSION IF NOT EXISTS postgis`) and verify spatial queries (`ST_DistanceSphere`).
- [x] Write Prisma CTM schemas (systems, stations, lines, trips, stop_times, calendars, shapes, entrances, levels, platforms).
- [x] Create initial database seeding scripts (`prisma/seed.ts`).

### ✅ Sprint 3 - v0.3: GTFS Static Ingestion Engine
- [x] Implement static GTFS schedule importer in `apps/backend/src/modules/ingestion`.
- [x] Build zip feed archive validator (`gtfs-archive.validator.ts`) and station normalizer.
- [x] Implement database transaction locks for safe feed ingestion session tracking (`IngestionSession`).

### ✅ Sprint 3.5 - v0.4: Dataset Validation CLI & City Imports
- [x] Build GTFS dataset validation CLI to parse, test, and import real-world operator feeds.
- [x] Validate and ingest official GTFS feeds for **Kochi Metro (KMRL)** and **Delhi Metro (DMRC)**.

### ✅ Sprint 4 - v0.4.5: GIS Map Engine & Digital Twin Inspector
- [x] Integrated MapLibre GL JS vector map engine with CartoDB dark-matter styling.
- [x] Created `DigitalTwinService` and `StationsController` (`GET /stations/:id/digital-twin`).
- [x] Created interactive visual station inspector drawer with serving line badges, physical levels, entrances, and amenity tags.

### ✅ Sprint 5 - v0.5: Journey Intelligence Engine
- [x] Built graph-builder service (`GraphBuilderService`) supporting multi-line transfers and interchange walk connections.
- [x] Developed Dijkstra routing engine (`RoutingService`, `ScoringService`) with configurable walking weights (`0.8`) and transfer penalties (`180s`).
- [x] Fixed station interchange walking edges (Dhaula Kuan ➔ South Campus travelator connection).
- [x] Exposed REST endpoint `GET /journeys?from=:originId&to=:destId` returning GeoJSON feature collections and leg timelines.

### ✅ Sprint 5.1 - v0.5.1: Realtime GTFS-RT Telemetry Infrastructure
- [x] Implemented `FeedPollerService` background scheduler (asynchronously polling DMRC realtime feed).
- [x] Implemented `GtfsRtParserService` decoding binary Protocol Buffer `.pb` streams into normalized vehicles.
- [x] Stored telemetry in Redis with automatic expiration to guarantee sub-5ms client reads.
- [x] Exposed `GET /realtime/vehicles` with fallback serving cached data (`isStale: true`) during feed interruptions.

### ✅ Sprint 5.5 - v0.5.5: National Transit Data Certification & CTM v1.0 Schema Freeze
- [x] Built 5-stage lifecycle governance pipeline (`DISCOVERED` ➔ `ACQUIRED` ➔ `VALIDATED` ➔ `CERTIFIED` ➔ `IMPORTED`).
- [x] Established Trust Tier system (`OFFICIAL` / Tier A, `COMMUNITY` / Tier B, `SYNTHESIZED` / Tier X).
- [x] Implemented pure static 100-pt GTFS Quality Scorer (`tools/quality-scorer.ts`) & National Certification CLI (`tools/certify-national-gtfs.ts`).
- [x] Certified and imported 6 Indian metro networks into PostgreSQL (Delhi, Kochi, Hyderabad, Bengaluru, Chennai, Ahmedabad).
- [x] Generated Master National Dashboard (`INDIA_TRANSIT_STATUS.md`) and individual audit reports (`CERTIFICATION_*.md`).
- [x] Officially declared **Canonical Transit Model (CTM v1.0) PostgreSQL Database Schema FROZEN**.

### ✅ Sprint 6 - v0.6: Passenger Experience & World-Class Benchmark UI
- [x] Rebuilt frontend with Container-Presenter architecture, standardized domain models, and API client layers.
- [x] Implemented fluid spring physics motion (`framer-motion`), glassmorphic elevation, and quality score badges.
- [x] Built interactive station inspector drawer with live platform ETAs, entrances, and accessibility metadata.
- [x] Implemented human-friendly step-by-step transit directions with clean line badges, towards headsigns, and walking interchange cards.

### ✅ Sprint 6.2 - v0.6.2: Journey Intelligence — Candidate Generation & Deterministic Evaluation
- [x] Refactored Journey Engine from single-route selection into **candidate generation and deterministic evaluation**.
- [x] Implemented **Yen's K-Shortest Loopless Paths** algorithm generating up to $K=5$ distinct candidate routes.
- [x] Built two-stage filtering pipeline: **Feasibility Filter** (removes loops, invalid durations, $>6$ transfers) and **Dominance Filter** (removes strictly worse options across duration, transfers, walking).
- [x] Solved Yamuna Bank ↔ Dwarka Sector 21: direct Blue Line is preserved alongside the 2-transfer path; neither dominates the other.
- [x] Solved NMIA ↔ Malad: preserved the high-speed Airport Express multi-transfer route without arbitrary transfer penalty hacks.
- [x] Established explicit **Waiting Time Model** with `TimeEstimate` hierarchy (`source: 'estimated' | 'schedule' | 'live'`) separating initial platform wait from interchange wait.
- [x] Structured `RouteCandidate` schema with boolean machine-readable attribute flags (`fastest`, `fewestTransfers`, `direct`, `leastWalking`, `accessibilityFriendly`) ready for future Intelligence Gateway Intent JSON re-ranking without re-routing.
- [x] Updated Frontend UI to display multiple candidate cards with attribute badges, tradeoff deltas vs rank 1, and per-candidate GeoJSON switching on the map.

### ✅ Sprint 6.3 - v0.6.3: Stitch Redesign & Journey Simulation Experience
- [x] Integrated Stitch "Multi-Candidate Train Sim & Smart Station Cards" design system across Journey Planner (`/plan`).
- [x] Multi-candidate overview mode: all $K$ route geometries render concurrently on the map, with candidate cards deselected by default.
- [x] Single-route selection mode: selecting a route focuses that candidate's trajectory, dims background network, and initiates route-focused train simulation.
- [x] Presentation-only journey simulation: single train marker glides continuously along selected route geometry with dynamic heading and line-color transitions without asserting fake GTFS-RT telemetry.
- [x] Unified Transfer Beacon: eliminated duplicate transfer dots by synchronizing canvas layer visibility with animated gold pulsating HTML transfer beacon (`TRANSFER` badge).
- [x] Interactive Smart Station Card: station hover cards render stably above cursor with zero 60fps flickering or DOM churn.
- [x] Delhi Metro Grey Line fidelity: authentic `#808080` color rendering across GIS endpoints (`/map/lines`, `/map/stations`), pathfinder legs, and station badges with cache invalidation (`v5`).
- [x] Text marquee scrolling: implemented `ScrollingText` for long station names to prevent layout breaking on constrained cards.

---

## 🏃 Active & Upcoming Milestones

### 🚧 Sprint v0.6.5: National Transit Data Expansion & Calibration Baseline (ACTIVE / NEXT)
- [ ] Model and ingest **Mumbai Metro CTM baseline**:
  - Line 1 (Blue): Versova ↔ Andheri ↔ Ghatkopar
  - Line 2A (Yellow): Dahisar East ↔ Andheri West (DN Nagar)
  - Line 7 (Red): Dahisar East ↔ Gundavali (Andheri East)
  - Line 3 (Aqua): Underground Aarey JVLR ↔ BKC ↔ Cuffe Parade
  - Suburban Railway interchange walk paths (Ghatkopar, Andheri, Dadar)
- [ ] Ingest and model remaining uncovered networks (Pune, Nagpur).
- [ ] Build **Calibration & Observation Platform schema**:
  - Observation data models (station runtimes, dwell times, transfer walk times, GPS traces, actual headways).
  - Field telemetry ingestion pipeline (Raspberry Pi / phone GPS / official RT).
  - Calibration Data Warehouse in PostgreSQL.
- [ ] Attach first-class **Provenance & Confidence metadata** across all CTM entities (`sourceType: "OFFICIAL" | "COMMUNITY" | "SYNTHESIZED" | "OBSERVED"`, `confidence: 0.0–1.0`).
- [ ] Enable dynamic multi-city switching across Delhi, Mumbai, Kochi, Bengaluru, Chennai, Hyderabad, Ahmedabad.

---

### ⏳ Sprint v0.7: Prediction Engine & Operational Intelligence
- [ ] Build Prediction Engine operating on the Unified CTM (Schedule + Historical Warehouse + Calibration data).
- [ ] Implement live delay propagation modeling and timetable deviation forecasts.
- [ ] Learn empirical dwell time and headway distributions from field observations.
- [ ] Construct scheduled and estimated full-fleet digital twins.
- [ ] Proactive push notification service for service interruptions and passenger saved routes.

---

### ⏳ Sprint v0.8: Analytics & Operator Intelligence
- [ ] Network efficiency, bottleneck heatmaps, and transfer friction analysis.
- [ ] Station crowding index and capacity utilization forecasting.
- [ ] Operator intelligence dashboard.

---

### ⏳ Sprint v0.9: Intelligence Gateway & Voice Laboratory
- [ ] Implement vendor-independent AI Gateway (`TransitOS computes, External AI communicates`).
- [ ] Integrate **Sarvam AI** for Indian regional voice recognition and speech/text translation (Hindi, Marathi, etc.).
- [ ] Build **Telegram Voice Bot laboratory prototype** for frictionless conversational journey planning.

---

### ⏳ Sprint v1.0: Commerce & Booking Platform (ONDC Integration)
- [ ] Build `FareService` calculating multi-tier zone pricing, flat rates, and transfer discounts.
- [ ] Build `BookingEngine` (`bookJourney()`, `cancelJourney()`, `refundTicket()`).
- [ ] Implement **ONDC Buyer Application Adapter** for metro ticketing and trip passes.
- [ ] Build Payment Abstraction Layer (UPI, Card, NCMC, Partner Wallets) without holding user funds.

---

### ⏳ Sprint v1.1+: Ambient Computing & Advanced Interfaces
- [ ] Build **WhatsApp Business Interface** for conversational ticketing.
- [ ] Build **Wear OS Smartwatch Client** (next train ETAs, platform guidance, transfer steps, QR ticket shortcuts).
- [ ] Implement proactive calendar-to-transit recommendations with voice authorization confirmation.
