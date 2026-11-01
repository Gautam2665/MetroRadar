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

### Three Connected Engineering Layers

TransitOS addresses the complete path from raw infrastructure data to actionable mobility intelligence through three integrated layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│             Layer A: Data Acquisition & Geospatial Engineering          │
│   QGIS · JOSM · OSM Extraction · CAD Georeferencing · Network Repair   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Layer B: Transit Data Infrastructure                    │
│    Canonical Transit Model (CTM) · PostGIS · GTFS Ingestion · APIs     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Layer C: Mobility Intelligence & Applications              │
│    Passenger Routing · Station Accessibility · Interchange Analytics   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Data Acquisition & Geospatial Engineering**: Inspecting, extracting, georeferencing, and reconstructing station access and pedestrian connectivity from fragmented GIS, CAD, and community sources.
2. **Transit Data Infrastructure**: Structuring transit information into a canonical relational model, validating schedules against transit standards, and serving data through versioned APIs.
3. **Mobility Intelligence & Applications**: Powering passenger-facing navigation, pedestrian isochrone evaluation, transfer impedance analysis, and research-oriented spatial modeling.

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

## Geospatial Engineering & Data Acquisition

TransitOS combines software engineering with geospatial data preparation, transit infrastructure reconstruction, and network validation. The platform is designed to work with imperfect and fragmented source data, including situations where detailed station layouts or machine-readable infrastructure datasets are not readily available.

The spatial data pipeline uses GIS, open geospatial datasets, CAD-derived information, and custom processing tools to construct a structured representation of transit networks and their physical connections.

### Geospatial & Infrastructure Toolchain

The platform explicitly distinguishes implemented tools from external workflow utilities and planned analytical references:

| Tool / Technology | Status | Role in TransitOS Platform |
|---|---|---|
| **PostgreSQL + PostGIS** | **Implemented** | Canonical spatial storage, GIST indexing, line-string snapping, and network topology storage. |
| **Custom TypeScript Tooling** | **Implemented** | Data ingestion, schema/coordinate checks, duplicate detection, reference validation, and CTM transformation. |
| **Python Spatial Scripts** | **Implemented** | Layout parsing via PyMuPDF (`fitz`), mathematical coordinate transformations, and GeoJSON generation. |
| **QGIS** | **Workflow Tool** | Spatial inspection, coordinate-system management, georeferencing workflows, layer validation, and visual auditing. |
| **JOSM** | **Workflow Tool** | Inspection and editing of OpenStreetMap data, pedestrian-network preparation, and reconstruction of station access. |
| **OpenStreetMap (OSM)** | **Data Source / Workflow** | Source of mapped geographic features and pedestrian-network geometry where authoritative datasets are unavailable. |
| **CAD Drawings & Blueprints** | **Data Source / Workflow** | Station layouts, concourse floorplans, and entrance geometry extracted from tender annexures and contractor drawings. |
| **Helmert & Affine Transformations** | **Implemented Method** | Georeferencing methods used to rotate, scale, and translate CAD-derived geometry into geographic WGS84 coordinates. |
| **QNEAT3** | **Methodological Reference** | QGIS-based network analysis plugin relevant to accessibility distance benchmarking; distinguished from internal routing. |
| **GTFS & GTFS-Realtime** | **Implemented Standard** | Structured timetable and service data, with real-time processing dependent on supported feed characteristics. |

### Working with Incomplete Infrastructure Data

TransitOS does not assume that a complete, machine-readable station model is available from a single source. Depending on the corridor and available evidence, the workflow follows eight disciplined steps:

1. **Source Identification**: Identify available operator publications, engineering DPRs, community-mapped data, or contractor drawings.
2. **Inspection & Auditing**: Inspect source geometry, attributes, coordinate systems, coverage, and licensing terms.
3. **CRS Normalization**: Project metric features between local UTM grids (EPSG:32643) and geographic coordinates (EPSG:4326).
4. **Infrastructure Reconstruction**: Reconstruct missing station-access or pedestrian-network links where supported by evidence.
5. **CAD Georeferencing**: Apply Helmert similarity transformations to CAD drawings using verified physical ground control points (GCPs).
6. **Canonical Transformation**: Transform prepared spatial data into consistent relational entities (Stations, Platforms, Gates, Pathways).
7. **Spatial & Network Validation**: Validate geometry, entrance-to-platform connectivity, referential integrity, and GTFS compliance.
8. **Provenance Logging**: Record source tier, transformation parameters, assumptions, and known remaining gaps.

### Case Study: Pune Metro Line 3 — Spatial Data Preparation

* **Problem**: Detailed station-level spatial information and pedestrian access for Pune Metro Line 3 (Hinjawadi to Shivajinagar) were not available through official mapping feeds. A usable station representation could not be obtained from an off-the-shelf dataset.
* **Data Acquisition**: OpenStreetMap data was exported and inspected using **JOSM**. Available street geometry and station markers served as the foundation for modeling station footprints.
* **Engineering Approach**: The work involved examining available spatial evidence, identifying gaps between raw OSM tags and required transit models, reconstructing missing pedestrian access links across arterial roads, and compiling the resulting geometry into `datasets/pune/pune_pathways_network.geojson`.
* **Why it Matters**: A transit-routing system is only as reliable as the physical network it represents. Where station layouts or access gates are missing, the challenge is not solved by routing algorithms alone—it requires rigorous geospatial data reconstruction.

*For complete methodologies, mathematical formulas, and error analyses, see our dedicated [Geospatial Engineering Guide](./docs/geospatial-engineering/geospatial-toolchain.md).*

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
│   ├── mumbai/           # Mumbai network assets, schedules, and interchange data
│   └── pune/             # Pune Metro network data, pathways, and schedule feeds
├── docs/                 # Platform, architecture, and governance documentation
│   ├── geospatial-engineering/ # GIS toolchain, CAD georeferencing, and case studies
│   ├── vision/           # Product overview and strategic framework
│   ├── architecture/     # System architecture and Canonical Transit Model specs
│   ├── data/             # Data catalogue, quality pipelines, and provenance
│   ├── api/              # Developer API reference and integration guides
│   ├── mobility-intelligence/ # Accessibility isochrones and analytical models
│   └── governance/       # Research limitations, licensing, and integrity
├── scripts/              # Synchronization, GTFS export, JOSM export, and GIS tools
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

* **Geospatial Engineering & Data Acquisition**:
  * [Geospatial Toolchain](./docs/geospatial-engineering/geospatial-toolchain.md) — Classified toolchain matrix (QGIS, JOSM, OSM, CAD, PostGIS).
  * [Data Acquisition Workflow](./docs/geospatial-engineering/data-acquisition-workflow.md) — 8-stage spatial data preparation lifecycle.
  * [CAD Georeferencing](./docs/geospatial-engineering/cad-georeferencing.md) — Helmert & affine transformations, scale factors, and GCPs.
  * [Pedestrian Network Construction](./docs/geospatial-engineering/pedestrian-network-construction.md) — Modeling physical walkways, FOBs, stairs, and turnstiles.
  * [Spatial Validation Framework](./docs/geospatial-engineering/spatial-validation.md) — Boundary audits, topological integrity, and GTFS QA.
  * [Case Studies](./docs/geospatial-engineering/case-studies.md) — Pune Metro Line 3, Mumbai Line 7/9 CAD, and Marol Naka interchange.
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
