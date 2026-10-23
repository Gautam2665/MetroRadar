# TransitOS Transport Modeling & Analytics API Reference Guide

This guide documents the computational REST and GeoJSON API contracts exposed by the TransitOS backend. All endpoints are designed for high throughput, sub-second route planning, spatial catchment inspection, and GTFS-RT telemetry streaming.

---

## 🗺️ Journey Planning & Simulation API (`/journeys`)

### `GET /journeys`
Computes the optimal and alternative transit candidates between stations, multimodal landmarks, or geographic coordinates using **Yen's $K$-Shortest Paths with Multi-Criteria Pareto Dominance Filtering**.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `from` | String | **Yes** | — | Origin identifier: Station UUID, Station Gate UUID, or Coordinate String (`"19.1200,72.8494"`). |
| `to` | String | **Yes** | — | Destination identifier: Station UUID, Station Gate UUID, or Coordinate String (`"19.2104,72.8715"`). |
| `departureTime` | String | No | Current Clock | Departure time in `HH:mm` format (e.g., `"08:30"`) for schedule-based connection simulation. |
| `objective` | Enum | No | `FASTEST` | Optimization objective: `FASTEST` (minimum total duration), `MIN_FRICTION` (minimum physical interchange impedance), or `BALANCED`. |
| `mobility` | Enum | No | `STANDARD` | Mobility profile: `STANDARD` or `REDUCED` (requires verified elevators, eliminates outdoor street transfers). |
| `luggage` | Enum | No | `NONE` | Luggage constraints: `NONE`, `LIGHT`, or `HEAVY` (applies vertical climb and turnstile bag drag penalties). |
| `safetyBufferMins` | Number | No | `3` | Connection buffer at interchanges (minutes) to account for passenger boarding queues. |
| `k` | Number | No | `3` | Maximum number of surviving non-dominated candidate routes to return. |

#### Response Schema (`200 OK`)
```json
{
  "from": {
    "id": "e6f9a0c1-3d2b-4e8a-9f1c-7b8a9c0d1e2f",
    "name": "Versova",
    "code": "STN_L1_001",
    "lat": 19.130278,
    "lng": 72.821387
  },
  "to": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "name": "Gundavali",
    "code": "STN_L7_014",
    "lat": 19.114439,
    "lng": 72.855172
  },
  "candidates": [
    {
      "id": "SPATIAL_GATE_STN_L1_001>STN_L1_001:STN_L7_014>SPATIAL_GATE_STN_L7_014",
      "rank": 1,
      "score": 91,
      "origin": { "id": "...", "name": "Versova", "code": "STN_L1_001" },
      "destination": { "id": "...", "name": "Gundavali", "code": "STN_L7_014" },
      "durationSeconds": 1440,
      "durationMinutes": 24,
      "inVehicleSeconds": 1080,
      "walkingSeconds": 180,
      "waiting": {
        "total": { "seconds": 180, "source": "schedule", "confidence": 0.95 },
        "initialWait": { "seconds": 60, "source": "schedule", "confidence": 0.95 },
        "transferWait": { "seconds": 120, "source": "schedule", "confidence": 0.95 }
      },
      "transfers": 1,
      "walkingDistanceMeters": 210,
      "isDirect": false,
      "lines": [
        "Blue Line (Versova - Ghatkopar)",
        "Red Line (Kashigaon - Gundavali)"
      ],
      "fare": 40,
      "smartCardFare": 36,
      "fareBreakdown": [
        { "line": "Blue Line", "fare": 20, "operator": "MMOPL" },
        { "line": "Red Line", "fare": 20, "operator": "MMMOCL" }
      ],
      "requiresMultipleTickets": true,
      "transferSafetyBufferSeconds": 180,
      "transferRiskLevel": "SAFE",
      "attributes": {
        "fastest": true,
        "fewestTransfers": false,
        "direct": false,
        "leastWalking": true,
        "accessibilityFriendly": true
      },
      "interchangeFriction": {
        "level": "LOW",
        "effectiveCostSeconds": 1500,
        "frictionSeconds": 60
      },
      "legs": [
        {
          "type": "TRANSIT",
          "lineId": "...",
          "lineName": "Blue Line (Versova - Ghatkopar)",
          "lineColor": "#00a3e0",
          "from": "STN_L1_001",
          "to": "STN_L1_005",
          "fromStationName": "Versova",
          "toStationName": "Western Express Highway",
          "durationSeconds": 720,
          "hopCount": 4,
          "direction": "Towards Ghatkopar",
          "doorOpeningSide": "LEFT",
          "realtimeEtaMins": 2
        },
        {
          "type": "WALK",
          "from": "STN_L1_005",
          "to": "STN_L7_014",
          "fromStationName": "Western Express Highway",
          "toStationName": "Gundavali",
          "durationSeconds": 180,
          "transferTitle": "Covered Foot Overbridge (FOB)",
          "transferSummary": "58 m · Climate-controlled walkway",
          "transferInstructions": [
            "Exit Concourse Level via Gate 1",
            "Follow signage across elevated Foot Overbridge directly to Gundavali concourse"
          ]
        },
        {
          "type": "TRANSIT",
          "lineId": "...",
          "lineName": "Red Line (Kashigaon - Gundavali)",
          "lineColor": "#e11d48",
          "from": "STN_L7_014",
          "to": "STN_L7_014",
          "durationSeconds": 360
        }
      ],
      "geojson": {
        "type": "FeatureCollection",
        "features": []
      }
    }
  ]
}
```

