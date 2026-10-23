# TransitOS Frontend — Web Client

The web client for TransitOS. Built on **Next.js 16 (App Router, Turbopack)**, **MapLibre GL JS**, **Framer Motion**, and **Tailwind CSS**.

This application renders the transit network map, the station digital twin inspector, the multi-candidate journey planner, and the real-time vehicle telemetry overlay.

---

## Architecture

The frontend enforces a strict **Container-Presenter** architecture. This separation is enforced at the code level, not just in convention.

```
apps/frontend/src/
├── app/                   # Next.js App Router pages (/plan, /network, /journeys)
├── components/            # Presentational components — zero data fetching
│   ├── dashboard/         # DigitalTwinInspector, QualityScoreBadge, JourneyTimeline
│   ├── map/               # MapContainer (MapLibre GL JS canvas)
│   └── ui/                # JourneyPlannerView, LegPills, RouteItinerary, StationCard
├── containers/            # Stateful orchestrators — API calls, state, event handling
├── contexts/              # React contexts (CityContext, StationContext, JourneyContext)
├── hooks/                 # Data hooks — useStations, useStationsSearch, useDigitalTwin
├── models/                # Domain models and DTO-to-model adapters
├── services/api/          # HTTP API clients — all backend URLs live here
└── utils/                 # Transit formatters (formatLineName, buildStepByStepItinerary)
```

### Governance Rules

1. **Components never fetch data.** Presentational components receive data only via `props`.
2. **Components never know backend URLs.** API endpoint addresses are isolated in `services/api/`.
3. **Backend DTOs never leak into UI.** Adapters in `models/` convert raw backend responses to clean domain types before they reach components.
4. **Zero hardcoded data.** All station names, geometries, line colors, and travel times come from the NestJS CTM backend.

---

## Key Interfaces

### Network Map
Vector MapLibre GL rendering of all certified metro networks. Operator line colors from CTM. Station node layer with interactivity. Live animated vehicle position pulses from GTFS-RT or estimated positions.

### Station Digital Twin Inspector
Slide drawer with composite station data: serving lines, platform configuration, entrance positions, wheelchair accessibility metadata. Data from `GET /stations/:id/digital-twin`.

### Journey Planner
Multi-candidate journey planner. Submits origin/destination pair to `GET /journeys`. Displays up to K=5 route candidates ranked by generalized cost with attribute badges (fastest, fewest transfers, least walking). Selecting a candidate focuses its GeoJSON geometry on the map.

---

## Development

```bash
# Start development server with Turbopack
npm run dev --workspace=apps/frontend

# Lint
npm run lint --workspace=apps/frontend

# TypeScript type check
npx tsc --noEmit --project apps/frontend/tsconfig.json
```

The frontend expects the backend to be running at `http://localhost:3001` by default. Override with `NEXT_PUBLIC_API_URL` environment variable.

---

## Live Deployment

Frontend: [metro-radar-blush.vercel.app](https://metro-radar-blush.vercel.app)  
Backend API: [transitos-33xk.onrender.com](https://transitos-33xk.onrender.com)
