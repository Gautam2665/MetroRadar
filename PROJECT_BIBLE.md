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
*   [Chapter 9: AI Modules](#chapter-9-ai-modules)
*   [Chapter 10: Development Roadmap](#chapter-10-development-roadmap)

---

## Chapter 1: Project Vision

MetroRadar is not just a simple metro map application. Over the next 6 months, it will be built as an **Urban Mobility Intelligence Platform**. 

The platform is structured into six progressive layers:
```
┌─────────────────────────────────────────────────────────┐
│                   Analytics Layer                       │  <- Insights, reports, passenger flow data
├─────────────────────────────────────────────────────────┤
│                      AI Layer                           │  <- Predictions, smart routing, recommender
├─────────────────────────────────────────────────────────┤
│                   Passenger Layer                       │  <- Commuter context, alerts, search history
├─────────────────────────────────────────────────────────┤
│                  Commercial Layer                       │  <- Transit retail, station ads, services
├─────────────────────────────────────────────────────────┤
│                   Station Layer                         │  <- Station layouts, platform stats, access
├─────────────────────────────────────────────────────────┤
│                    Transit Layer                        │  <- Train schedules, routes, real-time feeds
└─────────────────────────────────────────────────────────┘
```

1. **Transit Layer**: Real-time train positions, static route schedules, and delay data.
2. **Station Layer**: Detailed station directories, platform connectivity, layouts, and facilities.
3. **Commercial Layer**: Stores, advertisements, services, and commercial activities in or near stations.
4. **Passenger Layer**: Commuter journeys, bookmark preferences, search history, and live contexts.
5. **AI Layer**: Real-time predictions, smart scheduling assistance, route optimizations, and context-aware suggestions.
6. **Analytics Layer**: Comprehensive intelligence dashboard reporting crowd densities, efficiency logs, and commercial footfall.

---

## Chapter 2: Architecture

MetroRadar follows a **modular LEGO architecture**. The platform is constructed from independent building blocks that plug into one another.

### Design Principles
- **Loose Coupling**: Each block operates independently. For example, the maps module does not care about the database engine; it consumes standardized APIs.
- **Strict Data Dependencies**: High-level modules (like AI and routing) cannot be run without verifying the status of lower-level blocks (data ingestion, static stations).
- **Single Source of Truth**: All shared configurations (TypeScript types, linter standards, and design styles) live in centralized packages.

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

## Chapter 9: AI Modules

AI components are kept until the very end, following a **Data-First** development strategy. We will not build an AI chatbot without rich context.

### Data Accumulation Flow
```
┌───────────┐    ┌─────────┐    ┌──────────┐    ┌────────────┐    ┌───────────────────┐    ┌──────┐
│ Stations  │───>│  Trips  │───>│  Routes  │───>│ Commercial │───>│ Passenger Context │───>│  AI  │
└───────────┘    └─────────┘    └──────────┘    └────────────┘    └───────────────────┘    └──────┘
```

1. **Stations Data**: Physical platforms, exit logs, crowd density capacity.
2. **Trips Data**: Timetables, actual transit durations, real-time arrival discrepancies.
3. **Routes Data**: Connections, transfer durations, train occupancy logs.
4. **Commercial Data**: In-station vendor listings, retail promotions, advertisements.
5. **Passenger Context**: Habitual routes, user commute times, live travel coordinates.
6. **AI Layer**: Cross-references passengers, stations, routes, and commercial incentives to offer intelligent delay forecasting, station routing, and target commuter suggestions.

---

## Chapter 10: Development Roadmap

Development runs in 11 sequential, modular sprints:

1. **Sprint 1: Infrastructure**: Git/Monorepo configs, linting, Docker containers.
2. **Sprint 2: Transit Core Schema**: Database structure, PostGIS setups, initial tables.
3. **Sprint 3: GTFS Ingestion Engine**: Database upgrades, enums, triggers, and CTM models.
4. **Sprint 3.5: Transit Data Acquisition & Validation**: Authoritative Data Catalog, validation CLI, and real-world imports (Delhi, Kochi).
5. **Sprint 4: Frontend Maps**: Map visualization frontend, station plotting, UI styling.
6. **Sprint 5: Routing & Pathfinding**: Pathfinding (Dijkstra/A*), connection transfers, trip duration forecasting.
7. **Sprint 6: Realtime Engine**: GTFS-RT connectors, vehicle positions, TripUpdates, Redis cache overlay, WebSockets.
8. **Sprint 7: Authentication**: Security tokens, login API, secure routes.
9. **Sprint 8: Stations Detail**: Layout maps, exits, levels, amenities, entrances.
10. **Sprint 9: Commercial**: Station advertisements, store integrations, deals board.
11. **Sprint 10: AI Integration**: Context-aware commuter recommendations and predictive delays.

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

