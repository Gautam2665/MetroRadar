# TransitOS Backend API & Engines 🚇⚡

The backend service for **TransitOS** built on **NestJS**, **PostgreSQL / PostGIS**, **Prisma ORM**, and **Redis**.

---

## 🏛️ Architecture Overview

The backend is structured into modular domain services:

```
apps/backend/src/
├── config/              # Environment validation & configuration
├── database/            # DatabaseService wrapping PrismaClient
├── health/              # Health check endpoints (/health)
├── redis/               # RedisService (caching, pub/sub, resilient degradation)
└── modules/
    ├── gis/             # GIS GeoJSON layers, spatial search & digital twin inspector
    ├── ingestion/       # GTFS Static ingestion, parsers, normalizers & validators
    ├── journey/         # Graph builder & Dijkstra CTM pathfinding routing engine
    └── realtime/        # GTFS-RT feed poller, protocol buffer parser & cache engine
```

---

## 📡 API Modules & Endpoints

### 1. GIS & Spatial Module (`/map`)
* `GET /map/layers` — Dynamic GIS layer configurations registry
* `GET /map/systems` — Registered transit systems GeoJSON
* `GET /map/lines?system=<code/all>` — Reconstructed line route geometries
* `GET /map/stations?system=<code>` — Station Point features with served lines and colors
* `GET /map/stations/:id` — Single station GeoJSON feature
* `GET /map/search?q=<query>&type=station,line` — Spatial search index
* `GET /map/stations/:id/digital-twin` — Multi-level station platforms, exits, and amenities

### 2. Journey Intelligence Module (`/journeys`)
* `GET /journeys?from=<originStationId>&to=<destStationId>` — Multi-leg Dijkstra transit pathfinder returning score, duration, transfer penalties, and GeoJSON route features.

### 3. Realtime Telemetry Module (`/realtime`)
* `GET /realtime/vehicles?system=<code>` — Active vehicle positions with sub-5ms Redis reads and graceful fallback.

### 4. Ingestion Module (`/ingestion`)
* `POST /ingestion/gtfs?systemId=<id>&dryRun=true` — Transaction-safe GTFS archive validation, parsing, normalization, and CTM PostgreSQL import.

---

## 🧪 Testing & Quality Assurance

```bash
# Run unit tests (24/24 tests)
npm run test --workspace=apps/backend

# Run end-to-end test suite
npm run test:e2e --workspace=apps/backend

# Run linter with auto-fix
npm run lint --workspace=apps/backend

# TypeScript check
npx tsc --noEmit --project apps/backend/tsconfig.json
```
