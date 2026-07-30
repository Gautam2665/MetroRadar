# MetroRadar API Documentation Guide (v0.5.0)

This guide documents the API contracts exposed by the MetroRadar backend. All endpoints are designed to maintain decoupling; the frontend consumes these GeoJSON layers, composite digital-twin payloads, and journey routing results directly.

---

## 🌍 Map Layer Registry

### `GET /map/layers`
-   **Purpose**: Returns the dynamic GIS layer configurations registry. Allows adding overlays on the map from the backend without changes to frontend source code.
-   **Cache Key**: None (Static config resolution)
-   **Response Format**:
    ```json
    {
      "version": "1.0.0",
      "layers": [
        {
          "id": "lines",
          "name": "Metro Lines",
          "endpoint": "/map/lines",
          "defaultVisible": true,
          "style": { "type": "line", "color": "operator", "width": 4 }
        },
        {
          "id": "stations",
          "name": "Passenger Stations",
          "endpoint": "/map/stations",
          "defaultVisible": true,
          "style": { "type": "circle", "color": "#06b6d4", "radius": 6 }
        }
      ]
    }
    ```

---

## 🗺️ GeoJSON GIS Layers

All GeoJSON layers are returned inside a versioned FeatureCollection envelope:
```json
{
  "version": "1.0.0",
  "generatedAt": "2026-07-21T09:40:00.000Z",
  "systemId": null,
  "type": "FeatureCollection",
  "features": []
}
```

### `GET /map/systems`
-   **Purpose**: Returns geographic center points and basic metadata of registered metro systems.
-   **Cache Key**: `geojson:systems` (TTL = 1 hour)

### `GET /map/lines`
-   **Purpose**: Returns reconstructed routes as `LineString` or `MultiLineString` GeoJSON features colored by their official transit color.
-   **Cache Key**: `geojson:lines` (TTL = 1 hour)

### `GET /map/stations`
-   **Purpose**: Returns the Point features of all active passenger stations, containing array listings of lines served.
-   **Cache Key**: `geojson:stations` (TTL = 1 hour)

### `GET /map/stations/:id`
-   **Purpose**: Returns a single GeoJSON Feature representing a station.
-   **Cache Key**: `geojson:station:<uuid>` (TTL = 1 hour)

---

## 🔍 Geospatial Searches

### `GET /map/search?q=<query>&type=<filters>`
-   **Purpose**: Performs a text query matched against station names, codes, line codes, system names, and cities.
-   **Query Parameters**:
    -   `q`: Query string (Required).
    -   `type`: Comma-separated list of entities to search (Optional: `station`, `line`, `system`).
-   **Cache Key**: `search:<query>:<type>` (TTL = 1 hour)
-   **Response**: FeatureCollection of matches.

### `GET /map/nearby?lat=<latitude>&lon=<longitude>&radius=<radius>&types=<types>`
-   **Purpose**: PostGIS spatial queries returning stations or entrances within a radius (meters), ordered nearest first.
-   **Query Parameters**:
    -   `lat` / `lon`: Numeric coordinates (Required).
    -   `radius`: Search distance in meters (Optional, default 1000m).
    -   `types`: Comma-separated list (Optional: `station`, `entrance`).
-   **Cache Key**: `nearby:<lat>:<lon>:<radius>:<types>` (TTL = 1 hour)
-   **Response**: FeatureCollection of elements.

---

## 🚇 Station Digital Twin

### `GET /stations/:id/digital-twin`
-   **Purpose**: Returns the composite physical, services, and operational components of a station.
-   **Cache Key**: `digitaltwin:station:<uuid>` (TTL = 1 hour)
-   **Response Format**:
    ```json
    {
      "metadata": {
        "generatedAt": "2026-07-21T09:40:00.000Z",
        "version": "1.0.0"
      },
      "station": {
        "id": "...",
        "code": "...",
        "name": "...",
        "latitude": 0.0,
        "longitude": 0.0,
        "city": "...",
        "country": "..."
      },
      "physical": {
        "levels": [{ "id": "...", "name": "Concourse", "levelNumber": 1 }],
        "platforms": [{ "id": "...", "platformNumber": "1", "line": { "name": "Red Line", "color": "#ff0000" } }],
        "entrances": [{ "id": "...", "name": "Gate A", "accessible": true }]
      },
      "services": {
        "amenities": [{ "id": "...", "type": "ATM", "name": "HDFC ATM" }],
        "commercial": {
          "spaces": [],
          "outlets": [{ "id": "...", "brand": "Starbucks", "category": "Food" }]
        }
      },
      "operational": {
        "crowding": {
          "available": false,
          "value": null,
          "reason": "TELEMETRY_NOT_CONFIGURED"
        },
        "status": "ACTIVE",
        "lastUpdated": null
      }
    }
    ```

---

## 🧼 Cache Invalidation Policy

All cached keys prefixed with `geojson:*`, `digitaltwin:*`, `search:*`, and `nearby:*` are automatically cleared when a new transit dataset is successfully imported via the `IngestionService`.

---

## 🗺️ Journey Planning & Routing

*Added in v0.5.0 — Sprint 5*

### `GET /journeys?from=<stationId>&to=<stationId>`
- **Purpose**: Computes the optimal transit path between two stations using Dijkstra's algorithm, with multi-line transfer support and interchange walk connections.
- **Query Parameters**:
  - `from`: Origin station UUID (Required).
  - `to`: Destination station UUID (Required).
  - `systemId`: Restrict routing to a specific transit system UUID (Optional).
- **Cache Key**: None (computed on-demand from in-memory graph)
- **Response Format**:
  ```json
  {
    "from": { "id": "...", "name": "Sarojini Nagar", "code": "YL-22" },
    "to": { "id": "...", "name": "IGI Airport T3", "code": "OL-07" },
    "totalDurationSeconds": 2820,
    "totalStops": 14,
    "transferCount": 2,
    "legs": [
      {
        "type": "TRANSIT",
        "line": { "name": "Yellow Line", "color": "#facc15" },
        "from": { "name": "Sarojini Nagar" },
        "to": { "name": "Durgabai Deshmukh South Campus" },
        "stops": 3,
        "durationSeconds": 360
      },
      {
        "type": "WALK",
        "from": { "name": "Durgabai Deshmukh South Campus" },
        "to": { "name": "Dhaula Kuan" },
        "durationSeconds": 300,
        "distanceMeters": 380
      },
      {
        "type": "TRANSIT",
        "line": { "name": "Airport Express", "color": "#f97316" },
        "from": { "name": "Dhaula Kuan" },
        "to": { "name": "IGI Airport T3" },
        "stops": 2,
        "durationSeconds": 720
      }
    ],
    "geojson": {
      "type": "FeatureCollection",
      "features": []
    }
  }
  ```
- **Notes**:
  - Walking transfer edges are inserted automatically for stations within 1000m of each other on different lines.
  - Transfer penalty of 180 seconds is applied per interchange to bias routes toward fewer transfers.
  - Walking weight of `0.8x` is applied to reduce walking leg cost relative to riding.
  - Returns `404` if no path exists between the given stations.
