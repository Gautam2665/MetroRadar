# TransitOS — Data & Service Catalogue

## Purpose & Organization

Inspired by modern public transport catalogues (such as the [Delhi Transport Stack](https://delhi.transportstack.in/)), the **TransitOS Service Catalogue** groups transit datasets and digital capabilities into shared foundational layers rather than isolated project silos.

Capabilities are prioritized into development tiers:
* **P0 — Foundation**: Core static data required for any network representation.
* **P1 — Operational & Spatial**: Real-time operational data, pedestrian infrastructure, and routing.
* **P2 — Intelligence & Urban Context**: Catchment analysis, commercial spaces, and multi-modal integration.
* **P3 — Operator Systems**: Direct integration with agency fleet, ticketing, and depot management.

---

## Service Catalogue Matrix

| Capability | Services Provided | Data Sources | Priority | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Transit Data Publishing** | GTFS Schedule feeds, routes, stops, discrete timetables, fares, calendars, line colors, shapefiles. | Official operator schedules, DPRs, CTM relational export. | **P0** | **Production (Mumbai)** |
| **Data Quality & Validation** | Automated MobilityData GTFS validator compliance, referential integrity verification, orphan stop purging. | CI validation scripts, graph reachability solvers. | **P0** | **Production** |
| **Station Intelligence** | Verified gate coordinates, platform-to-street walking pathways, lifts, escalators, AFC turnstiles. | Ground-truthed surveys, CAD station blueprints, OSM pedestrian layers. | **P1** | **Production (Mumbai)** |
| **Journey Planning** | Multi-modal pathfinding, transfer penalty calculation, FOB walking routes, gate-specific itineraries. | CTM directed multigraph engine, OTP 2.x integration. | **P1** | **Production** |
| **Real-Time Transit Feeds** | Streaming GTFS-RT Protobuf feeds (Trip Updates, Vehicle Positions, Service Alerts). | Dynamic timetable clock projection, operator telemetry when available. | **P1** | **Beta** |
| **Mobility Analytics** | 5/10/15-min pedestrian isochrones, station catchment analysis, transfer friction indices. | PostGIS spatial queries, OSM sidewalk networks, CTM graph. | **P1** | **Active** |
| **Station Parking & Access** | Station parking capacity, EV charging bays, auto/cab pickup zones, bus bay proximity. | Municipal transport records, satellite imagery, OSM. | **P2** | **Planned** |
| **Retail & Commercial Spaces** | Concourse kiosk layouts, retail space inventory, passenger movement correlation. | Station floorplan blueprints, commercial concessions data. | **P2** | **Experimental** |
| **Road & Urban Infrastructure** | Skywalks, pedestrian subways, street-level crosswalks, traffic signal barriers. | Municipal GIS portals, OpenStreetMap extracts. | **P2** | **Active** |
| **Operator Telematics & Systems** | Automated Passenger Counting (APC), fleet dispatch, ticket barrier telemetry, depot schedules. | Transit agency operational feeds (requires formal data agreement). | **P3** | **Roadmap** |
| **Developer Platform** | Public REST APIs, Swagger OpenAPI spec, downloadable GTFS archives, SDK libraries. | TransitOS API Gateway. | **P0/P1** | **Active** |

---

## Regional Implementation Coverage

### Mumbai Metropolitan Region (MMR) — Current Status
* **Metro Line 1 (Blue Line)**: 12 stations, 48 gates, full discrete timetable, Western Railway FOB at Andheri, Central Railway FOB at Ghatkopar.
* **Metro Line 2A (Yellow Line)**: 17 stations, verified gate coordinates, Line 1 interchange at D.N. Nagar / Andheri West, Line 7 interchange at Dahisar East.
* **Metro Line 3 (Aqua Line)**: 27 underground/at-grade stations, exact Wayfinder gate pavilions (e.g. Churchgate A1–A5, B1–B2), concourses, platforms, and turnstiles.
* **Metro Line 7 (Red Line)**: 14 stations along Western Express Highway (WEH), interchange FOB to Line 1 at Gundavali.
* **Metro Line 9 (Red Line Extension)**: Operational alignment, phase 1 stations, Dahisar East tri-line interchange.
* **Mumbai Monorail**: 17 stations, Line 2B skywalk connection at Chembur.

### Pune Metropolitan Region (PMR) — Phase 2
* **Pune Metro**: Purple Line (PCMC to Swargate) and Aqua Line (Vanaz to Ramwadi).
* **PMPML Bus Integration**: Evaluation of bus routes, shared stops, and multi-modal interchange hubs.

### Nagpur — Phase 3
* **Nagpur Metro**: Orange Line (Automotive Square to Khapri) and Aqua Line (Prajapati Nagar to Lokmanya Nagar).
* **Maha Metro Data Pipeline**: Integration of official schedules and station access infrastructure.
