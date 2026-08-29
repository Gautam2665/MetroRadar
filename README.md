# TransitOS 🚇📡
### The Urban Intelligence & Mobility Platform
*(Formerly MetroRadar)*

[![Backend](https://img.shields.io/badge/Backend-NestJS-red.svg?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-black.svg?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_/_PostGIS-blue.svg?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748.svg?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Realtime](https://img.shields.io/badge/Realtime-Redis-DC382D.svg?style=flat-square&logo=redis)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

TransitOS is an **Urban Intelligence Platform** and **India's GTFS Infrastructure Platform** designed to build a complete digital twin of every Indian city transit network. Instead of depending on operators to publish GTFS, TransitOS synthesizes, calibrates, and models transit data into a unified Canonical Transit Model (CTM).

The platform powers passenger web/mobile applications, operational digital twin inspectors, intelligent pathfinding APIs, and real-world calibrated delay predictions.

---

## 🏗️ Master System Architecture

```
                         TRANSITOS
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
     TRANSIT DATA      TRANSIT          TRANSIT
      PLATFORM       INTELLIGENCE      EXPERIENCE
             │              │              │
             │              │              ├── Web (Next.js / MapLibre)
             │              │              ├── Mobile (React Native / PWA)
             │              │              ├── Wear OS (Smartwatch)
             │              │              ├── Telegram (Voice Bot Lab)
             │              │              └── WhatsApp (Conversational)
             │              │
             │              ├── Journey Engine (Dijkstra CTM)
             │              ├── Prediction Engine (Delays / ETA)
             │              ├── Digital Twin (3D Station Layouts)
             │              ├── Analytics (Line Efficiency / Congestion)
             │              ├── Notification Engine (Push Alerts)
             │              └── Commercial & Booking Engine
             │
             ▼
       CANONICAL TRANSIT MODEL (CTM v1.0)
             │
       ┌─────┼─────────────────────┐
       │     │          │          │
      GTFS  DPRs     GIS/Data   Historical
    (A/B)  (A–G)       (F)     Observations
       │     │          │          ▲
       │     │          │          │
       └─────┴──────────┴──────────┤
                                   │
                           Observation Pipeline
                           (Pi / Phone / RT)
                                   │
                          Calibration Warehouse

And above the Intelligence Layer:

                 INTELLIGENCE GATEWAY
                         │
             ┌───────────┼───────────┐
             │           │           │
           Sarvam      Gemini      OpenAI
             │           │           │
          Speech       Vision     Reasoning
```

---

## 🔒 Core Architectural Principles

1. **The Golden Rule**:  
   > **TransitOS computes. External AI communicates.**  
   > Routing, delay forecasting, fare math, and digital twin queries execute deterministically on TransitOS backend engines. External AI (Sarvam AI, OpenAI, Gemini) sits strictly as a translation/voice interface.
2. **Calibration & Observation Platform**:  
   * The Raspberry Pi (along with phone GPS and RT traces) is an empirical **ground-truth measurement instrument**, *never* a production runtime dependency.  
   * Field observations continuously calibrate synthesized assumptions (e.g. DPR speed model $150\text{s} \xrightarrow{\text{20 field trips}} \text{median } 153\text{s}$, elevating confidence to $0.91$).
3. **Commerce vs. Transit Data**:  
   * **ONDC** is strictly a transaction and ticketing network, *never* the transit data warehouse.  
   * TransitOS abstracts payment methods (UPI, Card, NCMC, partner wallets) without holding user funds directly.

---

## 🧱 The Four Platform Layers

*   **Layer 0: Transit Knowledge & Calibration Platform**: Owns document ingestion (Categories A–I + X), extraction pipelines, the Transit Data Synthesis Engine (TDSE), provenance tracking (`ProvenanceRecord`), confidence scoring, and the Calibration Warehouse.
*   **Layer 1: Transit Data Platform**: Owns GTFS Schedule feeds, GTFS-Realtime telemetry, Canonical Transit Model (CTM v1.0), PostgreSQL + PostGIS spatial persistence, Redis caching, and public REST/WebSocket APIs.
*   **Layer 2: Transit Intelligence Platform**: Owns Dijkstra journey routing, the Prediction Engine (delay propagation), Digital Twin service, Fare Intelligence, Booking Engine, and platform analytics.
*   **Layer 3: Transit Experience Platform**: Owns the passenger web dashboard (Next.js / MapLibre), mobile apps, smartwatch integrations (Wear OS), and voice bot prototypes (Telegram).

---

## 🚦 Phased Roadmap & Milestone Status

```
v0.5 (Journey API) ──> v0.5.5 (National Certification) ──> v0.6 (Passenger UI) ──> v0.6.5 (National Expansion & Calibration)
                                                                                             │
                                                                                             ▼
v1.1+ (Wear OS / Ambient) <── v1.0 (Booking & ONDC) <── v0.9 (Voice & AI Gateway) <── v0.8 (Analytics) <── v0.7 (Prediction Engine)
```

| Version | Milestone Scope | Status |
| :--- | :--- | :---: |
| **v0.5** | Core transit database, static GTFS parser, Dijkstra pathfinding engine | ✅ Complete |
| **v0.5.5** | National GTFS Certification (6 Metros Ingested) & CTM v1.0 Schema Freeze | ✅ Complete |
| **v0.6** | Passenger Experience & Benchmark UI (MapLibre, Digital Twin, Step-by-Step Directions) | ✅ Complete |
| **v0.6.5** | **National Transit Expansion & Calibration Baseline (Mumbai CTM, Pi Pipeline)** | 🚧 **Active / Next** |
| **v0.7** | Prediction Engine & Operational Intelligence (Delays, Headways, Fleet-State Digital Twin) | ⏳ Planned |
| **v0.8** | Analytics & Operator Intelligence (Line efficiency, congestion modeling, bottlenecks) | ⏳ Planned |
| **v0.9** | Intelligence Gateway & Voice Laboratory (Sarvam AI STT/TTS + Telegram Voice Bot) | ⏳ Planned |
| **v1.0** | Commerce & Booking Platform (ONDC Buyer Application Adapter, Payment Abstraction) | ⏳ Planned |
| **v1.1+** | Ambient Computing & Advanced Interfaces (WhatsApp Business, Wear OS Smartwatch) | ⏳ Planned |

---

## 📁 Monorepo Structure

```
MetroRadar/ (TransitOS Monorepo)
├── apps/
│   ├── backend/        # NestJS API application (GIS, Ingestion, Journey, Realtime, Redis)
│   └── frontend/       # Next.js 15 App Router web application (MapLibre GL, Stitch UI)
├── database/
│   └── prisma/         # Prisma Schema (schema.prisma), seed scripts & PostGIS migrations
├── datasets/           # Authoritative static GTFS feeds & certification reports
├── design/             # Unified design system parameters (colors, typography, animations)
├── docker/             # Container orchestration and service environment files
├── packages/           # Shared monorepo configuration packages
├── API_GUIDE.md        # Comprehensive backend REST & WebSocket API guide
├── ARCHITECTURE.md     # Deep dive systems architecture manual
├── GTFS_SYNTHESIS.md   # Transit Data Synthesis Engine (TDSE) reference specification
├── PROJECT_BIBLE.md    # Master architectural reference document
├── ROADMAP.md          # Phased platform roadmap (v0.5 to v1.1+)
└── TODO.md             # Active developer backlog and milestone checklist
```

---

## 🏁 Getting Started

### Prerequisites
* **Node.js** (v18+ LTS or v20+)
* **Docker & Docker Compose**
* **PostgreSQL with PostGIS** (included in `docker-compose.yml`)
* **Redis** (included in `docker-compose.yml`)

### Installation & Quick Start

1. **Clone repository:**
   ```bash
   git clone https://github.com/Gautam2665/MetroRadar.git
   cd MetroRadar
   ```

2. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start Background Infrastructure (PostGIS & Redis):**
   ```bash
   docker-compose up -d
   ```

5. **Initialize Database Schema:**
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push relational CTM v1.0 schema to PostGIS
   npm run db:push
   ```

6. **Run Development Servers:**
   ```bash
   # Backend (NestJS on http://localhost:3001)
   npm run start:dev --workspace=apps/backend

   # Frontend (Next.js on http://localhost:3000)
   npm run dev --workspace=apps/frontend
   ```

---

## 🧪 Testing & Verification

```bash
# Run backend unit tests (24/24 tests)
npm run test --workspace=apps/backend

# Run backend end-to-end tests
npm run test:e2e --workspace=apps/backend

# Run monorepo linting
npm run lint

# TypeScript verification
npx tsc --noEmit --project apps/backend/tsconfig.json
npx tsc --noEmit --project apps/frontend/tsconfig.json
```

---

## 📖 Master Documentation
* [ARCHITECTURE.md](./ARCHITECTURE.md) — Master systems architecture manual
* [PROJECT_BIBLE.md](./PROJECT_BIBLE.md) — Permanent architectural reference & governance
* [ROADMAP.md](./ROADMAP.md) — Phased platform roadmap (v0.5 to v1.1+)
* [GTFS_SYNTHESIS.md](./GTFS_SYNTHESIS.md) — Transit Data Synthesis Engine (TDSE) specification
* [API_GUIDE.md](./API_GUIDE.md) — Backend API reference guide
* [TODO.md](./TODO.md) — Active developer backlog tracker
