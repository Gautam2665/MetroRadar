# MetroRadar Backlog (10 LEGO Sprints)

Follow this sprint-by-sprint checklist to build MetroRadar as a set of modular blocks.

---

## 🧱 Active Checklist

### 🏃 Sprint 1: Infrastructure
- [ ] Configure monorepo environments (npm workspaces, Turbo / Lerna config).
- [ ] Create shared tooling configurations (`packages/config` containing eslint, tsconfig).
- [ ] Build local developer container environments in `docker/dev`.
- [ ] Initialize frontend application boilerplate (`apps/web`).
- [ ] Initialize backend API service boilerplate (`apps/api`).

### 🏃 Sprint 2: Database
- [ ] Initialize PostgreSQL database connection configurations.
- [ ] Enable PostGIS extension and verify geographic coordinate query support.
- [ ] Write migrations for core schemas (stations, routes, trips, timetables, ads).
- [ ] Create migration seed data scripts.

### 🏃 Sprint 3: Authentication
- [ ] Create user credentials schema and bcrypt hashing utilities.
- [ ] Build `/api/v1/auth/register` and `/api/v1/auth/login` endpoints.
- [ ] Write middleware authorization guards for verifying JWT tokens.
- [ ] Define session token renewal policies.

### 🏃 Sprint 4: Stations
- [ ] Create stations schema validation schemas.
- [ ] Write station lookup APIs (`GET /api/v1/stations`).
- [ ] Develop proximity search endpoint (`GET /api/v1/stations/nearby?lat=x&lng=y`).
- [ ] Add layout and facility data columns for stations.

### 🏃 Sprint 5: Lines
- [ ] Map out geographical track geometry paths.
- [ ] Establish routes and line connection relationships in the database.
- [ ] Develop line search APIs (`GET /api/v1/lines`).
- [ ] Associate station lists to distinct subway line sequences.

### 🏃 Sprint 6: Maps
- [ ] Install map-rendering libraries (Leaflet / Mapbox GL) in `apps/web`.
- [ ] Build map viewport layout showing station points and color-coded line tracks.
- [ ] Develop station overlay details panel showing facility details.
- [ ] Standardize deep dark-mode design variables.

### 🏃 Sprint 7: GTFS Ingestion
- [ ] Write static GTFS scheduling importer.
- [ ] Establish feed reader for GTFS-RT (real-time vehicle updates & service warnings).
- [ ] Set up ingestion service sync daemon in `apps/ingest`.
- [ ] Create WebSocket channels to push real-time changes to the frontend.

### 🏃 Sprint 8: Routing
- [ ] Model transit network map as a graph structure.
- [ ] Implement Dijkstra/A* routing algorithm.
- [ ] Support multi-line transfers in route lookup responses.
- [ ] Integrate delay telemetry parameters into path travel time estimations.

### 🏃 Sprint 9: Commercial
- [ ] Build commercial vendor model in the database.
- [ ] Develop station-specific vendor listing APIs (`GET /api/v1/stations/:id/shops`).
- [ ] Design ad layout zones on station dashboards and route planners.
- [ ] Integrate promotional offering notifications.

### 🏃 Sprint 10: AI Integration
- [ ] Aggregate historical delay records to feed prediction inputs.
- [ ] Develop transit delay regression prediction model.
- [ ] Assemble passenger profiles context logs (common routes, peak commute hours).
- [ ] Create personalized recommender API for optimized paths and shop discounts.
