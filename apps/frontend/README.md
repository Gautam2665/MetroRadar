# TransitOS Frontend 🚇✨

The passenger-facing web application and transit digital twin interface built on **Next.js 15 (App Router)**, **MapLibre GL JS**, **Framer Motion**, and **Tailwind CSS**.

---

## 🏛️ Frontend Architecture

The frontend strictly enforces the **Container-Presenter Architecture**:

```
apps/frontend/src/
├── app/                 # Next.js 15 App Router pages (/plan, /network, /journeys, etc.)
├── components/          # Pure presentational components (Zero data fetching)
│   ├── dashboard/       # DigitalTwinInspector, JourneyTimeline, QualityScoreBadge
│   ├── map/             # MapContainer (MapLibre GL JS vector canvas)
│   └── ui/              # JourneyPlannerView, LegPills, RouteItinerary
├── containers/          # Stateful business orchestrators (JourneyPlannerContainer, etc.)
├── contexts/            # React Contexts (CityContext, StationContext, JourneyContext)
├── hooks/               # Custom data hooks (useStations, useStationsSearch, useDigitalTwin)
├── models/              # Clean domain models & DTO-to-Model adapters
├── services/api/        # Centralized HTTP API clients (ApiClient, StationApi, JourneyApi)
└── utils/               # Transit formatter (formatLineName, extractDirection, buildStepByStepItinerary)
```

---

## 🔒 Architectural Governance Rules

1. **Components Never Fetch Data**: Presentational components under `src/components/` receive data strictly via `props`.
2. **Components Never Know Backend URLs**: API routes live exclusively inside `services/api/`.
3. **Backend DTOs Never Leak into UI**: Adapters convert raw backend responses into clean domain models.
4. **Zero Hardcoded Fake Data**: All lines, station names, geometries, transfer paths, and live colors are streamed directly from the NestJS CTM backend.

---

## 🚀 Key User Experiences

* **Interactive Map Canvas**: Vector MapLibre GL rendering multi-city line tracks, station nodes, and live animated vehicle pulses.
* **Station Digital Twin Inspector**: Slide drawer detailing station platforms, exits, wheelchair accessibility, and next-train arrival ETAs.
* **Journey Itinerary Planner**: Multi-leg Dijkstra pathfinding with clean line badges, towards headsigns, and walking interchange cards.

---

## 🧪 Testing & Linting

```bash
# Run frontend linter
npm run lint --workspace=apps/frontend

# Verify TypeScript types
npx tsc --noEmit --project apps/frontend/tsconfig.json

# Start development server
npm run dev --workspace=apps/frontend
```
