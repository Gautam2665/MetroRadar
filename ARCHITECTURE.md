# MetroRadar Architecture Manual

This document details the architectural principles, design patterns, data schemas, and engineering strategies powering the TransitOS Urban Mobility Platform.

> **Major Architecture Update (2026-08)**: TransitOS has adopted a four-layer platform model with the addition of **Layer 0: Transit Knowledge Platform**. See [GTFS_SYNTHESIS.md](./GTFS_SYNTHESIS.md) for the full Transit Data Synthesis Engine (TDSE) specification.

---

## 🗺️ System Overview

TransitOS is structured as a modular platform composed of three primary vertical tiers (Transit Data Platform, Transit Intelligence Platform, Transit Experience Platform) backed by the Transit Knowledge Platform and an empirical Calibration & Observation Platform.

```mermaid
graph TD
    subgraph Experience["Layer 3: Transit Experience Platform"]
        Web["Web Dashboard (Next.js/MapLibre)"]
        Mobile["Mobile / PWA"]
        Watch["Wear OS Smartwatch"]
        Telegram["Telegram Voice Bot Lab"]
        WhatsApp["WhatsApp Business Interface"]
    end

    subgraph IntelligenceGateway["AI Gateway (Interface Layer)"]
        IG["Intelligence Gateway"]
        Sarvam["Sarvam AI (Indian STT/TTS)"]
        Gemini["Gemini (Vision/OCR)"]
        OpenAI["OpenAI (Reasoning)"]
        IG --> Sarvam
        IG --> Gemini
        IG --> OpenAI
    end

    subgraph Intelligence["Layer 2: Transit Intelligence Platform"]
        JourneyEngine["Journey Intelligence Engine (Dijkstra)"]
        PredictionEngine["Prediction Engine (Delays/ETA)"]
        TwinService["Digital Twin Service"]
        AnalyticsEngine["Analytics & Congestion Engine"]
        BookingEngine["Booking & Commerce Engine"]
        NotificationEngine["Notification Engine"]
    end

    subgraph DataPlatform["Layer 1: Transit Data Platform"]
        CTM["Canonical Transit Model (CTM v1.0)\nPostgreSQL + PostGIS"]
        Redis["Redis Cache & Pub/Sub"]
        APIGateway["NestJS API Gateway"]
    end

    subgraph Knowledge["Layer 0: Transit Knowledge & Calibration"]
        GTFS["Official GTFS Feeds (Cat. A/B)"]
        DPRs["DPRs, Timetables & Shapes (Cat. A-G)"]
        TDSE["Transit Data Synthesis Engine (TDSE)"]
        
        subgraph Calibration["Calibration & Observation Platform"]
            Obs["Field Observations\n(Raspberry Pi, Phone GPS, RT)"]
            ObsPipe["Observation Pipeline"]
            CalWarehouse["Calibration Warehouse"]
            Obs --> ObsPipe --> CalWarehouse
        end
    end

    subgraph Commerce["Commerce Protocols"]
        ONDC["ONDC Buyer Network\n(Ticketing & Passes)"]
    end

    DPRs --> TDSE --> CTM
    GTFS --> CTM
    CalWarehouse --> PredictionEngine
    CTM --> APIGateway
    APIGateway <--> Redis
    APIGateway --> JourneyEngine
    APIGateway --> PredictionEngine
    APIGateway --> TwinService
    APIGateway --> BookingEngine
    BookingEngine --> ONDC

    APIGateway <--> Experience
    IG <--> APIGateway
    Experience <--> IG
```

> **The Golden Rule**: *TransitOS computes. External AI communicates.* Core transit calculations (routing, delay forecasts, fare calculation) are executed strictly on deterministic backend engines. External AI providers sit outside core data dependencies as natural language and voice interface translation layers.

---

## 🏢 1. Digital Twin Architecture
MetroRadar models transit assets as a multi-layered geospatial digital twin. Instead of representing stations as simple coordinate points, they are treated as composite, nested spatial structures representing physical, operational, and commercial properties.

