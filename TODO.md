# TransitOS Development Backlog & Milestone Tracker

Follow this unified Sprint & Version checklist to build **TransitOS** (formerly MetroRadar) as a modular set of platform blocks.

---

## 🚦 Unified Sprint & Version Mapping

| Sprint | Version | Scope / Milestone Name | Status |
| :--- | :--- | :--- | :---: |
| **Sprint 1** | **v0.1** | **Infra & Monorepo Foundation** | ✅ Complete |
| **Sprint 2** | **v0.2** | **Spatial Database & CTM Schema** | ✅ Complete |
| **Sprint 3** | **v0.3** | **GTFS Static Ingestion Engine** | ✅ Complete |
| **Sprint 3.5** | **v0.4** | **Dataset Validation CLI** | ✅ Complete |
| **Sprint 4** | **v0.4.5** | **GIS Map Engine & Digital Twin** | ✅ Complete |
| **Sprint 5** | **v0.5** | **Journey Intelligence Pathfinder** | ✅ Complete |
| **Sprint 5.1** | **v0.5.1** | **GTFS-Realtime Telemetry Infrastructure** | 🚧 Architecture Ready |
| **Sprint 5.2** | **v0.5.2** | **Stitch Passenger UI Translation** | ⏳ Planned |
| **Sprint 6** | **v0.6** | **Fare Engine & Mock Ticketing** | ⏳ Planned |
| **Sprint 7** | **v0.7** | **AI & Language Gateway (Sarvam)** | ⏳ Planned |
| **Sprint 8** | **v0.8** | **Ambient & Smartwatch Computing** | ⏳ Planned |

---

## 🧱 Completed Milestones (Authoritative Record)

### ✅ Sprint 1 - v0.1: Monorepo & Infrastructure Foundation
- [x] Configure monorepo environments (`npm` workspaces, root `package.json`).
- [x] Create shared tooling configurations (`packages/config` containing eslint, tsconfig).
- [x] Build local developer container environments in `docker/dev`.
- [x] Establish NestJS backend framework (`apps/backend`) and Next.js frontend framework (`apps/frontend`).

### ✅ Sprint 2 - v0.2: Spatial Database & Canonical Transit Model
- [x] Enable PostGIS extension (`CREATE EXTENSION IF NOT EXISTS postgis`) and verify spatial queries (`ST_DistanceSphere`).
- [x] Write Prisma CTM schemas (systems, stations, lines, trips, stop_times, calendars, shapes, entrances, levels, platforms).
- [x] Create initial database seeding scripts (`prisma/seed.ts` for Mumbai Metro Line 2A & 7).

### ✅ Sprint 3 - v0.3: GTFS Static Ingestion Engine
- [x] Implement static GTFS schedule importer in `apps/backend/src/modules/ingestion`.
- [x] Build zip feed archive validator (`gtfs-archive.validator.ts`) and station normalizer.
- [x] Implement database transaction locks for safe feed ingestion session tracking (`IngestionSession`).

### ✅ Sprint 3.5 - v0.4: Dataset Validation CLI & City Imports
- [x] Build GTFS dataset validation CLI to parse, test, and import real-world operator feeds.
- [x] Validate and ingest official GTFS feeds for **Kochi Metro (KMRL)** and **Delhi Metro (DMRC)**.

### ✅ Sprint 4 - v0.4.5: GIS Map Engine & Digital Twin Inspector
- [x] Integrated MapLibre GL JS vector map engine with CartoDB dark-matter styling.
- [x] Created `DigitalTwinService` and `StationsController` (`GET /stations/:id/digital-twin`).
- [x] Created interactive visual station inspector drawer with serving line badges, physical levels, entrances, and amenity tags.

### ✅ Sprint 5 - v0.5: Journey Intelligence Engine
- [x] Built graph-builder service (`GraphBuilderService`) supporting multi-line transfers and interchange walk connections.
- [x] Developed Dijkstra routing engine (`RoutingService`, `ScoringService`) with configurable walking weights (`0.8`) and transfer penalties (`180s`).
- [x] Fixed station interchange walking edges ( Sarai Kale Khan ➔ Dhaula Kuan ➔ IGI Airport travelator connection).
- [x] Exposed REST endpoint `GET /journeys?from=:originId&to=:destId` returning GeoJSON feature collections and leg timelines.

