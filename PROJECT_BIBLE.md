# TransitOS — Engineering Reference and Governance Manual

This document records the architectural principles, data governance rules, engineering standards, and design decisions that govern the TransitOS codebase. It is the authoritative reference for understanding why the system is built the way it is, and the constraints that apply when extending it.

---

## Table of Contents

1. [Platform Architecture and Layers](#1-platform-architecture-and-layers)
2. [Core Design Principles](#2-core-design-principles)
3. [Data Governance Rules](#3-data-governance-rules)
4. [API Standards](#4-api-standards)
5. [Frontend Architecture Rules](#5-frontend-architecture-rules)
6. [Coding Standards](#6-coding-standards)
7. [Technology Stack](#7-technology-stack)
8. [Folder Structure](#8-folder-structure)
9. [Ingestion and Data Pipeline Architecture](#9-ingestion-and-data-pipeline-architecture)
10. [TDSE and Document Classification](#10-tdse-and-document-classification)
11. [Provenance and Confidence Framework](#11-provenance-and-confidence-framework)
12. [Realtime Levels and State Estimation](#12-realtime-levels-and-state-estimation)
13. [Calibration and Observation Platform](#13-calibration-and-observation-platform)

---

## 1. Platform Architecture and Layers

TransitOS is a four-layer computational platform. Each layer has strict ownership over its domain. Higher layers consume only the stable APIs of layers below — they do not reach into the internals of lower layers.

```
Layer 3 — Transit Experience Platform
  Passenger web/mobile app, operator analytics dashboard,
  developer APIs, AI voice interface, smartwatch/ambient interface.

Layer 2 — Transit Intelligence Platform
  Journey Intelligence Engine (graph routing, generalized cost scoring)
  State Estimation Engine (probabilistic vehicle position)
  Prediction Engine (delay propagation, ETA forecasting)
  Fare Intelligence Engine (zone pricing, transfer discounts)
  Booking Engine (provider adapter pattern)
  Analytics Engine (network efficiency, crowding index)

Layer 1 — Transit Data Platform
  Canonical Transit Model (CTM v1.0) — PostgreSQL + PostGIS
  GTFS Schedule (official or synthesized)
  GTFS-Realtime (official or estimated)
  Redis cache and pub/sub
  NestJS REST and WebSocket API gateway

Layer 0 — Transit Knowledge Platform
  Document classification (Categories A–I + X)
  Extraction pipelines
  Transit Data Synthesis Engine (TDSE)
  Provenance and confidence framework
  Knowledge graph
```

### The Golden Rule

> **TransitOS computes. External AI communicates.**

Every core user-facing feature — routing, interchange friction evaluation, ETA forecasting, fare calculation, corridor analysis — executes on deterministic, testable TransitOS backend engines. External AI providers (voice recognition, NLU, vision) are interface translation layers only. The platform must function completely if all external AI APIs are unavailable.

---

## 2. Core Design Principles

### P1 — Synthesis over Dependence

TransitOS does not depend on operators to publish GTFS. It consumes official feeds when available, synthesizes them from DPRs, timetables, GIS data, and rolling stock specifications when not. Every synthesized value is labelled with its source and confidence.

### P2 — Provenance is Mandatory

No data point is served without a provenance record: source document, derivation method, confidence score, and validation date. This applies equally to station coordinates (Category F), synthesized travel times (Category X), and learned dwell distributions (Category H).

### P3 — Honesty in Labels

TransitOS never presents estimated or synthesized data as official data. Every API response carries `source` (`official` | `enhanced` | `estimated`) and `confidence` (0.0–1.0) metadata. Passenger-facing interfaces clearly distinguish "Live" from "Estimated".

### P4 — Loose Coupling

Each engine and service operates independently. The routing engine works on abstract graph nodes and edges; it does not care whether the underlying data came from an official GTFS import or a TDSE synthesis. The booking engine interacts only with a generic provider interface; it is immune to changes in individual ticketing provider integrations.

### P5 — Strict Data Dependencies

Higher-layer modules verify the status and integrity of lower-layer data before operating. The routing engine validates that the graph is built and current before responding to journey queries. The prediction engine requires a calibration baseline before producing confidence-rated ETAs.

### P6 — Single Source of Truth

All shared configurations (TypeScript types, linter rules, UI design tokens) live in centralized packages. No duplication of configuration across workspaces.

### P7 — Calibration over Assumption

Default physics model assumptions (dwell times, section run times) are documented starting points, not permanent values. The Calibration and Observation Platform is designed to replace assumptions with empirically measured distributions. Sensitivity analysis surfaces which analytical outputs are most dependent on uncalibrated inputs.

---

## 3. Data Governance Rules

### Entity Design

- **UUID primary keys** on all entities. No integer auto-increments.
- **Soft deletion only**: `isActive` Boolean flag (default `true`) and nullable `deletedAt` timestamp. Records are never physically removed.
- **Audit timestamps**: `createdAt` and `updatedAt` (`Timestamptz`) on every table.
- **Unique codes**: Every entity code field (system code, line code, station code) must be unique within its scope.

### Indexing Rules

- Every foreign key must be indexed.
- Every entity `name` field must be indexed for fast text search.
- `StationSequence` has a unique composite index on `(lineId, sequence)`.
- All `geom` (PostGIS geometry) columns have a GIST spatial index.

### Spatial Data Rules

- Coordinates are stored in two forms: float columns (`latitude`, `longitude`) for ORM compatibility, and a PostGIS `geometry(Point, 4326)` column (`geom`) for spatial queries.
- A database trigger keeps `geom` synchronized with `latitude`/`longitude` on every update.
- All distance calculations use geodesic distance (PostGIS `geography` type or `ST_DistanceSphere`). Planar Euclidean distance is not used for any transport-planning calculation.

### Schema Stability

CTM v1.0 schema is frozen. No breaking changes (column removal, type change, constraint removal) without a migration and a version bump. Additive changes (new nullable columns, new tables) are allowed without a version bump provided they do not break existing queries.

### Data Quality Trust Tiers

| Tier | Source Type | Confidence Range |
|:---|:---|:---|
| **A — Official** | Government GTFS, operator GIS | 95–100% |
| **B — Operator documents** | DPRs, timetable PDFs, official websites | 85–95% |
| **C — OSM** | OpenStreetMap geometry | 80–90% |
| **D — Community GTFS** | Verified community-maintained feeds | 80–90% |
| **E — Modeled / Estimated** | Physics model, TDSE synthesis | 50–80% |
| **X — TransitOS Synthesized** | TDSE output, learned distributions | 60–95% (varies) |

---

## 4. API Standards

- **RESTful naming**: `GET /api/v1/stations`, `GET /api/v1/lines/:id/trips`.
- **Consistent response envelope**: All endpoints use a consistent JSON format with `version`, `generatedAt`, and the payload.
- **URL versioning**: Production routes follow `/api/v1/...`. Breaking changes require a new version prefix.
- **Strict DTO contracts**: Input validation uses NestJS class-validator decorators. Output types are defined as TypeScript interfaces; raw Prisma models never leak into API responses.
- **Automatic normalization**: Data quality issues (missing GTFS route colors, null coordinates) are normalized at the service layer before reaching the API response. Clients receive clean, safe data.
- **Latency target**: Core REST endpoints must respond in under 100 ms from a warm cache. Routing requests (no cache) target under 500 ms.

### WebSocket

Real-time vehicle position updates are pushed via WebSocket. The client subscribes to a system-scoped channel: `ws://api/live/systems/:code`. The backend emits position updates from the Redis pub/sub pipeline.

---

## 5. Frontend Architecture Rules

The frontend enforces a strict Container-Presenter architecture. These rules are permanent and must not be violated when adding new features.

1. **Components never fetch data.** Presentational components under `src/components/` receive data exclusively via `props`. They render; they do not call APIs.
2. **Components never know backend URLs.** All API endpoint addresses live exclusively inside `services/api/`. Components import domain models, not raw API URLs.
3. **Hooks own state.** Custom hooks expose a standardized interface: `{ data, loading, error, refresh }`. State management logic lives in hooks, not components.
4. **Services own API contracts.** Raw backend DTOs never leak into UI views. Adapter functions in `models/` convert `BackendDTO → DomainModel`.
5. **Containers compose hooks into UI.** Container components orchestrate context, hooks, and views. They handle loading states, error boundaries, and user action handlers.
6. **Backend must work before UI polish.** Every new feature requires a working backend endpoint and data flow before visual refinement work begins.
7. **Design system changes must not modify business logic.** CSS, token, and visual changes are isolated to component and design files. Logic changes require separate commits.

---

## 6. Coding Standards

- **No `any`.** Every function parameter and return type must be explicitly typed in TypeScript. Use `unknown` with type guards where the type is genuinely uncertain.
- **`async/await` over raw Promises.** All asynchronous calls use `async/await`. Every async call is wrapped in structured error handling (`try/catch`).
- **Kebab-case file names.** `station-detail.tsx`, `graph-builder.service.ts`.
- **Inline documentation for complex algorithms.** Every non-trivial algorithmic function has a docstring describing the algorithm, its inputs, outputs, time complexity, and any known edge cases or limitations.
- **Tests for all routing logic.** The 63-test suite covers candidate generation, Pareto filtering, interchange friction computation, feeder catchment boundary conditions, and barrier-aware routing. New routing logic must include tests.
- **No hardcoded fake data.** All line geometries, station names, travel times, and colors are derived from CTM data. No static arrays of made-up coordinates.

---

## 7. Technology Stack

| Component | Technology | Version |
|:---|:---|:---|
| Backend framework | NestJS | 11 |
| Language | TypeScript | 5.7 |
| Runtime | Node.js | 22 |
| ORM | Prisma | 6.2 |
| Relational database | PostgreSQL | 16 |
| Spatial extension | PostGIS | 3.x |
| Cache / pub-sub | Redis | 7.2 |
| Frontend framework | Next.js (App Router, Turbopack) | 16 |
| Map rendering | MapLibre GL JS | — |
| Animation | Framer Motion | — |
| Test framework | Jest | — |
| Monorepo tooling | npm workspaces | — |

---

## 8. Folder Structure

```
MetroRadar/
├── apps/
│   ├── backend/           # NestJS API server
│   │   └── src/
│   │       ├── config/    # Environment validation
│   │       ├── database/  # PrismaClient wrapper
│   │       ├── redis/     # RedisService
│   │       └── modules/
│   │           ├── gis/       # GeoJSON layers, spatial search, digital twin
│   │           ├── ingestion/ # GTFS parser, normalizers, validators
│   │           ├── journey/   # Graph builder, routing engine, scoring
│   │           └── realtime/  # GTFS-RT feed poller, protobuf parser
│   └── frontend/          # Next.js web application
│       └── src/
│           ├── app/           # Next.js App Router pages
│           ├── components/    # Presentational components (no data fetching)
│           ├── containers/    # Stateful business orchestrators
│           ├── contexts/      # React contexts
│           ├── hooks/         # Data hooks
│           ├── models/        # Domain models and DTO adapters
│           └── services/api/  # HTTP API clients
├── datasets/              # Real operator datasets and data provenance records
│   ├── {city}/
│   │   ├── raw/           # Original unmodified downloads
│   │   ├── processed/     # Validation reports
│   │   ├── metadata.json  # Machine-readable provenance
│   │   └── source.md      # Acquisition instructions
│   └── reports/           # Certification audit reports per operator
├── design/                # Design system tokens and component contracts
├── tools/                 # CLI utilities (quality scorer, certification pipeline)
├── prisma/                # Database schema and migrations
├── docker/                # Local dev and production container configurations
└── packages/              # Shared TypeScript configurations and types
```

---

## 9. Ingestion and Data Pipeline Architecture

### Dual-Pipeline Strategy

Static (planned network) and realtime (live state) data are handled by completely independent pipelines.

**Static Ingestion Pipeline:**
- Source: Official GTFS feeds (Trust Tier A/B), community GTFS (Tier B/C), or TDSE synthesis (Tier X)
- Validated against GTFS spec, bounding boxes, checksums, and referential integrity constraints
- Imported into PostgreSQL inside a transaction-safe session with rollback on failure
- Stored as the permanent database source of truth

**Realtime Overlay Engine:**
- Source: Official GTFS-RT Protocol Buffers (Level 1/2) or State Estimation Engine (Level 3)
- Polled on a configurable interval, decoded from protobuf, cached in Redis with 30-second TTL
- Pushed to clients via WebSocket
- **Never persisted in PostgreSQL.** Realtime state is ephemeral. The database stores only the static schedule.

### GTFS Ingestion Session Tracking

Every import run creates an `IngestionSession` record with:
- `sessionId` (UUID)
- `status`: `RUNNING` | `SUCCESS` | `FAILED`
- `dryRun`: boolean
- `counts` per entity type (processed, inserted, updated, skipped)
- `warnings` and `errors` arrays
- Duration in milliseconds

This makes every import auditable and reproducible. A `dryRun=true` request validates and reports counts without committing changes.

---

## 10. TDSE and Document Classification

See [GTFS_SYNTHESIS.md](./GTFS_SYNTHESIS.md) for the full TDSE specification.

Summary: every document ingested by TransitOS is classified into one of ten categories (A–I + X). The category determines the extraction pipeline applied, the CTM fields it populates, and which downstream engines it feeds.

| Category | Name | Primary CTM Output |
|:---|:---|:---|
| A | Network Topology | Line, Station, StationSequence, inter-station distances |
| B | Station Infrastructure | Level, Platform, Entrance, transfer time estimates |
| C | Operations | GTFS trips.txt, stop_times.txt, calendar.txt |
| D | Rolling Stock | Physics model parameters (max speed, acceleration, braking) |
| E | Signalling | Headway constraints, speed restrictions, delay propagation model |
| F | GIS & Spatial | GTFS stops.txt, shapes.txt, PostGIS geometry columns |
| G | Commercial | GTFS fare files, station amenity records |
| H | Historical Operations | ML training data, dwell/speed calibration baselines |
| I | Live Observations | State Estimation anchoring, confidence elevation |
| X | TransitOS Synthesized | Generated GTFS, CTM records, ETA predictions (IP) |

---

## 11. Provenance and Confidence Framework

```typescript
interface ProvenanceRecord {
  field: string;         // e.g. "travelTime", "firstTrain"
  value: unknown;
  source: string;        // Document identifier
  category: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'X';
  method: 'official' | 'extracted' | 'modeled' | 'learned' | 'estimated';
  confidence: number;    // 0.0–1.0
  lastValidated: string;
  version: string;
  notes?: string;
}
```

Confidence is translated to passenger-facing labels:

| Confidence | Label |
|:---|:---|
| ≥ 95% | Live |
| 80–94% | Approx. |
| 60–79% | Estimated |
| < 60% | Scheduled |

For analytical use (corridor assessment, scenario comparison), the raw confidence values are available in the API response and can be used to filter which results to include in sensitivity analysis.

---

## 12. Realtime Levels and State Estimation

| Level | Label | Source | Confidence |
|:---|:---|:---|:---|
| 1 | `official` | Operator GTFS-Realtime | 95–99% |
| 2 | `enhanced` | Official feed + TransitOS validation | 85–99% |
| 3 | `estimated` | State Estimation Engine | 60–90% |

The State Estimation Engine (SEE) is the mechanism behind Level 3. It operates on:
- Synthesized GTFS schedule from TDSE (planned departure times)
- Learned dwell time distributions from Category H (historical data)
- Any available Category I observations (GPS traces, crowdsource) for anchoring

SEE output is clearly labelled `source: "estimated"`. It is not presented to users or analysts as a live feed.

---

## 13. Calibration and Observation Platform

The Calibration and Observation Platform is the empirical ground-truth engine. It captures high-fidelity real-world transit observations to continuously calibrate synthesized assumptions.

```
Observation Sources
  │
  ├── Field instruments (GPS-equipped devices, timestamped station entry/exit)
  ├── Phone GPS traces
  └── Official GTFS-Realtime (when available)
  │
  ▼
Observation Pipeline
  │
  ▼
Calibration Warehouse (PostgreSQL)
  │
  ├── Station-to-station run time distributions (median, P90)
  ├── Platform dwell time distributions per station
  ├── Interchange walking transfer time distributions
  └── Observed headway and dispatch frequency distributions
  │
  ▼
Prediction Engine / State Estimation Engine
```

**Architectural constraint:** Field observation instruments are calibration tools used during data collection campaigns — not production runtime dependencies. The Prediction Engine queries the Calibration Warehouse. Disconnecting any field instrument leaves the platform fully operational; it simply uses the most recently stored calibration baseline.

**Empirical calibration loop example:**

1. Physics model (TDSE) estimates section A→B = 150 s (confidence 0.70, `method: "modeled"`)
2. Field campaign records N=20 timed trips: 148 s, 157 s, 152 s, 161 s, 149 s…
3. System updates to median 153 s, P90 161 s, confidence 0.91 (`method: "learned"`)
4. All downstream routing and ETA predictions now use the calibrated value, clearly labelled with its source
