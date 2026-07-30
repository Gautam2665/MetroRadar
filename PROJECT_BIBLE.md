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

---

## Chapter 1: Project Vision

TransitOS (formerly MetroRadar) is an **Urban Intelligence Platform** designed to build a complete digital twin of city transit networks. Instead of a simple map application, the platform is divided into three distinct vertical platform layers that build on top of each other:

```
                         TransitOS Platform
┌─────────────────────────────────────────────────────────┐
│              Layer 3: Transit Experience                │  <- Passenger App, Operator Dashboard, Watch, AR
├─────────────────────────────────────────────────────────┤
│             Layer 2: Transit Intelligence               │  <- Journey, Predictions, Fares, Payments, Booking
├─────────────────────────────────────────────────────────┤
│               Layer 1: Transit Data                     │  <- GTFS Static, GTFS-RT, PostGIS Database, APIs
└─────────────────────────────────────────────────────────┘
```

### The Three Platform Layers
1. **Layer 1: Transit Data Platform**: Owns GTFS Static and GTFS-Realtime data ingestion, CTM (Canonical Transit Model) mapping, data validation, database persistence (PostgreSQL/PostGIS), and public REST/WebSocket APIs.
2. **Layer 2: Transit Intelligence Platform**: Owns journey pathfinding engines, travel-time delay predictions, fare calculations (including transfer discounts and passes), notifications orchestration, booking abstraction, and platform analytics.
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
- **v1.0 — Payment Platform**: Develop the Payment Intelligence Engine, the Payment Adapter Layer (UPI, NCMC, card networks), and the virtual Passenger Profile / Wallet abstraction.
- **v1.1 — AI & Voice Platform**: Standardize the Intelligence Gateway, integrate voice models (Sarvam), translate dialects, and add reasoning helpers (OpenAI/Gemini).
- **v1.2 — Ambient Computing**: Support smartwatch notifications, active calendar scan for proactive routes, and AR station indoor navigation.

---

## Chapter 11: Ingestion & Data Architecture

### Dual-Pipeline Strategy
MetroRadar splits Static (planned network) and Realtime (live state) transit data into completely independent systems:

1. **Static Ingestion Pipeline**:
   - Sourced from official static feeds (GTFS Static, manual operator PDFs, or OSM).
   - Validated against schema, bounding boxes, checksums, and reference constraints.
   - Imported into PostgreSQL as the persistent database "source of truth".
2. **Realtime Overlay Engine**:
   - Sourced from official live feeds (GTFS-RT Protocol Buffers).
   - Polled periodically, cached in memory (Redis), and automatically expired.
   - Pushed directly to client web browsers via WebSockets.
   - **Never persisted in PostgreSQL** to maintain a clean database schema and avoid transaction choke.