```mermaid
classDiagram
    class Station {
        +UUID id
        +String code
        +String name
        +Float latitude
        +Float longitude
        +String city
    }
    class Level {
        +UUID id
        +String name
        +Int levelNumber
        +LevelType type
    }
    class Platform {
        +UUID id
        +String platformNumber
        +Boolean screenDoors
        +Boolean wheelchairBoarding
    }
    class Entrance {
        +UUID id
        +String name
        +Boolean accessible
        +Boolean escalator
        +Boolean lift
    }
    class Amenity {
        +UUID id
        +String name
        +AmenityType type
    }
    
    Station "1" *-- "many" Level : Has levels
    Station "1" *-- "many" Entrance : Has entrances
    Level "1" *-- "many" Platform : Contains platforms
    Level "1" *-- "many" Amenity : Contains facilities
```

### Digital Twin Payload Structure (`GET /stations/:id/digital-twin`)
The response maps assets cleanly into logical namespaces:
1.  **Physical Namespace**: Grouping `levels`, `platforms`, and `entrances` with their coordinates, status, and constraints.
2.  **Services Namespace**: Houses `amenities` (elevators, restrooms, ticketing) and `commercial` (spaces and outlets).
3.  **Operational Namespace**: Telemetry data (e.g. real-time crowding metrics, alerts, and operational states).

---

## 🗃️ 2. Canonical Transit Model (CTM)
The database schema standardizes raw GTFS, OpenStreetMap (OSM), and operator-specific dataset schemas into a unified **Canonical Transit Model (CTM)** in PostgreSQL using Prisma.

```
       [System] (Delhi Metro, Kochi Metro, Mumbai Metro)
          │
          ├── [Agency] (Operator details, websites)
          │
          ├── [Line] (Routes: Yellow Line, Blue Line, etc.)
          │      │
          │      └── [Trip] (Individual scheduled vehicle journeys)
          │             │
          │             └── [StopTime] (Scheduled stop arrivals)
          │                    │
          └── [Station] ◄──────┘
                 │
                 ├── [Level] (Concourse, Platform, Street)
                 │      │
                 │      └── [Platform] (Boarding berths)
                 │
                 ├── [Entrance] (Station entrance/exit doors)
                 │
                 └── [Amenity] (Elevators, Restrooms, Ticketing)
```

---

## 🌍 3. GeoJSON Philosophy
All spatial vector graphics returned to the client are serialized directly as database-aggregated **GeoJSON FeatureCollections** using PostGIS spatial functions (`ST_AsGeoJSON`, `ST_MakePoint`, `ST_MakeLine`) combined with PostgreSQL raw JSON aggregations (`json_build_object`, `json_agg`).

### Key Principles:
*   **Zero Client-Side Calculation**: The client does not assemble points into lines or project coordinates. It receives pure, render-ready GeoJSON features and drops them directly into the MapLibre GL rendering canvas.
*   **Versioned Envelopes**: All GeoJSON endpoints wrap the standard `FeatureCollection` inside a metadata envelope containing the API version, a generation timestamp, and the system ID context.
*   **Database-Level Reconstruction**: Geometries like route lines are reconstructed on-the-fly by querying sequential stop coordinates or shape vectors directly in the SQL engine, avoiding expensive Node.js parsing overhead.

---

## 🔌 4. Layer Registry Control
Rather than hardcoding map layers on the client-side, MetroRadar implements a **Layer Registry (`GET /map/layers`)**.

### Benefits:
*   **Dynamic Styling**: The backend controls which layers are active, their styles (circle radius, line width, vector colors), default visibility, and the backend endpoints supplying the data.
*   **Extensibility**: Adding a new GIS layer (e.g., live vehicle positions or train heatmaps) is done by registering it in the backend's `geojson.service.ts`. The client automatically detects the new layer, adds a toggle in the sidebar, and renders it on the map.

---

## ⚡ 5. Cache Strategy (Redis Namespaces)
Real-time mobility platforms handle thousands of requests per second. To prevent database exhaustion, MetroRadar employs a structured Redis caching strategy.

### Namespace Partitioning:
*   `geojson:*`: Caches compiled GeoJSON layers (e.g., `geojson:lines`, `geojson:stations`).
*   `digitaltwin:*`: Caches assembled station digital twin payloads (e.g., `digitaltwin:station:<uuid>`).
*   `search:*` / `nearby:*`: Caches autocomplete results and spatial radius query coordinates.

