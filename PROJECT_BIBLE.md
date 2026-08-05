# MetroRadar Project Bible
### Permanent Reference Document

---

## Table of Chapters
*   [Chapter 1: Project Vision](#chapter-1-project-vision)
*   [Chapter 2: Architecture](#chapter-2-architecture)
*   [Chapter 3: Technology Stack](#chapter-3-technology-stack)
*   [Chapter 4: Folder Structure](#chapter-4-folder-structure)
*   [Chapter 5: Database Rules](#chapter-5-database-rules)
*   [Chapter 6: API Standards](#chapter-6-api-standards)
*   [Chapter 7: Coding Standards](#chapter-7-coding-standards)
*   [Chapter 8: UI Design System](#chapter-8-ui-design-system)
*   [Chapter 9: AI & Intelligence Gateway](#chapter-9-ai--intelligence-gateway)
*   [Chapter 10: Development Roadmap](#chapter-10-development-roadmap)
*   [Chapter 11: Ingestion & Data Architecture](#chapter-11-ingestion--data-architecture)
*   [Chapter 12: Transit Data Synthesis Engine (TDSE)](#chapter-12-transit-data-synthesis-engine-tdse)
*   [Chapter 13: Document Classification System](#chapter-13-document-classification-system)
*   [Chapter 14: Data Provenance & Confidence Scoring](#chapter-14-data-provenance--confidence-scoring)
*   [Chapter 15: Realtime Levels & State Estimation](#chapter-15-realtime-levels--state-estimation)

---

## Chapter 1: Project Vision

TransitOS (formerly MetroRadar) is an **Urban Intelligence Platform** and **India's GTFS Infrastructure Platform** designed to build a complete digital twin of every Indian city transit network. Instead of depending on operators to publish GTFS, TransitOS synthesizes it. The platform is divided into four vertical layers:

```
                         TransitOS Platform
┌─────────────────────────────────────────────────────────┐
│              Layer 3: Transit Experience                │  <- Passenger App, Operator Dashboard, Watch, AR
├─────────────────────────────────────────────────────────┤
│             Layer 2: Transit Intelligence               │  <- Journey, State Estimation, Predictions, Fares
├─────────────────────────────────────────────────────────┤
│               Layer 1: Transit Data                     │  <- GTFS, CTM, PostGIS Database, APIs
├─────────────────────────────────────────────────────────┤
│             Layer 0: Transit Knowledge                  │  <- TDSE, Document Classification, Provenance
└─────────────────────────────────────────────────────────┘
```

### The Four Platform Layers
0. **Layer 0: Transit Knowledge Platform**: Owns document ingestion, classification (A–I + X), extraction pipelines, the Transit Data Synthesis Engine (TDSE), provenance tracking, confidence scoring, and the Knowledge Graph. This is where raw operator documents become structured transit data.
1. **Layer 1: Transit Data Platform**: Owns GTFS Schedule (generated or imported), GTFS-Realtime (official or estimated), CTM mapping, data validation, database persistence (PostgreSQL/PostGIS), and public REST/WebSocket APIs.
2. **Layer 2: Transit Intelligence Platform**: Owns journey pathfinding engines, the State Estimation Engine, travel-time delay predictions, fare calculations (including transfer discounts and passes), notifications orchestration, booking abstraction, and platform analytics.
3. **Layer 3: Transit Experience Platform**: Owns the end-user interfaces including the passenger web/mobile app, transit operator dashboards, AI assistants, smartwatch integrations, and future ambient interfaces (AR/calendar).

### The Six Data Maturity Layers
Within the platform layers, TransitOS structures transit features into six progressive data maturity layers built step-by-step:
1. **Transit Layer**: Train schedules, planned routes, track geometries, and real-time feeds.
2. **Station Layer**: Detailed station directories, platform configurations, access paths, and facility metadata.
3. **Commercial Layer**: Station ads bidding, localized vendor details, retail promocodes, and terminal services.
4. **Passenger Layer**: Commuter trip histories, bookmark preferences, and route contexts.
5. **AI Layer**: Real-time delay propagation modeling, conversational helpers, and context-aware suggestions.
6. **Analytics Layer**: Crowd density indices, line efficiency statistics, and performance dashboards.

---

## Chapter 2: Architecture

TransitOS follows a **modular LEGO architecture**. The platform is constructed from independent building blocks (engines, gateways, and adapters) that plug into one another.

### Design Principles
- **Loose Coupling**: Each block operates independently. For example, the routing engine operates on generic graph nodes and does not care about the underlying database engine.
- **Strict Data Dependencies**: High-level modules (like AI and routing) cannot run without verifying the status and integrity of lower-level blocks (GTFS ingestion, static stations).
- **Single Source of Truth**: All shared configurations (TypeScript types, linter standards, and UI variables) live in centralized packages.
- **The Golden Rule (TransitOS Computes, AI Communicates)**: Every core user feature must function deterministically even if all external LLMs disappear tomorrow. AI is an interface translation layer; computations (such as routing, fare calculations, and delay forecasts) are strictly executed by TransitOS core engines, not by LLMs.
- **Stable Engine APIs**: Every engine exposes capabilities through stable APIs. Core engines never call UI components, and UI components never implement business logic.
- **Provider Agnosticism (Adapter Pattern)**: Third-party ticketing providers (e.g., ONDC, operator APIs) and payment systems are isolated behind standard Adapter Layers. The core engines (Booking Engine, Payment Intelligence Engine) interact only with generic interfaces, keeping the core platform immune to external integration changes.
- **Synthesis over Dependence**: TransitOS does not depend on official GTFS or official GTFS-Realtime. It consumes them when available, synthesizes them when absent, and clearly identifies the provenance and confidence of every dataset it serves.
- **Provenance is Mandatory**: TransitOS never serves a data point without knowing where it came from, how it was derived, and how confident the system is in its accuracy. Every generated field carries a `ProvenanceRecord`.
- **Honesty in Labels**: TransitOS never presents synthesized data as official data. Every API response carries `source` (`official` | `enhanced` | `estimated`) and `confidence` metadata. The passenger-facing surface clearly distinguishes `Live` from `Estimated`.

---

## Chapter 3: Technology Stack

To support high performance, real-time updates, and robust scalability, MetroRadar proposes:

- **Frontend Core**: Vite + React / Next.js (TypeScript) using custom CSS variables (Vanilla CSS).
- **Backend API**: Node.js (TypeScript) + Fastify or Express for high-performance WebSocket/REST APIs.
- **Ingestion Daemon**: Node.js worker threads or Go routines for consuming real-time feeds.
- **Database Engine**: PostgreSQL + PostGIS (for geospatial features) + Redis (high-performance caching and messaging broker).
- **Development Tooling**: Turbo / npm workspaces, ESLint, Prettier, TypeScript, Docker.

---

## Chapter 4: Folder Structure

The project directory is structured to enforce the monorepo architecture:

```
MetroRadar/
├── apps/
│   ├── web/            # Next.js / Vite web application
│   ├── api/            # REST and WebSocket server
│   └── ingest/         # Real-time data pipeline worker
├── packages/
│   ├── ui/             # Shared component library and styles
│   ├── types/          # Shared TypeScript type definitions
│   └── config/         # Shared configurations (tsconfig, eslint)
├── database/
│   ├── migrations/     # SQL migration files
│   └── schema.sql      # Global database schema definition
└── docker/
    ├── dev/            # Local developer docker configurations
    └── prod/           # Production container deployment configurations
```

---

## Chapter 5: Database Rules

All database schemas must follow strict normalization and optimization guidelines, particularly for spatial data and relationships:

### Core Database Architecture
- **Global Identifiers**: Every database entity uses a `UUID` primary key (`@id @db.Uuid`). No integer auto-increments.
- **Audit Fields**: Every table includes `createdAt` and `updatedAt` timestamps in timezone format (`DateTime @db.Timestamptz`).
- **Soft Deletion**: Records must never be hard-deleted. Instead, use an `isActive` Boolean flag (default `true`) and a nullable `deletedAt` timestamp (`DateTime? @db.Timestamptz`).
- **Unique Codes**: Every entity code field (e.g. `code` for Systems, Lines, Stations) must be unique.
- **Indices Guidelines**:
  - Every Foreign Key (FK) must be indexed.
  - Every Entity `name` must be indexed to support fast textual lookups.
  - `StationSequence` uses a unique composite index on `(lineId, sequence)`.

### PostGIS Geospatial Integration Strategy
Geospatial fields (`geom`) are stored as native PostGIS geometries using the `geometry(Point, 4326)` format. To resolve the limitations of writing binary spatial objects via Prisma Client:
1. **Latitude/Longitude**: Standard floats (`latitude` and `longitude`) are exposed in the Prisma schema for simple reading and seeding.
2. **Unsupported Field**: The geometry column is defined in Prisma using `geom Unsupported("geometry")?`.
3. **Spatial Indexing**: A `GIST` index is attached to the `geom` column inside PostgreSQL to accelerate geographic radius searches.
4. **Trigger-Based Sync**: The database implements an automatic trigger function that calculates and synchronizes the binary `geom` column using `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` whenever latitude or longitude are modified.

---

## Chapter 6: API Standards

APIs must remain standardized, fast, and secure:

- **Endpoint Naming**: Use RESTful conventions (e.g., `GET /api/v1/stations`, `GET /api/v1/lines/:id/trips`).
- **Response Format**: All API responses must follow a consistent JSON format:
  ```json
  {
    "success": true,
    "data": {},
    "error": null
  }
  ```
- **Real-Time Data**: Live train updates must be pushed via WebSockets under sub-protocols matching specific routes (e.g., `ws://api.metroradar.com/live/lines/:id`).
- **Latency Target**: Core REST endpoints must respond in under 100ms.

---

## Chapter 7: Coding Standards

- **TypeScript Standard**: Avoid `any` at all costs. Every function parameter and return type must be explicitly typed.
- **Asynchronous Code**: Prefer `async/await` syntax over raw Promises. All async calls must be wrapped in structured error handling (`try/catch`).
- **File Naming**: Use lowercase kebab-case for files (e.g., `station-detail.tsx`, `database-client.ts`).
- **Documentation**: Write inline documentation for complex algorithms and exports. Keep docstrings clean and accurate.

---

## Chapter 8: UI Design System

MetroRadar prioritizes a premium, beautiful aesthetic:

- **Typography**: Modern sans-serif (e.g., Outfit or Inter) loaded from Google Fonts.
- **Themes**: Default deep dark mode utilizing high-contrast accents (e.g., neon blue, emerald, amber for status colors).
- **Design Tokens**: Standardize colors using HSL variables for smooth theme blending and glassmorphic overlays (`backdrop-filter: blur()`).
- **Micro-Animations**: Hover states, transition animations, and page changes must use smooth durations (150ms-300ms) with `cubic-bezier` easing.

### TransitOS Frontend Rules (Permanent Architecture)
1. **Components never fetch data** — Components under `src/components/` receive data strictly via `props`.
2. **Components never know backend URLs** — API endpoints live exclusively inside `services/api/`.
3. **Hooks own state** — Custom hooks expose standardized `{ data, loading, error, refresh }`.
4. **Services own API contracts** — Raw backend DTOs never leak into UI views.
5. **Containers compose hooks into UI** — Containers orchestrate context, hooks, and presentational views.
6. **Backend DTOs never leak into UI** — Adapters convert `BackendDTO` $\rightarrow$ `DomainModel`.
7. **Every backend feature must function before visual polish**.
8. **Design system changes must never modify business logic**.

---

## Chapter 9: AI & Intelligence Gateway

AI components are deferred until core database and logic engines are stable, adhering to a **Data-First** architecture. We do not use LLMs as computation engines; instead, they serve as natural language interfaces on top of our deterministic APIs.

### The Intelligence Gateway
The **Intelligence Gateway** serves as the single point of entry for user queries. Instead of routing everything to expensive LLMs, the gateway classifies the query to decide if it can be answered directly by our high-performance APIs or if an LLM is required.

```
                               User Request
                                    │
                                    ▼
                          Intelligence Gateway
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
[Can TransitOS answer directly?]                    [Natural language / Voice]
           │                                                 │
          YES                                                NO
           │                                                 │
           ▼                                                 ▼
  Query Journey/Fare Engines                       Select Provider via Registry
   (Response in <50ms)                               (Sarvam, Gemini, OpenAI)
           │                                                 │
           └────────────────────────┬────────────────────────┘
                                    ▼
                           Formatted Response
```

### AI Capability Registry
Rather than hardcoding LLM clients inside individual services, TransitOS uses a registry that specifies the preferred LLM provider and fallback for each capability.

| Capability | Default Provider | Fallback Provider | Purpose / Rationale |
| :--- | :--- | :--- | :--- |
| **Speech Recognition** | Sarvam AI | Whisper / Other | Translates voice commands with Indian accents and local languages. |
| **Translation** | Sarvam AI | Gemini | Multi-lingual support for regional queries. |
| **Voice Output** | Sarvam AI | Default TTS | Synthesizes response speech for smartwatch and voice feedback. |
| **Reasoning & Synthesis** | OpenAI | Gemini | Explains complex multi-criteria passenger trip selections. |
| **Vision & Image QA** | Gemini | OpenAI | Reads station signage, entrances, physical schedules. |
| **OCR Processing** | Native OCR | Gemini | Digitizes operator timetables, static maps, tickets. |
| **Summarization** | OpenAI | Gemini | Summarizes heavy operator reports, administrative analytics. |

---

## Chapter 10: Development Roadmap

Development is organized into phased milestones that build capabilities from the data layer up to experience and intelligence features.

- **v0.5 — Journey Intelligence**: Initialize core transit schemas, build the static GTFS parser, and implement basic offline pathfinding routing (Dijkstra/A*).
- **v0.5.1 — Realtime Infrastructure**: Establish GTFS-RT connectors, build the active vehicle polling engine, integrate Redis caching for real-time telemetry, and set up WebSocket broadcast servers.
- **v0.6 — Passenger Experience (UI)**: Initialize Next.js frontend workspaces, integrate map layers (Leaflet/MapLibre), render stations, and connect visual line overlays.
- **v0.7 — Prediction & Notifications**: Aggregate history logs to predict delay propagation, build the notification scheduler, and add custom traveler alerts.
- **v0.8 — Fare Intelligence Engine**: Implement zone rules, pass eligibility check, cost calculation, and transfer discounts to recommend the cheapest fares.
- **v0.9 — Booking Platform**: Build generic ticket interfaces, implement the Booking Engine (`bookJourney`, `cancelJourney`), and structure the Provider Adapter Layer for ONDC / official operator APIs.
- **v1.0 — Payment Platform**: Develop the Payment Intelligence Engine, pre-loaded Wallet, Passes, and Trip History. Architecture is explicitly scoped by feasibility:
  - **Pre-loaded Wallet (stored-value)** ✅: TransitOS maintains a pre-loaded wallet balance that enables frictionless payments on smartwatch and voice interfaces — the key UX motivation is bypassing per-transaction phone authentication (OTP/biometric) that UPI/card require. User tops up once with authentication; subsequent deductions are instant. *Implementation path for v1.0: mock/simulated balance. Production path: UPI AutoPay mandate (via Razorpay/Cashfree), which enables recurring sub-₹15,000 auto-debits with zero per-transaction re-authentication — the same model used by Paytm Metro, DMRC Smart Card Recharge, and Rapido.*
  - **Rewards & Cashback Ledger** ✅: Points/cashback accumulation stored in TransitOS database. Fully buildable, no regulatory dependency.
  - **Digital Passes (Monthly/Weekly/Daily)** ✅: TransitOS issues its own QR-based digital passes stored in its own database. Journey consumption counter (`48/60 journeys used`) is tracked by TransitOS, not read from any card. For operators supporting QR ticketing (e.g. KMRL Kochi), passes generate scannable QR codes. For NCMC-only operators (DMRC), TransitOS passes serve as a booking record; physical gate validation still requires the NCMC card.
  - **UPI & Cards (top-up / direct payment)** ✅: Fully buildable via Razorpay/Cashfree aggregator. Standard business KYC, no banking license.
  - **NCMC Card (saved top-up method)** ⚠️: Displayed as a saved payment method for wallet recharge. Uses the NCMC card’s underlying bank rail (treated as a debit card) for one-time top-up authentication. TransitOS stores the card reference number for display only — no live balance query, no direct transit payment rail, no recharge of the physical card.
  - **NCMC (Live Transit Rail)** ❌: Not implementable. No public developer API to query balance or process gate-tap payments without a direct NPCI/bank operator partnership. Parked indefinitely.
  - **Trip History** ⚠️: TransitOS tracks only journeys **originated through the TransitOS app** (planned, booked, or QR-validated). Physical NCMC gate-tap journeys are invisible — the trip data is stored on the card chip and the operator’s backend; no public API exposes it to third parties.
- **v1.1 — AI & Voice Platform**: Standardize the Intelligence Gateway, integrate voice models (Sarvam), translate dialects, and add reasoning helpers (OpenAI/Gemini).
- **v1.2 — Ambient Computing**: Support smartwatch notifications, active calendar scan for proactive routes, and AR station indoor navigation.

---

## Chapter 11: Ingestion & Data Architecture

### Dual-Pipeline Strategy
TransitOS splits Static (planned network) and Realtime (live state) transit data into completely independent systems:

1. **Static Ingestion Pipeline**:
   - Sourced from official static feeds (GTFS Static, manual operator PDFs, or OSM).
   - **Or synthesized by the Transit Data Synthesis Engine (TDSE)** when official GTFS is unavailable.
   - Validated against schema, bounding boxes, checksums, and reference constraints.
   - Imported into PostgreSQL as the persistent database "source of truth".
2. **Realtime Overlay Engine**:
   - Sourced from official live feeds (GTFS-RT Protocol Buffers) when available (Level 1/2).
   - **Or generated by the State Estimation Engine** when official realtime does not exist (Level 3).
   - Polled periodically, cached in memory (Redis), and automatically expired.
   - Pushed directly to client web browsers via WebSockets.
   - **Never persisted in PostgreSQL** to maintain a clean database schema and avoid transaction choke.

---

## Chapter 12: Transit Data Synthesis Engine (TDSE)

The **Transit Data Synthesis Engine** is TransitOS's core data production capability. Most journey planners are *consumers* of GTFS. TransitOS is a *producer* of GTFS.

> See **[GTFS_SYNTHESIS.md](./GTFS_SYNTHESIS.md)** for the full technical specification of the TDSE, including the physics modeling pipeline, GTFS file generation logic, and the complete document classification system.

### Responsibilities
- Ingest documents classified as Category A through I
- Run appropriate extraction pipelines per document category
- Apply physics modeling to synthesize travel times from distance + rolling stock data
- Generate specification-compliant GTFS Schedule feeds
- Attach provenance records and confidence scores to every generated field
- Export the Canonical Transit Model (CTM) to PostgreSQL
- Publish synthesized GTFS feeds as open data

### Key Principle
GTFS becomes **one output** of the TDSE. Other outputs include the CTM, confidence scores, provenance metadata, validation reports, and the Knowledge Graph. Every downstream module (journey planning, prediction, analytics, public APIs) works from the synthesized CTM, regardless of whether the operator ever published an official feed.

---

## Chapter 13: Document Classification System

Every document ingested by TransitOS is assigned to one of ten categories. The category determines the extraction pipeline, the CTM fields it populates, and its downstream consumers.

| Category | Name | Examples | Primary Output |
|:---|:---|:---|:---|
| **A** | Network Topology | DPR, Alignment drawings, Route maps | Line/Station/StationSequence, distances |
| **B** | Station Infrastructure | Platform plans, Entrance maps, Accessibility audits | Level/Platform/Entrance, transfer times |
| **C** | Operations | Timetables, Headway tables, First/last train PDFs | GTFS trips.txt, stop_times.txt, calendar.txt |
| **D** | Rolling Stock | Train specs, Manufacturer manuals | Physics model parameters (speed, accel, braking) |
| **E** | Signalling | CBTC manuals, Block diagrams, Speed restrictions | Headway constraints, delay propagation model |
| **F** | GIS & Spatial | Shapefiles, OSM exports, GPS surveys | GTFS stops.txt, shapes.txt, PostGIS geometry |
| **G** | Commercial & Passenger | Fare charts, Amenities directories, Parking info | GTFS fare files, Passenger app cards |
| **H** | Historical Operations | Archived timetables, Delay reports, Community data | ML training datasets, dwell/speed calibration |
| **I** | Live Observations | GTFS-RT, Operator APIs, GPS traces, Crowdsource | State Estimation anchoring, confidence elevation |
| **X** | TransitOS Synthesized | Generated GTFS, CTM records, Estimated RT, ETA | All downstream modules (IP of TransitOS) |

> **Category X is TransitOS's intellectual property.** It is the finished product, not an intermediate artifact. Generated GTFS feeds may be published as open data contributions.

---

## Chapter 14: Data Provenance & Confidence Scoring

Every synthesized field in the CTM and every generated GTFS value carries a `ProvenanceRecord`.

```typescript
interface ProvenanceRecord {
  field: string;       // e.g. "travelTime", "firstTrain"
  value: unknown;
  source: string;      // Document identifier
  category: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'X';
  method: 'official' | 'extracted' | 'modeled' | 'learned' | 'estimated';
  confidence: number;  // 0.0–1.0
  lastValidated: string;
  version: string;
  notes?: string;
}
```

### Passenger-Facing Confidence Labels

| Confidence | Label |
|:---|:---|
| ≥ 95% | Live |
| 80–94% | Approx. |
| 60–79% | Estimated |
| < 60% | Scheduled |

---

## Chapter 15: Realtime Levels & State Estimation

TransitOS defines three levels of realtime data quality, reflecting the Indian transit data reality:

| Level | Name | Source | Confidence | Example |
|:---|:---|:---|:---|:---|
| **1** | Official | Operator GTFS-Realtime | 95–99% | Kochi Metro |
| **2** | Enhanced Official | Official feed + TransitOS validation | 85–99% | Delhi Metro (filtered) |
| **3** | Estimated | State Estimation Engine | 60–90% | Mumbai, Pune, Nagpur |

### State Estimation Engine (SEE)
The **State Estimation Engine** maintains a probabilistic model of train positions across all metro systems. It operates between the Journey Engine and the Prediction Engine:

```
TDSE Schedule → Journey Engine → State Estimation Engine → Prediction Engine → Estimated GTFS-RT
                                        ↑
                          Category I (Live Observations)
                          Category H (Historical baselines)
```

SEE responsibilities: position inference, delay estimation, dwell time application, missed departure detection, observation fusion, and confidence computation.

> See **[GTFS_SYNTHESIS.md § 6](./GTFS_SYNTHESIS.md)** for the full State Estimation Engine specification.

