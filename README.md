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

TransitOS is an **Urban Intelligence Platform** designed to build digital twins of city transit networks. It integrates static transit scheduling (GTFS Static), geospatial modeling (PostgreSQL/PostGIS), and real-time feeds (GTFS-RT) into a unified high-performance data architecture. 

The platform powers passenger applications, operational transit dashboards, intelligent APIs, and AI-driven predictions to optimize passenger commutes and track transit health.

---

## 🚀 Key Value Proposition
Modern transit networks suffer from fragmented scheduling, a lack of station indoor directories, and unpredictable route delays. TransitOS builds a modular **six-layer model** to systematically unify transit infrastructure:

1.  **Transit Layer**: Complete scheduled timelines, train positions, track geometries, and real-time arrival feeds.
2.  **Station Layer**: Indoor platform paths, levels, exits, facilities, and accessibility metrics.
3.  **Commercial Layer**: Station directories, in-station retail, ads bidding networks, and passenger coupons.
4.  **Passenger Layer**: Historic routes indexing, preferences cataloging, and live context alerts.
5.  **AI Layer**: Real-time delay propagation algorithms and smart route suggestions.
6.  **Analytics Layer**: Crowd density indices, line performance reports, and operational dashboards.

---

## 🏗️ System Architecture

### High-Level Components
```
           GTFS Static / GTFS-RT
                     │
                     ▼
           Transit Ingestion Engine
                     │
           ┌─────────┴─────────┐
           │                   │
     Journey Planner       Analytics
           │                   │
           └─────────┬─────────┘
                     ▼
                AI Services
                     │
           Passenger Applications
```

### Technical Data Flow
```mermaid
flowchart TD
    %% Define Styles
    classDef datasource fill:#18181b,stroke:#3b82f6,stroke-width:2px,color:#f4f4f5;
    classDef pipeline fill:#18181b,stroke:#06b6d4,stroke-width:2px,color:#f4f4f5;
    classDef storage fill:#18181b,stroke:#10b981,stroke-width:2px,color:#f4f4f5;
    classDef services fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#f4f4f5;
    classDef client fill:#09090b,stroke:#27272a,stroke-width:2px,color:#f4f4f5;

    %% Nodes
    subgraph DataSources["External Data Feeds"]
        GS["GTFS Static (Schedules & Shapes)"]:::datasource
        GR["GTFS Realtime (Vehicle Positions & Trip Updates)"]:::datasource
    end

    subgraph Pipelines["Ingestion & Cache Engine"]
        StaticWorker["Static Ingest Pipeline<br/>(Prisma & Validation CLI)"]:::pipeline
        RealtimeWorker["Realtime PubSub Engine<br/>(WebSocket Daemon)"]:::pipeline
    end

    subgraph Storage["Persistence & Caching"]
        Postgres[("PostgreSQL + PostGIS<br/>(Authoritative Database)")]:::storage
        RedisCache[("Redis Cache & Broker<br/>(Active Memory Overlay)")]:::storage
    end

    subgraph CoreServices["NestJS Services (API Gateway)"]
        JourneyAPI["Journey Planner & Routing<br/>(Dijkstra/A* Engines)"]:::services
        AnalyticsEngine["Analytics Engine<br/>(Crowd & Performance logs)"]:::services
        AIService["AI Predictor<br/>(Delay Telemetry models)"]:::services
    end

    subgraph Clients["Frontend Interfaces (Next.js Dashboard)"]
        DynamicMaps["Interactive MapLibre GL Map"]:::client
        AdminDashboard["Analytics Dashboard"]:::client
        CommuterApp["Passenger Routes App"]:::client
    end

    %% Relationships
    GS --> StaticWorker
    GR --> RealtimeWorker

    StaticWorker --> Postgres
    RealtimeWorker --> RedisCache

    Postgres --> JourneyAPI
    Postgres --> AnalyticsEngine
    RedisCache --> AIService
    Postgres --> AIService

    JourneyAPI --> Clients
    AnalyticsEngine --> Clients
    AIService --> Clients
```

*   **Dual-Pipeline Ingestion Strategy**: Splits planned schedule imports and real-time telemetry updates. GTFS Static data is validated and written directly to PostgreSQL. GTFS-RT updates (vehicle positions, trip delays) bypass standard relational database transactions; they are cached directly in Redis and pushed live to frontend clients over WebSockets to avoid transactional bottlenecks.
*   **Loose Coupling & Separation**: Centralized workspaces for configuration rules, lint policies, and TS models. Backend business APIs are decoupled from client interfaces, communicating via lightweight REST controllers and WebSocket events.

---

## 🛠️ Tech Stack & Key Choices

| Tier | Technology | Technical Choice Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React / Next.js** (TypeScript) | Handles stateful passenger maps and dashboard visualizations. |
| **Backend** | **NestJS** (TypeScript) | Structured dependency injection framework ideal for scalable enterprise APIs. |
| **Database** | **PostgreSQL + PostGIS** | Authoritative data store. PostGIS powers native geographic queries (radius searches, coordinate mapping). |
| **ORM** | **Prisma Client** | Type-safe queries, migration flows, and validation rules. |
| **Cache & Pub/Sub** | **Redis** | In-memory storage for high-frequency GTFS-RT updates and message distribution. |
| **Environment** | **Docker & Compose** | Consistent developer and container staging configurations. |