### Cache Lifecycle:
*   **TTL**: Cached records have a standard time-to-live (e.g., 3600 seconds).
*   **Active Invalidation**: Whenever a new GTFS Static import completes successfully or station details are edited, the backend calls `this.redisService.delByPattern('geojson:*')` to purge all cached GIS layers, forcing an on-demand rebuild.

---

## 🧩 6. Service Decomposition
The GIS module enforces strict separation of concerns to keep the codebase highly maintainable:
*   **Controllers**: Handle incoming HTTP requests, route param validation, and cache lookup/write-back.
*   **GeojsonService**: Focused exclusively on database-level GeoJSON geometry construction and layer registries.
*   **DigitalTwinService**: Assembles nested composite physical and telemetry properties of stations.
*   **SearchService**: Powers text indexing and PostGIS geospatial radius metrics.

---

## 📌 7. API Versioning & Contracts
*   **URL Versioning**: All production routes will eventually follow `/api/v1/...` to guarantee backward compatibility for third-party integrations.
*   **Strict Contracts**: Output schemas use TypeScript interfaces and class-validator DTOs, keeping schema contracts secure.
*   **Automatic Fallbacks**: Data mismatches (such as missing GTFS route colors) are captured and normalized at the service layer before reaching the client, preventing runtime crashes.

---

## 🧠 8. Transit Data Synthesis Engine (TDSE) — Layer 0

The TDSE is the newest architectural layer in TransitOS. It sits beneath Layer 1 (Transit Data) and is responsible for transforming raw operator documents into standards-compliant GTFS feeds and CTM records.

> For the full specification, see **[GTFS_SYNTHESIS.md](./GTFS_SYNTHESIS.md)**.

### Core Insight

Most journey planners are **consumers** of GTFS. TransitOS is a **producer** of GTFS. This is the fundamental competitive advantage — instead of waiting for operators to publish a feed, TransitOS synthesizes one from whatever authoritative documentation is publicly available (DPRs, timetable PDFs, GIS data, rolling stock specs).

### TDSE Data Flow

```
Category A — Network Topology (DPRs, alignment drawings)
Category B — Station Infrastructure (platform plans)
Category C — Operations (timetables, headways)
Category D — Rolling Stock (train specs, max speed, acceleration)
Category E — Signalling (CBTC manuals, speed restrictions)
Category F — GIS & Spatial (shapefiles, OSM, GPS surveys)
Category G — Commercial (fare charts, amenities)
Category H — Historical Operations (archived timetables, delay reports)
Category I — Live Observations (GTFS-RT, crowdsource, GPS)
         │
         ▼
  Transit Data Synthesis Engine
  ┌─────────────────────────────────────┐
  │ Extractor → Physics Modeler         │
  │ Schedule Generator → Validator      │
  │ Provenance Engine → Confidence Scorer│
  └─────────────────────────────────────┘
         │
         ├── GTFS Schedule (stops.txt, trips.txt, stop_times.txt ...)
         ├── Canonical Transit Model (CTM)
         └── Category X: ProvenanceRecords + Confidence Scores
```

### Realtime Level Architecture

TransitOS does not assume realtime data exists. It defines three levels:

| Level | Name | Source | Confidence | Used For |
|:---|:---|:---|:---|:---|
| **1** | Official | Operator GTFS-RT | 95–99% | Kochi, Hyderabad |
| **2** | Enhanced Official | Official + filtering/validation | 85–99% | Delhi (DTC bus false-positive removal) |
| **3** | Estimated | State Estimation Engine | 60–90% | Mumbai, Pune, Nagpur, all synthesis metros |

Every realtime API response carries `source` and `confidence` fields. The frontend never assumes live data is official.

### State Estimation Engine (SEE)

The SEE generates estimated vehicle positions for metros with no official realtime feed. It uses:
- The synthesized GTFS schedule from TDSE
- Learned dwell times from Category H (historical data)
- Category I observations (GPS traces, crowdsource) to improve estimates

Output: an **Estimated GTFS-Realtime** feed, clearly labeled as `source: "estimated"`, published alongside official feeds where they exist.
