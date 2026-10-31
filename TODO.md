# TransitOS — Implementation Backlog & Priorities

This backlog reflects the current implementation sequence for **TransitOS (Project MetroRadar)**, organized by service capability tiers (**P0 Foundation**, **P1 Core Services**, **P2 Mobility Intelligence & Multi-City**, and **P3 Institutional/Operator Systems**).

For strategic context, see [ROADMAP.md](./ROADMAP.md).  
For architectural specifications, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/](./docs/).

---

## 🚦 Priority Overview

```
P0 — Foundation (Data Platform & Conformance)         [COMPLETED BASELINE]
P1 — Core Services (APIs, Realtime & Wayfinding)      [ACTIVE SPRINT]
P2 — Mobility Intelligence & Regional Expansion       [NEXT UP]
P3 — Operator Systems & Institutional Integration     [PLANNED]
```

---

## 🟢 P0 — Foundation: Transit Data Platform & Validation

*Objective: Establish an authoritative, 100% compliant transit data repository and automated validation pipeline.*

- [x] **Canonical Transit Model (CTM v1.0)**: Relational schema implemented in PostgreSQL 16 + PostGIS 3.4 (`systems`, `agencies`, `lines`, `stations`, `levels`, `platforms`, `entrances`, `amenities`, `trips`, `stop_times`, `shapes`, `calendars`).
- [x] **PostGIS Spatial Indexing**: GIST spatial indexes and automatic coordinate-to-geometry trigger synchronization.
- [x] **Discrete Timetable Synthesis**: Complete individual dispatches for Mumbai Metro Lines 1, 2A, 3, 7, 9, and Monorail with second-level arrival/departure precision.
- [x] **Canonical MobilityData Validator Conformance**:
  - [x] Resolve `pathway_unreachable_location` errors across all stations (0 errors).
  - [x] Correct gate regex parsing bug preventing Churchgate (`STN_L3_025`) street entrances from linking to concourses.
  - [x] Full referential integrity verification (0 orphan stops, 0 dangling pathways, 0 invalid transfer pairs).
- [x] **Packaging of Canonical GTFS Archives**: Automated build pipeline generating `mumbai_discrete_ready.zip` and `mumbai-operational-gtfs.zip`.
- [x] **Data Categorization Framework**: Explicit classification of public, restricted, independently curated, and operational data tiers.

---

## 🟡 P1 — Core Services: APIs, Real-Time & Station Intelligence

*Objective: Power passenger journey planning, developer access, and live service monitoring.*

- [x] **Multi-Modal Directed Multigraph Routing Engine**: In-memory graph ($G=(V,E)$) evaluating transit trips, pedestrian FOBs, and vertical level changes.
- [x] **Built-Environment Interchange Friction Modeling**: Horizontal walking distance + vertical stair penalty ($w_z=2.5$) + escalator speeds + elevator cycle times + ticket barriers.
- [x] **Pareto-Optimal Candidate Filtering**: Yen's K-Shortest Paths filtering out sub-optimal routes across in-vehicle time, walking distance, transfers, and fares.
- [x] **Dynamic GTFS-Realtime (GTFS-RT) Server**:
  - [x] `mock-gtfsrt-server.js` binding directly to `mumbai_discrete_ready.zip`.
  - [x] `/gtfsrt/updates` (TripUpdate Protobuf stream).
  - [x] `/gtfsrt/vehicles` (VehiclePosition Protobuf stream).
  - [x] `/gtfsrt/alerts` (ServiceAlert Protobuf stream).
- [ ] **Developer Portal & API Surface**:
  - [ ] Implement OpenAPI / Swagger UI on `/api/docs`.
  - [ ] Public dataset download endpoints for verified GTFS archives and GeoJSON layers.
  - [ ] API key provisioning and rate-limiting middleware in NestJS gateway.
- [ ] **MetroRadar Commuter Web App Polish**:
  - [ ] Gate-specific exit navigation in route result cards (e.g., "Exit via Gate A3 for West Pavilion").
  - [ ] Digital twin station floorplan viewer visualizing multi-level platforms and amenities.
  - [ ] Real-time vehicle marker animation on MapLibre GL canvas.

---

## 🔵 P2 — Mobility Intelligence & Multi-City Expansion

*Objective: Deliver research-grade spatial analytics and expand beyond Mumbai to Pune and Nagpur.*

- [ ] **Dynamic Pedestrian Catchment Isochrones**:
  - [ ] PostGIS spatial query engine generating 5, 10, and 15-minute walking catchment polygons from station gates along actual sidewalks.
  - [ ] Natural and infrastructure barrier avoidance (railway tracks, rivers, expressways).
  - [ ] Export isochrones as GeoJSON for GIS and urban planning workflows.
- [ ] **Interchange Friction Index (IFI) Audit**:
  - [ ] Automated benchmark reports for all major Mumbai interchange complexes (D.N. Nagar / Andheri West, Gundavali / WEH, Dadar, Kurla).
  - [ ] Empirical ranking of transfer friction across lines.
- [ ] **Multi-City Rollout: Stage 1 — Pune**:
  - [ ] Ingest Pune Metro (Purple & Aqua lines) static geometry and timetables into CTM.
  - [ ] Ground-truth Pune Metro station entrances and multi-modal integration with PMPML bus terminals.
  - [ ] Generate verified GTFS Schedule feeds for Pune.
- [ ] **Multi-City Rollout: Stage 2 — Nagpur**:
  - [ ] Ingest Maha Metro Nagpur Orange and Aqua lines.
  - [ ] Validate station access points and feeder catchments.
- [ ] **Station Parking & Multi-Modal Access**:
  - [ ] Model parking facility locations, vehicle capacities, EV charging bays, and auto/cab feeder stands.

---

## 🟣 P3 — Operator Systems & Institutional Collaboration

*Objective: Formalize academic research partnerships and work toward public-sector transport stack adoption.*

- [ ] **Academic Research Collaboration (IIT Bombay TSE)**:
  - [ ] Prepare standardized research dataset bundles and mathematical methodology whitepapers.
  - [ ] Explore formal industry–academia interaction via IIT Bombay IRCC / SINE pathways.
  - [ ] Pilot collaborative study on multi-modal transfer impedance and pedestrian accessibility in Mumbai.
- [ ] **Transit Operator Dashboards & Collaboration**:
  - [ ] Operator-facing GTFS health audit and digital twin verification portal.
  - [ ] Engage MMRCL / MMMOCL / Maha Metro regarding official AVL GPS transponder ingestion.
  - [ ] Station commercial space (kiosk/retail) spatial analytics.
- [ ] **Government Open Transport Stack Alignment**:
  - [ ] Align data schemas with national public mobility initiatives and open transport data standards (inspired by the Delhi Transport Stack).
  - [ ] Evaluate participation in government innovation programs (e.g. Atal New India Challenge).