---

## ✨ Core Features

*   **⚡ GTFS Static & Realtime Ingestion**: Ingests transit schedules, agencies, lines, and shape files. A dataset validation pipeline handles real-world feeds (e.g., Mumbai Metro, Kochi Metro, Delhi Metro).
*   **📍 Spatial Database Engine**: Full geographic coordinates integration. Includes custom PostgreSQL triggers to synchronize standard Latitude/Longitude floats into native binary `geometry(Point, 4326)` columns, mapped with GIST spatial indexing.
*   **🛣️ Journey Planning**: Graph-based transit routing engine supporting multi-line transfers, station sequences, and platform-to-platform interchange walk durations.
*   **🏬 Indoor Station Directories**: Maps multi-level platforms, walkways, entrance coordinates, amenities (escalators, parking, ATMs), and retail vendor layout boundaries.
*   **🤖 AI Delay Engine**: Regression algorithms that analyze historic trip discrepancies, active traffic alerts, and passenger commutes to estimate real-time delay propagation.

---

## 📁 Repository Structure
```
MetroRadar/ (TransitOS Monorepo)
├── apps/
│   ├── backend/        # NestJS API application (REST endpoints & WebSockets)
│   └── frontend/       # Next.js web application (Interactive maps & dashboard)
├── database/
│   └── prisma/         # Prisma Schema (schema.prisma), seed scripts (seed.ts) & migrations
├── datasets/           # Authoritative static GTFS feeds (Delhi Metro, Kochi Metro)
├── design/             # Unified design system parameters (colors, typography guidelines)
├── docker/             # Container orchestration and service environment files
├── packages/           # Shared monorepo configuration packages
├── PROJECT_BIBLE.md    # Master architectural reference document
├── ROADMAP.md          # 6-Month platform roadmap and sprint schedules
└── TODO.md             # Micro-checklist and checklist progress tracker
```

---

## 🚦 Current Progress & Status

| Phase | Milestone | Sprint | Status |
| :--- | :--- | :--- | :---: |
| **Infra** | Development container setups, workspace routing, monorepo linters | Sprint 1 | ✅ Complete |
| **Database** | PostGIS coordinates configuration, migration rules, Prisma seeds | Sprint 2 | ✅ Complete |
| **Feeds** | GTFS static ingestion pipelines, import session audit trails | Sprint 3 | ✅ Complete |
| **Validation** | Dataset validation suite, imports (Mumbai Metro, Kochi Metro) | Sprint 3.5 | ✅ Complete |
| **Maps** | Map layout renderers, station plotting, route visualization layers | Sprint 4 | ✅ Complete |
| **Routing** | Dijkstra pathfinder, multi-station walk interfaces | Sprint 5 | 🚧 In Progress |
| **Realtime** | WebSocket streams, live Redis caching, trip update relays | Sprint 6 | ⏳ Planned |
| **Security** | Secure registration, JSON Web Token (JWT) authorization guards | Sprint 7 | ⏳ Planned |
| **Stations** | Detailed platform directions, level mappings | Sprint 8 | ⏳ Planned |
| **Commerce** | Vendor promotions portal, ads engine layout | Sprint 9 | ⏳ Planned |

---

## 🏁 Getting Started

### Prerequisites
- **Node.js** (LTS version - v18+)
- **Docker** (Desktop or daemon with Compose installed)
- **PostgreSQL** with **PostGIS** extension (automatic if using docker-compose)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/MetroRadar.git
    cd MetroRadar
    ```
2.  **Environment Setup:**
    Create a `.env` file in the root directory:
    ```bash
    cp .env.example .env
    ```
    Configure the variables inside `.env` to match your local setup:
    ```env
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/metroradar?schema=public"
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Spin up database services:**
    Run the database and cache services inside background containers:
    ```bash
    docker-compose up -d
    ```
5.  **Initialize Database & Seed data:**
    Push the relational schema to the database, generate Prisma types, and seed the dummy system data:
    ```bash
    # Generate Prisma Client types
    npm run db:generate

    # Push database structure to PostgreSQL
    npm run db:push

    # Seed initial database rows (Mumbai Metro sample)
    npx prisma db seed
    ```
6.  **Run Development Servers:**
    Start backend APIs and Next.js frontend interfaces concurrently:
    ```bash
    # Run Backend API (NestJS)
    npm run start:dev --workspace=apps/backend

    # Run Frontend Dashboard (Next.js)
    npm run dev --workspace=apps/frontend
    ```
    - NestJS APIs will be accessible at: `http://localhost:3001`
    - Next.js dashboard client will be accessible at: `http://localhost:3000`

---

## 🗺️ Master Documentation References
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Deep dive into systems design, data flow, GeoJSON philosophy, and caching strategy.
- [PROJECT_BIBLE.md](./PROJECT_BIBLE.md) - Master architectural reference document, design guidelines, coding principles.
- [ROADMAP.md](./ROADMAP.md) - Full 6-month vision breakdown and sprint schedules.
- [TODO.md](./TODO.md) - Active developer checklist and backlog status tracker.
