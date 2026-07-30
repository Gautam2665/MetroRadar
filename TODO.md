# TransitOS Development Backlog
Follow this version-by-version checklist to build TransitOS (formerly MetroRadar) as a set of modular blocks.

---

## 🧱 Active Checklist

### 🏃 v0.5: Journey Intelligence
- [ ] Configure monorepo environments (npm workspaces, Turbo / Lerna config).
- [ ] Create shared tooling configurations (`packages/config` containing eslint, tsconfig).
- [ ] Build local developer container environments in `docker/dev`.
- [ ] Enable PostGIS extension and verify geographic coordinate query support.
- [ ] Write migrations for core CTM schemas (stations, routes, trips, calendars, shapes).
- [ ] Create migration seed data scripts (e.g. Mumbai Metro Line 2A seed).
- [ ] Implement static GTFS schedule importer in `apps/backend`.
- [ ] Design dataset validation CLI for importing real-world feeds (Kochi, Delhi Metro).
- [ ] Build Dijkstra/A* offline routing algorithms to find paths across subway lines.
- [ ] Develop stations lookup API (`GET /api/v1/stations`) and geographical proximity search.

### 🏃 v0.5.1: Realtime Infrastructure
- [ ] Establish feed reader pipeline for GTFS-RT (real-time vehicle positions & service alerts).
- [ ] Create ingestion sync worker threads in `apps/backend` or separate background worker.
- [ ] Integrate Redis caching for live vehicle coordinates to bypass PostgreSQL write locks.
- [ ] Develop WebSocket gateway channels to push real-time train positions to client web app.

### 🏃 v0.6: Passenger Experience (UI)
- [ ] Initialize Next.js frontend application workspace in `apps/frontend`.
- [ ] Install map-rendering libraries (Leaflet / MapLibre GL) in the web workspace.
- [ ] Build map viewport layout showing station points and color-coded line tracks.
- [ ] Develop station overlay details panel showing facility directories and exits.
- [ ] Standardize deep dark-mode design variables (Matte Charcoal background, neon accents).

### ⏳ v0.7: Prediction & Live Notifications
- [ ] Aggregate historical delay records to feed regression models.
- [ ] Develop transit delay prediction modules to estimate actual arrival timelines.
- [ ] Build notification scheduler pushing alerts on service interruptions or route deviations.
- [ ] Link saved routes and station notifications to Passenger Profiles.

### ⏳ v0.8: Fare Intelligence Engine
- [ ] Create database tables for fares (Zone tables, Flat fares, Distance matrices).
- [ ] Build fare calculations module incorporating line sequences and transfers.
- [ ] Write concession rules evaluation logic (e.g., student/senior discount rates).
- [ ] Build the Pass Recommendation Engine analyzing scheduled meetings and saved route histories.

### ⏳ v0.9: Booking Engine & Adapters
- [ ] Define a generic `Ticket` JSON model for platform-wide tickets.
- [ ] Write standard Booking Engine logic: `bookJourney()`, `cancelJourney()`, `refundTicket()`.
- [ ] Implement generic Provider Adapter Interfaces.
- [ ] Construct adapters for ticketing brokers (ONDC API, DMRC official API).

### ⏳ v1.0: Payment Intelligence & Wallet
- [ ] Develop virtual Passenger Payment Profile to track passes, NCMC cards, and UPI links.
- [ ] Build the Payment Intelligence Engine to calculate the cheapest payment mechanism.
- [ ] Implement Payment Adapter Layer interfaces (UPI, cards, corporate accounts).
- [ ] Integrate mock payment verification flows (supporting interactive and silent payments).

### ⏳ v1.1: AI & Language Gateway
- [ ] Implement the **Intelligence Gateway** as the single entry point for conversational helpers.
- [ ] Integrate query classification models to bypass LLM processing for simple API lookups.
- [ ] Integrate Sarvam AI for natural language voice recognition and regional translations.
- [ ] Integrate OpenAI/Gemini reasoning models to explain route options and layout diagrams.

### ⏳ v1.2: Ambient & Proactive Computing
- [ ] Port live transit ETAs and ticket barcodes to smartwatch layouts.
- [ ] Connect calendar API to suggest proactive journeys and day pass recommendations.
- [ ] Prototype AR station pathing navigation overlays using Gemini vision.