---

## 🏃 Active & Upcoming Backlog

### 🚧 Sprint 5.1 - v0.5.1: GTFS-Realtime Telemetry Infrastructure (Backend)
- [x] Architecture & Implementation Plan finalized (`implementation_plan.md`).
- [ ] Create dedicated `RealtimeModule` (`apps/backend/src/modules/realtime/`).
- [ ] Implement `FeedPollerService` background scheduler (polled asynchronously every 30s).
- [ ] Implement `GtfsRtParserService` decoding binary `.pb` streams into `NormalizedVehicle` objects.
- [ ] Store telemetry in Redis (`realtime:vehicles:OTD:DMRC`) to guarantee sub-5ms client reads.
- [ ] Expose `GET /realtime/vehicles` with fallback serving last cached data (`isStale: true`) if government feeds fail.

### ⏳ Sprint 5.2 - v0.5.2: Passenger Experience UI Translation
- [ ] Implement command-center UI design system (`#080C14` matte background, neon line pills, glassmorphism drawers).
- [ ] Integrate live real-time vehicle markers and next-train ETA badges into the map container.
- [ ] Build multimodal trip planning view with transfer timeline step cards.
- [ ] Build placeholder pages (`/passes`, `/alerts`, `/analytics`, `/settings`) with "Coming Soon (Sprint 6+)" platform cards.

### ⏳ Sprint 6 - v0.6: Fare Intelligence, Wallet & Booking Platform
- [ ] Build `FareService` calculating zone pricing, flat rates, and transfer discounts.
- [ ] Build `BookingService` with standard JSON schema: `bookJourney()`, `cancelJourney()`, `refundTicket()`.
- [ ] Implement Provider Adapter Layer (`MockOndcAdapter`, `MockDmrcAdapter`) returning SVG/Base64 QR pass barcodes.
- [ ] Build `PassengerWallet` as a **pre-loaded stored-value wallet** (key UX rationale: bypasses per-transaction OTP/biometric auth on smartwatch and voice interfaces — user tops up once, subsequent deductions are instant). v1.0 = mock balance; production path = UPI AutoPay mandate via Razorpay/Cashfree.
- [ ] Build `RewardsService` tracking points/cashback accumulation in TransitOS database.
- [ ] Build `PassService` issuing TransitOS digital passes (Monthly/Weekly/Daily) tracked in DB with journey consumption counter (`journeysUsed / journeysTotal`). For QR-capable operators (KMRL), generate scannable QR. For NCMC-only operators (DMRC), serve as booking record only.
- [ ] Build `PaymentService` routing between: (1) pre-loaded wallet deduction, (2) UPI AutoPay mandate, (3) UPI/card direct (via Razorpay/Cashfree aggregator).
- [ ] Store NCMC card number (`ncmcCardNumber`) as saved top-up method reference only — displayed in UI for wallet recharge flow; no live balance query or gate-tap payment possible.
- [ ] Build `TripHistoryService` recording journeys **originated through TransitOS** (planned, booked, or QR-validated). Scope clearly: NCMC gate-tap journeys from physical card are invisible — no public API exists to fetch them.

### ⏳ Sprint 7 - v0.7: AI & Language Gateway (Sarvam AI)
- [ ] Implement `AIGatewayService` as a thin explanation wrapper.
- [ ] Enforce Golden Rule: **TransitOS computes, AI communicates** (AI reads structured JSON output, zero direct DB access or route computation).
- [ ] Integrate Sarvam AI for Indian regional voice recognition and speech/text translation.
- [ ] Integrate OpenAI/Gemini for route rationale synthesis and station signage image QA.

### ⏳ Sprint 8 - v0.8: Ambient & Proactive Computing
- [ ] Develop smartwatch layout endpoints for active QR ticket barcodes and live train ETAs.
- [ ] Connect calendar API to suggest proactive route options (e.g. "Airport meeting tomorrow: Day Pass recommended").
- [ ] Prototype AR station indoor navigation overlays.
