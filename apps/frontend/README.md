# TransitOS Transport Analytics & Corridor Visualization Dashboard 🚇🗺️
### Web Application: Multi-Modal Route Planning, Station Catchment & Network Digital Twin

The interactive frontend application for **TransitOS**, built on **Next.js 16 (App Router with Turbopack)**, **MapLibre GL JS / WebGL**, **Framer Motion**, and **Tailwind CSS v4**.

Designed for transport planners, consultants, and commuters, the interface renders complex spatial networks, compares alternative transit corridors, inspects 3D station vertical levels, and simulates time-dependent passenger journeys.

---

## 🏛️ Application Architecture

The frontend strictly enforces the **Container-Presenter Architecture**, ensuring zero business logic or API leakage into visual presentation components:

```
apps/frontend/src/
├── app/                 # Next.js 16 App Router pages:
│   ├── plan/            # Corridor & Journey Planner interface
│   ├── network/         # Network-wide line & alignment explorer
│   ├── stations/        # Station directory & multi-modal catchment viewer
│   └── analytics/       # Operational performance & crowd telemetry dashboard
├── components/          # Pure Presentational Components (Stateless & Data-Agnostic):
│   ├── dashboard/       # DigitalTwinInspector, JourneyTimeline, StationCard
│   ├── map/             # MapContainer (MapLibre GL vector canvas & WebGL layer manager)
│   └── ui/              # JourneyPlannerView, LegPills, RouteItinerary, TransferSteps
├── containers/          # Stateful Orchestrators (Manages queries, state & API binding):
│   └── JourneyPlannerContainer.tsx  # Coordinates origin/destination selection & candidate evaluation
├── contexts/            # Shared React State (CityContext, StationContext, JourneyContext)
├── hooks/               # SWR / Custom Data Hooks (useStations, useStationsSearch, useDigitalTwin)
├── models/              # TypeScript Domain Models & DTO-to-Entity Adapters
├── services/api/        # Centralized HTTP Clients (ApiClient, StationApi, JourneyApi)
└── utils/               # Transport Presenters (transitPresenter.ts, itinerary builders)
```

---

## 🔬 Key Transport Planning Interfaces

### 1. Multi-Corridor Itinerary & Trade-Off Comparison (`/plan`)
- **Comparative Route Cards**: Evaluates generated $K$-shortest candidates against four critical transport planning dimensions:
  - **In-Vehicle Travel Time** ($T_{\text{in-vehicle}}$)
  - **Walking & Interchange Transfer Distance** ($D_{\text{walk}}$)
  - **Number of Transfers** ($N_{\text{transfers}}$)
  - **Fare Breakdown & Multi-Operator Ticketing**
- **Dynamic Attribute Badges**: Automatically classifies surviving candidate routes:
  - `FASTEST`: Minimum total elapsed journey time.
  - `FEWEST TRANSFERS`: Direct runs or minimal interchange friction.
  - `LEAST WALKING`: Optimized for passenger comfort and heavy luggage.
- **Micro-Interchange Step-by-Step Directions**: Displays vertical level movements (Concourse $\leftrightarrow$ Platform), Foot Overbridge corridors, door opening sides, and headsign directions.

### 2. Station Digital Twin & Micro-Access Inspector
- **3D Vertical Level Hierarchy ($Z$-levels)**: Inspects Street Level, Concourse Level, and Platform Level configurations.
- **Physical Entrances & Feeder Wayfinding**: Maps all GTFS station gates, indicating elevator accessibility, lift availability, and feeder integration with local auto-rickshaws and bus stops.
- **Interchange Pathway Visualizer**: Details physical transfer pathways connecting intersecting lines (e.g., covered FOBs, concourse walkways, street-level crossings).

### 3. Interactive WebGL Vector Transit Canvas
- High-performance vector rendering of citywide rail alignments and station nodes using MapLibre GL JS.
- Smooth polyline geometry rendering colored by official transit operator line codes.
- Dynamic route highlights: when a planner selects a candidate itinerary, the canvas dynamically highlights active transit links, interchange walk edges, and first/last-mile access paths.

---

## 🔒 Architectural Governance Rules

1. **Components Never Fetch Data Directly**: Presentational components under `src/components/` receive data strictly via `props`, ensuring full reusability across scenarios.
2. **Centralized API Contracts**: API URLs and network queries live exclusively inside `services/api/`.
3. **DTO Separation**: Backend DTOs never leak into React views; dedicated adapter layers normalize backend payloads into typed domain entities.
4. **Authoritative Ground-Truth Only**: Geometries, station names, transfer paths, and live colors are streamed directly from the NestJS CTM backend with zero artificial mockup data.

---

## 🚀 Development & Build

```bash
# Install monorepo dependencies
npm install

# Start local Next.js development server (Turbopack)
npm run dev --workspace=apps/frontend

# Verify TypeScript type integrity
npx tsc --noEmit --project apps/frontend/tsconfig.json

# Execute production build
npm run build --workspace=apps/frontend
```
