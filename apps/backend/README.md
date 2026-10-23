# TransitOS Transport Modeling & Analytics Engine 🚇⚡
### Backend Services: Graph Routing, Spatial GIS, GTFS Ingestion & Network Simulation

The core computational backend for **TransitOS**, engineered with **NestJS**, **PostgreSQL / PostGIS**, **Prisma ORM**, and **Redis**.

The engine performs deterministic multi-modal routing, corridor accessibility analysis, spatial catchment evaluation, and time-dependent schedule simulation across mass transit networks.

---

## 🏛️ Engineering Architecture & Module Breakdown

The backend follows Domain-Driven Design (DDD), decoupling spatial persistence, graph computation, and real-time synchronization:

```
apps/backend/src/
├── config/              # Runtime environment validation & operational flags
├── database/            # DatabaseService wrapping PrismaClient with PostGIS extensions
├── health/              # Operational health, DB connectivity, and Redis latency probes (/health)
├── redis/               # RedisService (high-throughput caching, pub/sub, sub-5ms graph reads)
└── modules/
    ├── gis/             # Spatial GIS services:
    │   │                # - PostGIS geodetic queries (ST_Distance, ST_DWithin)
    │   │                # - Dynamic relative-proximity catchment modeling
    │   │                # - Station gate spatial attachments & barrier boundary checks
    │   │                # - Vector GeoJSON feature compilers
    │   └── controllers/ # MapController (/map/lines, /map/stations, /map/search)
    ├── ingestion/       # GTFS & CTM Data Pipeline:
    │   │                # - Transactional GTFS Static zip archive validation
    │   │                # - Station sequence & kinematic distance/speed normalizers
    │   │                # - 3D Station Level (Z-level) & platform crosswalk compilers
    │   └── services/    # IngestionService & GTFS Archive Validators
    ├── journey/         # Computational Transit Pathfinding:
    │   ├── graph/       # GraphBuilderService: compiles relational CTM into Directed Multigraph G = (V, E)
    │   └── routing/     # Core algorithmic routing engine:
    │                    # - Yen's K-Shortest Paths (Multi-Criteria Dijkstra)
    │                    # - CandidateFilterService (Strict Pareto Dominance & Detour Caps)
    │                    # - InterchangeEvaluatorService (Vertical impedance, AFC gates, security lines)
    │                    # - ScoringService (Generalized cost RankScore formula)
    └── realtime/        # Telemetry & Operating Simulation:
                         # - GTFS-RT Protocol Buffer parser (VehiclePositions, TripUpdates)
                         # - Headway tracking & time-dependent departure simulation
```

---

## 🔬 Core Transport Modeling Algorithms

### 1. In-Memory Directed Multigraph Compilation (`GraphBuilderService`)
The static transit schedule is compiled into an in-memory graph $G = (V, E)$ scoped per transit system:
- **Station Nodes ($V$)**: Represent station facilities and multi-modal gate attachments with geodetic latitude/longitude.
- **Typed Edges ($E$)**:
  - `EdgeType.TRANSIT`: Inter-station revenue runs derived from GTFS arrival/departure differentials or kinematic link models ($T_{ij} = d_{ij} / v_{\text{cruise}} + t_{\text{dwell}}$).
  - `EdgeType.TRANSFER`: Station-to-station pedestrian interchange corridors (elevated FOBs, concourse walkways).
  - `EdgeType.WALK`: Concourse vertical ascents/descents ($\Delta Z$), turnstile cross-overs, and last-mile connections.

### 2. Multi-Objective Yen's $K$-Shortest Paths
Rather than computing a single rigid shortest path, the routing engine generates deviation candidates to uncover corridor diversity across alternative lines:
- Edge weights are penalized dynamically using calibrated journey weights:
  $$\text{DijkstraWeight} = 1.0 \times T_{\text{in-vehicle}} + 0.8 \times T_{\text{pedestrian\_walk}} + 180\text{s} \times \text{TransferPenalty}$$

### 3. Strict Pareto Dominance & Circuitous Detour Filtering (`CandidateFilterService`)
Candidate paths are evaluated against strict transport economics principles:
- **Strict Pareto Dominance**:
  $$\text{Candidate } B \text{ dominates } A \iff T_B \le T_A \;\land\; \text{Xfer}_B \le \text{Xfer}_A \;\land\; \text{Walk}_B \le \text{Walk}_A$$
- **Same-Destination Detour Suppression**: When two candidates terminate at the same station, any option with strictly more transfers is pruned if it exceeds the fastest option by $> 15\%$ or $> 5\text{ minutes}$.
- **Feeder Diversity Preservation**: When traveling to multi-feeder localities, alternative destination stations on different lines are protected from premature dominance to allow multi-corridor comparative evaluation.

### 4. Micro-Interchange Physical Impedance (`InterchangeEvaluatorService`)
Interchanges factor in physical transit station constraints:
- **Vertical Displacement ($\Delta Z$)**: $+10\text{ seconds per vertical meter}$ of stair/escalator movement.
- **Turnstile Control (AFC Re-tap)**: $+60\text{ seconds}$ penalty if exiting paid concourse.
- **Security Checkpoints**: $+300\text{ seconds}$ (+5 minutes) queue penalty for security baggage-scanning perimeters.
- **Outdoor Street Walkways**: $+600\text{ seconds}$ penalty for un-sheltered street-level walking between stations.

---

## 📡 Key API Endpoints

### 1. Journey Pathfinding & Simulation (`/journeys`)
`GET /journeys?from=<originId>&to=<destId>&departureTime=<HH:mm>&objective=<FASTEST/MIN_FRICTION>&mobility=<STANDARD/REDUCED>&luggage=<NONE/HEAVY>`
- Evaluates $K$-shortest candidate paths between stations, multimodal landmarks, or geocoded locality coordinates.
- Returns timing breakdown ($T_{\text{in-vehicle}}$, $T_{\text{walk}}$, $T_{\text{wait}}$), transfer counts, step-by-step guidance, real-time departure simulation, and GeoJSON route features.

### 2. Spatial Catchment & Network GIS (`/map`)
* `GET /map/lines?system=<code>` — Reconstructed route polylines colored by transit brand color.
* `GET /map/stations?system=<code>` — Station Point features with served lines, platforms, and accessibility flags.
* `GET /map/search?q=<query>` — Multi-criteria geocoder searching stations, lines, and regional locality reference centroids with dynamic relative-proximity catchment.
* `GET /map/stations/:id/digital-twin` — Multi-level 3D station platform layout, vertical levels, and entrance wayfinding.

### 3. Real-Time Telemetry (`/realtime`)
* `GET /realtime/vehicles?system=<code>` — Active vehicle positions with sub-5ms Redis cache response times.

---

## 🧪 Testing & Verification

The backend is backed by an automated test suite verifying routing determinism, dominance rules, and graph compilation:

```bash
# Run complete test suite (63 automated assertions)
npm run test --workspace=apps/backend

# Targeted candidate-filter and dominance tests
npx jest --config apps/backend/package.json apps/backend/src/modules/journey/routing/candidate-filter.service.spec.ts

# Production TypeScript compilation
npm run build --workspace=apps/backend
```
