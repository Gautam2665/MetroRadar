# TransitOS Backend — NestJS API and Computational Engines

The backend service for TransitOS. Built on **NestJS 11**, **PostgreSQL 16 / PostGIS**, **Prisma 6.2**, and **Redis 7.2**.

This service owns the Canonical Transit Model (CTM), the journey pathfinding engine, the GTFS ingestion pipeline, and the realtime vehicle telemetry layer.

---

## Module Structure

```
apps/backend/src/
├── config/              # Environment validation and configuration service
├── database/            # DatabaseService (PrismaClient wrapper)
├── health/              # Health check endpoint (/health)
├── redis/               # RedisService — cache, pub/sub, graceful degradation
└── modules/
    ├── gis/             # GeoJSON layers, spatial search, digital twin payloads
    │   ├── geojson.service.ts         # PostGIS GeoJSON aggregation
    │   ├── digital-twin.service.ts    # Composite station structure assembly
    │   └── search.service.ts          # Full-text and spatial proximity search
    ├── ingestion/       # GTFS static ingestion, parsers, normalizers, validators
    │   ├── ingestion.service.ts       # Transaction-safe import orchestration
    │   ├── gtfs-archive.validator.ts  # Checksum, bounding box, referential checks
    │   └── parsers/                   # Per-file GTFS parsers
    ├── journey/         # Graph routing engine and scoring
    │   ├── graph/
    │   │   └── graph-builder.service.ts    # In-memory multigraph G=(V,E)
    │   ├── routing/
    │   │   └── routing.service.ts          # Yen's KSP over Dijkstra
    │   ├── scoring/
    │   │   └── scoring.service.ts          # Generalized cost scoring
    │   ├── interchange-evaluator.service.ts # Built-environment friction model
    │   ├── candidate-filter.service.ts      # Pareto dominance pruning
    │   └── locality-routing.service.ts      # Feeder catchment computation
    └── realtime/        # GTFS-RT feed poller, protobuf decoder, Redis cache
        ├── feed-poller.service.ts     # Background polling scheduler
        └── gtfs-rt-parser.service.ts  # Protocol Buffer decoding
```

---

## API Endpoints

### GIS and Spatial (`/map`)

| Endpoint | Description |
|:---|:---|
| `GET /map/layers` | Dynamic layer configuration registry |
| `GET /map/systems` | Registered transit systems (GeoJSON FeatureCollection) |
| `GET /map/lines?system=<code>` | Reconstructed line route geometries |
| `GET /map/stations?system=<code>` | All passenger stations with served lines |
| `GET /map/stations/:id` | Single station GeoJSON feature |
| `GET /map/search?q=<query>&type=station,line` | Full-text and entity search |
| `GET /map/nearby?lat=&lon=&radius=&types=` | PostGIS radius proximity query |

### Station Digital Twin (`/stations`)

| Endpoint | Description |
|:---|:---|
| `GET /stations/:id/digital-twin` | Composite station: levels, platforms, entrances, amenities, operational status |

### Journey Routing (`/journeys`)

| Endpoint | Description |
|:---|:---|
| `GET /journeys?from=<id>&to=<id>` | Multi-candidate Yen's KSP routing with generalized cost scoring, Pareto filtering, and interchange friction |

### Realtime Telemetry (`/realtime`)

| Endpoint | Description |
|:---|:---|
| `GET /realtime/vehicles?system=<code>` | Vehicle positions with source/confidence labels; sub-5 ms from Redis cache |

### GTFS Ingestion (`/ingestion`)

| Endpoint | Description |
|:---|:---|
| `POST /ingestion/gtfs?systemId=<id>&dryRun=<bool>` | Transaction-safe GTFS archive import with per-entity counts and audit trail |

---

## Journey Engine — Technical Summary

The journey module computes multi-leg transit paths using Yen's K-Shortest Loopless Paths over a modified Dijkstra on an in-memory directed multigraph.

**Graph edges:**
- `TRANSIT` — in-vehicle movement; weight from GTFS `stop_times.txt` or `StationSequence.travelTimeFromPrevious`
- `WALK` — pedestrian transfer; weight = geodesic distance ÷ 1.2 m/s (auto-inserted for stations ≤1000 m apart on different lines)
- `TRANSFER` — line-change at same physical station; weight = interchange friction penalty

**Generalized cost formula:**
$$\text{RankScore} = w_t \cdot T_{\text{duration}} + P_{\text{transfer}} \cdot N_{\text{transfers}} + w_w \cdot T_{\text{walking}} + C_{\text{friction}}$$

Default weights: `travelTimeWeight: 1.0`, `walkingWeight: 0.8`, `transferPenalty: 120 s equivalent`.

**Interchange friction** (`interchange-evaluator.service.ts`):
- Level change: +10 s per vertical metre
- AFC turnstile re-tap: +60 s
- Security rescreening: +300 s
- Outdoor street exposure: +600 s

**Candidate filtering** (`candidate-filter.service.ts`):
- Feasibility filter: removes loops, invalid durations, >6 transfers
- Pareto dominance filter: prunes candidates strictly inferior across duration, transfers, walking
- Same-destination pruning: candidates >15% slower or >5 min longer with ≥ transfers pruned

---

## Testing

```bash
# Run unit and integration tests (63 tests, 9 suites)
npm run test --workspace=apps/backend

# TypeScript type check
npx tsc --noEmit --project apps/backend/tsconfig.json

# Lint with auto-fix
npm run lint --workspace=apps/backend
```

Test coverage: candidate generation, Pareto filtering, interchange friction evaluation, feeder catchment boundary conditions, barrier-aware corridor routing, GTFS ingestion validation.

---

## Local Development

```bash
# Start PostgreSQL/PostGIS and Redis
docker compose -f docker/dev/docker-compose.yml up -d

# Apply database migrations
npx prisma migrate dev --schema=apps/backend/prisma/schema.prisma

# Seed initial data
npx prisma db seed --schema=apps/backend/prisma/schema.prisma

# Start backend in watch mode
npm run dev --workspace=apps/backend
```

Environment variables required: `DATABASE_URL`, `REDIS_URL`. See `apps/backend/.env.example`.