---

## 🌍 Spatial GIS & Network Topology API (`/map`)

### 1. Dynamic GIS Layer Registry
`GET /map/layers`
- Returns active spatial layer configurations (lines, stations, catchments, digital-twin components).

### 2. Network Line Geometries
`GET /map/lines?system=<code>`
- Returns official reconstructed polyline geometries (`LineString` / `MultiLineString`) colored by brand hex color with operational line metadata.

### 3. Passenger Stations
`GET /map/stations?system=<code>`
- Returns GeoJSON Point features for all operational stations with served lines, platforms, and accessibility facilities.

### 4. Multi-Criteria Spatial Search
`GET /map/search?q=<query>&type=<station,line>`
- **Behavior**:
  - Searches station names, codes, lines, and regional locality reference centroids.
  - Dynamically calculates nearest feeder stations per active line using PostGIS spatial geography queries.
  - Suppresses gate clutter: station physical gates are only returned if the user explicitly includes keywords (`"gate"`, `"exit"`, `"fob"`).

### 5. Station Catchment Spatial Radius
`GET /map/nearby?lat=<lat>&lon=<lon>&radius=<meters>&types=station,entrance`
- Queries all transit entities within a geodetic distance buffer (in meters) ordered by physical proximity using PostGIS `ST_DWithin`.

### 6. Station 3D Digital Twin Inspector
`GET /map/stations/:id/digital-twin`
- Returns the complete multi-level physical schema of a station:
  - **Levels ($Z$-levels)**: Street, Concourse, Mezzanine, Platform.
  - **Platforms**: Track assignments, screen doors (PSDs), wheelchair boarding areas.
  - **Entrances / Gates**: Precise GPS coordinates, lift/escalator availability, local feeder street links.
  - **Pathways**: Directional concourse transfer links and travelator corridors.

---

## ⚡ Real-Time Fleet Telemetry API (`/realtime`)

### `GET /realtime/vehicles?system=<code>`
Decodes live GTFS-RT Protocol Buffer telemetry cached in Redis (< 5ms response time):
- **Vehicle ID & Fleet Telemetry**: Real-time GPS coordinates, speed, bearing, current status (`IN_TRANSIT_TO`, `STOPPED_AT`).
- **Schedule Adherence**: Real-time delay propagation (in seconds) against published GTFS timetable baselines.

---

## 📥 GTFS & Canonical Transit Model Ingestion (`/ingestion`)

### `POST /ingestion/gtfs?systemId=<uuid>&dryRun=<boolean>`
Transactionally validates and ingests a static GTFS archive into the Canonical Transit Model (CTM v1.0):
- **Validation**: Checks relational integrity across `routes.txt`, `trips.txt`, `stop_times.txt`, and `pathways.txt`.
- **Topological Compilation**: Automatically calculates inter-station link distances, average cruise speeds, and station sequences.
- **Rollback Safety**: Full transactional rollback if structural or kinematic constraints fail.
