# TransitOS

### Transit Data Infrastructure & Mobility Intelligence
*Building a connected, data-driven foundation for urban mobility in India.*

[![Web Application](https://img.shields.io/badge/Production_Platform-metro--radar.vercel.app-000000.svg?style=flat-square&logo=vercel)](https://metro-radar-blush.vercel.app)
[![API Gateway](https://img.shields.io/badge/API_Gateway-transitos--33xk.onrender.com-46E3B7.svg?style=flat-square&logo=render)](https://transitos-33xk.onrender.com/health)
[![API Documentation](https://img.shields.io/badge/OpenAPI-Swagger_Docs-85EA2D.svg?style=flat-square&logo=swagger)](https://transitos-33xk.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

TransitOS is a geospatial transit data platform designed to transform fragmented transport information into structured, validated, interoperable data that can power passenger applications, developer services, and mobility research.

The platform brings together transit network data, station infrastructure, pedestrian connectivity, routing services, and spatial analytics through a shared data model and versioned APIs.

Beginning with Mumbai, TransitOS aims to establish a reusable technical foundation for understanding, navigating, and analysing urban transit networks across Indian metropolitan regions.

[Explore the Platform](https://metro-radar-blush.vercel.app) · [API Documentation](https://transitos-33xk.onrender.com/docs) · [GitHub Repository](https://github.com/Gautam2665/MetroRadar)

---

## Why TransitOS?

Urban mobility data is often distributed across different agencies, operators, formats, and systems. Timetables, station layouts, pedestrian access, interchange connections, and operational information are typically maintained in silos, making it difficult to build applications that understand the complete passenger journey.

TransitOS addresses this challenge by connecting these datasets within a structured transit data infrastructure.

The objective is not simply to display transit routes. It is to make transport networks machine-readable, spatially connected, discoverable, and usable by multiple applications and analytical tools.

### Core Principles

* **Interoperability**: Structure transit information around consistent data models, standard transit formats (GTFS), and documented APIs.
* **Spatial Accuracy**: Represent stations, entrances, platforms, and pedestrian connections as meaningful physical infrastructure rather than dimensionless points.
* **Data Provenance**: Preserve source information, licensing, validation results, and known limitations across every dataset tier.
* **Reusable Infrastructure**: Build shared services that can support passenger applications, developers, researchers, and public operators.
* **Public Value**: Make reliable transport information more useful for accessibility evaluation, mobility analysis, and better-informed transit planning.

### Positioning in India's Urban Data Ecosystem

Initiatives such as the **India Urban Data Exchange (IUDX)** and the **National Urban Digital Mission (NUDM)** have established the importance of open standards, shared data models, and responsible data exchange for Indian cities. 

TransitOS aligns with these broader principles by focusing specifically on the transit and spatial mobility domain: structuring, validating, and exposing multi-agency transit network data through developer-friendly interfaces.

> *Note: TransitOS is an independently developed open platform designed around digital public infrastructure principles. References to public initiatives describe shared design philosophies and do not imply official affiliation, endorsement, or formal integration.*

---

## The Platform

TransitOS combines five complementary capabilities:

```mermaid
flowchart TD
    subgraph S1["1. Transit Data Infrastructure"]
        D1["Canonical Transit Model (CTM)"]
        D2["GTFS Ingestion & Schedule Storage"]
        D3["Validation, Provenance & Catalogue"]
    end

    subgraph S2["2. Station & Physical Infrastructure"]
        I1["Station Entrances & Gates"]
        I2["Platforms, Levels & Facilities"]
        I3["Pedestrian Pathways & Interchanges"]
    end

    subgraph S3["3. Routing & Real-Time Services"]
        R1["Multimodal Transit Graph"]
        R2["Alternative Route Evaluation"]
        R3["Schedule-Based & Real-Time Predictions"]
    end

    subgraph S4["4. Mobility Intelligence"]
        M1["Pedestrian Isochrones & Catchments"]
        M2["Interchange Friction Analysis"]
        M3["Planned: Accessibility & Corridor Analytics"]
    end

    subgraph S5["5. Applications & Developer APIs"]
        A1["Commuter Application"]
        A2["Transit Data Explorer"]
        A3["Versioned Developer APIs"]
    end

    S1 --> S2
    S1 --> S3
    S2 --> S3
    S2 & S3 --> S4
    S3 & S4 --> S5
```

### 1. Transit Data Infrastructure
A structured foundation for collecting, validating, storing, and serving transit information.
* Canonical relational transit data model implemented in PostgreSQL and PostGIS.
* Automated GTFS ingestion, timetable synthesis, and validation workflows.
* Dataset catalogue maintaining provenance, licensing metadata, and data-quality scores.
* Relational management of transit agencies, lines, stations, stop sequences, and service calendars.

The goal is to maintain a single consistent representation of transit networks rather than requiring every application to interpret fragmented source files independently.

### 2. Transit Network & Station Infrastructure
A spatial representation of the physical and operational elements that shape a passenger journey.
* Transit systems, corridors, and station sequences.
* Ground-truthed station entrances and access gates.
* Platforms, vertical levels, and station facilities.
* Pedestrian access networks, foot overbridges (FOBs), and physical interchange walkways.
* Walking catchments and spatial relationships to surrounding neighbourhoods.

By representing station access and interchange connectivity explicitly, TransitOS supports more realistic passenger routing than models that collapse entire multi-line stations into a single coordinate point.

### 3. Routing & Real-Time Services
Network and journey services built on top of the shared data foundation.
* Multimodal transit graph construction combining revenue transit runs with pedestrian walk links.
* Alternative journey planning with Pareto-optimal ranking across travel time, transfers, and walking distance.
* Physical walking connections and realistic interchange transfer impedances.
* Gate-to-gate and station-to-station navigation guidance.
* Real-time departure predictions and delay tracking, with GTFS-Realtime telemetry ingestion where supported by operator feeds.

### 4. Mobility Intelligence
Analytical tools that use transit networks and spatial data to investigate urban mobility.
* **Current Capabilities**:
  * Pedestrian catchment polygons (5, 10, and 15-minute isochrones) along real street networks.
  * Station and interchange connectivity analysis.
  * Network coverage and spatial overlap assessments.
  * Dataset quality, completeness, and validation audits.
  * Realized travel duration and transfer friction characteristics.
* **Planned Research Modules**:
  * Opportunity-weighted accessibility to employment and civic amenities.
  * Origin–destination passenger assignment models.
  * Corridor scenario simulation and network resilience evaluation.

*These planned capabilities are introduced as their underlying datasets, empirical methodologies, and peer validations mature.*

### 5. Applications & Developer APIs
TransitOS exposes its shared data and services through purpose-built interfaces:
* **Commuter Platform**: A passenger-facing experience for journey planning, transit exploration, and entrance-specific navigation.
* **Transit Data Explorer**: A spatial workspace for exploring lines, stations, interchanges, and dataset coverage.
* **Developer Platform**: Versioned REST APIs and OpenAPI documentation for external applications and research workflows.
* **Mobility Intelligence Workspace**: An evolving interface for accessibility analysis and transit planning research.

---

## Technology Stack

| Component | Technology | Role |
|---|---|---|
| **Backend & Services** | NestJS, TypeScript, Node.js | Microservice APIs, graph compilers, and routing engine |
| **Spatial Database** | PostgreSQL 16, PostGIS 3.4 | Canonical relational store, spatial indexing (GIST), geometric analysis |
| **Data Access** | Prisma ORM | Typed database schema, migrations, and query execution |
| **In-Memory Cache** | Redis | Transit graph caching and fast session state |
| **Web Applications** | Next.js 16, React 19, Tailwind CSS | Passenger interface, Data Explorer, and admin tools |
| **Geospatial Visualisation** | MapLibre GL, GeoJSON | Vector map rendering, isochrones, and digital twin layouts |
| **Transit Specifications** | GTFS Schedule & GTFS-Realtime | Canonical timetable definitions and vehicle telemetry |
| **Validation** | MobilityData GTFS Validator & Jest | Standards conformance and comprehensive test coverage |

---

## TransitOS API

The TransitOS API exposes structured transit data and routing capabilities through versioned HTTP endpoints.

* **Base URL:** `https://transitos-33xk.onrender.com/api/v1`
* **Interactive Documentation:** [OpenAPI / Swagger Explorer](https://transitos-33xk.onrender.com/docs)
* **System Health:** `https://transitos-33xk.onrender.com/health`

### Key Endpoints

| Resource | Method & Path | Description |
|---|---|---|
| **Networks** | `GET /networks` | Discover supported transit systems and coverage areas |
| **Corridors** | `GET /corridors` | Retrieve transit corridors, lines, codes, and metadata |
| **Stations** | `GET /stations` | Query stations, search by coordinates, and explore lines |
| **Station Detail** | `GET /stations/:id` | Retrieve station infrastructure, platforms, and verified gates |
| **Interchanges** | `GET /interchanges` | Inspect physical interchange hubs and transfer corridors |
| **Datasets** | `GET /datasets` | Discover registered transit datasets, versions, and provenance |
| **Journey Planning** | `GET /journeys` | Generate multi-criteria transit routes with leg breakdown |

*Refer to the [API Documentation](https://transitos-33xk.onrender.com/docs) for schema definitions, query parameters, and response structures.*

---

## Data Quality & Governance

A reliable transit data platform must communicate where data originates, how it is processed, and what assumptions are applied.

TransitOS structures its data pipeline around a transparent lifecycle:

1. **Discovery**: Identify authoritative operator sources, open spatial registries, and official publications.
2. **Ingestion**: Parse source formats into structured relational representations.
3. **Validation**: Enforce schema constraints, coordinate bounds, duplicate detection, and referential integrity checks.
4. **Provenance**: Record source attribution, date of capture, processing scripts, and licensing conditions.
5. **Publication**: Expose validated data via versioned APIs and documented feeds.
6. **Maintenance**: Document known limitations and update datasets as physical infrastructure evolves.

```
Authoritative Sources       Open Registries        Survey & Geometry
  (Timetables / DMRC)      (OSM / Municipal)       (Station Entrances)
           │                       │                        │
           └───────────────────────┼────────────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ Data Quality & Validation    │
                    │ Schema · Topology · GTFS QA  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ Provenance & Trust Tiers     │
                    │ P0 (Auth) · P1 (Curated)     │
                    └──────────────┬───────────────┘
```

> **Data Integrity Notice**: Schema compliance does not imply complete real-world coverage. Official operator data, open geographic datasets, and independent field surveys have different precision levels. Known limitations and licensing conditions are documented in our [Data Quality & Provenance Guide](./docs/data/provenance-and-trust.md).

---

## Regional Scope

TransitOS is deployed initially around the **Mumbai Metropolitan Region (MMR)** transit network:
* Metro Lines 1, 2A, 2B, 3, 7, 9, and Monorail.
* Key interchange hubs connecting Metro corridors to Western and Central Suburban Rail networks.
* Ground-truthed entrance gate coordinates and physical FOB connections.

### Regional Expansion Framework
Rather than assuming operational conditions are uniform across Indian cities, TransitOS uses a repeatable deployment framework:
1. Identify primary transit authorities and available timetable/spatial sources.
2. Structure network topology into the Canonical Transit Model.
3. Survey and validate key station entrances and interchange corridors.
4. Deploy versioned regional endpoints and validate routing behavior against ground realities.

Future expansion to additional metropolitan regions (such as Pune and Nagpur) will follow this verified methodology based on data availability and validation readiness.

---

## Research & Public Value

TransitOS aims to support evidence-based transport planning, academic research, and open-source civic technology.

### Areas of Inquiry
* **First-and-Last-Mile Accessibility**: Measuring pedestrian catchment equity using physical street networks rather than simple Euclidean buffers.
* **Interchange Friction**: Quantifying the impact of vertical level changes, long walking corridors, and security checkpoints on transfer choice.
* **Network Coverage & Equity**: Assessing public transport accessibility to employment centres, healthcare facilities, and educational hubs.
* **Data Interoperability**: Developing reusable patterns for harmonising multi-agency transit feeds across Indian cities.

Academic and research inquiries are welcomed. For collaboration pathways (including student research and institutional studies), consult our [Research Integrity & Guidelines](./docs/governance/research-and-limitations.md).

---

## Repository Organisation

The repository is structured as a TypeScript monorepo:

```
MetroRadar/
├── apps/
│   ├── backend/          # NestJS API, routing engines, CTM models, and GTFS pipelines
│   └── frontend/         # Next.js commuter application and transit workspace
├── database/             # Prisma schema, migrations, and seed scripts
├── datasets/             # Canonical GTFS feeds, station blueprints, and GIS layers
│   └── mumbai/           # Mumbai network assets, schedules, and interchange data
├── docs/                 # Platform, architecture, and governance documentation
│   ├── vision/           # Product overview and strategic framework
│   ├── architecture/     # System architecture and Canonical Transit Model specs
│   ├── data/             # Data catalogue, quality pipelines, and provenance
│   ├── api/              # Developer API reference and integration guides
│   ├── mobility-intelligence/ # Accessibility isochrones and analytical models
│   └── governance/       # Research limitations, licensing, and integrity
├── scripts/              # Synchronization, GTFS export, and GIS conversion tools
├── tools/                # Network certification and geometry enrichment utilities
├── CONTRIBUTING.md       # Contribution guidelines and development workflow
├── LICENSE               # Software license (MIT)
└── README.md
```

---

## Getting Started

### Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS)
* **npm**: `v10.x` or newer
* **PostgreSQL / PostGIS**: PostgreSQL 16+ with PostGIS 3.4+ extension
* **Redis**: Redis 7+ (optional for local dev; in-memory fallback available)
* **Docker & Docker Compose**: Optional, for containerised database setup

### 1. Clone the Repository
```bash
git clone https://github.com/Gautam2665/MetroRadar.git
cd MetroRadar
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root based on your local database credentials:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/metroradar?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/metroradar?schema=public"
PORT=3001
```

### 3. Database Setup & Prisma Generation
```bash
# Generate the Prisma Client
npm run db:generate

# Push schema to local database
npm run db:push
```

### 4. Run Development Servers
```bash
# Start backend API (NestJS on port 3001)
npm run backend:dev

# In a separate terminal, start frontend (Next.js on port 3000)
npm run frontend:dev
```

### 5. Build for Production
```bash
# Build both backend and frontend applications
npm run build
```

---

## Documentation Index

Explore the comprehensive platform documentation:

* **Platform Vision & Strategy**:
  * [Product Overview](./docs/vision/product-overview.md) — Strategic purpose, user segments, and core capabilities.
  * [Product Strategy](./docs/vision/product-strategy.md) — Phased milestones and public value framework.
* **Architecture & Data Models**:
  * [Platform Architecture](./docs/architecture/platform-architecture.md) — Detailed five-layer technical architecture and data flows.
  * [Canonical Transit Model (CTM)](./docs/architecture/canonical-transit-model.md) — Entity relationships, spatial schema, and walking graph specs.
* **Data, Quality & Provenance**:
  * [Data Catalogue](./docs/data/data-catalogue.md) — Complete capabilities matrix and data asset index.
  * [Data Quality Framework](./docs/data/data-quality.md) — Validation pipelines, automated audits, and schema integrity.
  * [Provenance, Licensing & Trust](./docs/data/provenance-and-trust.md) — Source attribution, trust tiers, and licensing boundaries.
* **APIs & Mobility Intelligence**:
  * [API Overview & Reference](./docs/api/api-overview.md) — REST endpoint specifications, authentication, and examples.
  * [Station Accessibility](./docs/mobility-intelligence/accessibility.md) — Step-free access, station entrances, and pedestrian reach.
  * [Mobility Intelligence Analytics](./docs/mobility-intelligence/future-analytics.md) — Interchange friction, catchment modeling, and future research tracks.
* **Governance**:
  * [Research Integrity & Limitations](./docs/governance/research-and-limitations.md) — Scope of claims, ground truth standards, and research disclaimers.
* **Project Roadmap & Tasks**:
  * [Architecture Blueprint](./ARCHITECTURE.md)
  * [Development Roadmap](./ROADMAP.md)
  * [Implementation Tracker](./TODO.md)
  * [Contributing Guide](./CONTRIBUTING.md)

---

## Contributing

We welcome technical contributions that improve data quality, spatial accuracy, API functionality, and documentation.

Areas where contributors can get involved:
* Ground-truthing station entrance and gate coordinates.
* Enhancing pedestrian sidewalk connectivity and barrier descriptions.
* Expanding automated validation checks and tests.
* Improving documentation, tutorials, and API examples.

Please read our [Contributing Guide](./CONTRIBUTING.md) for details on code style, commit standards, and the pull request process. Contributions involving external datasets must include explicit source attribution and licensing terms.

---

## License

* **Software**: The code in this repository is licensed under the [MIT License](./LICENSE).
* **Datasets**: Individual datasets may be subject to specific operator, public record, or open database licenses. Consult individual dataset metadata in [`datasets/`](./datasets) for applicable attribution, redistribution, and usage conditions before redistributing data.
