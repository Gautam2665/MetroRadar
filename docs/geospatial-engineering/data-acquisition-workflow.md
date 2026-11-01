# Data Acquisition & Preparation Workflow

TransitOS does not assume that complete, machine-readable station and network models are available from a single authoritative source. Instead, the platform implements a structured, repeatable 8-stage data acquisition and preparation lifecycle designed to handle imperfect, multi-source, and heterogeneous urban transport data.

---

## The 8-Stage Spatial Data Lifecycle

```mermaid
flowchart TD
    S1["1. Source Discovery & Screening"] --> S2["2. Geometric & Attribute Inspection"]
    S2 --> S3["3. CRS & Metric Projection"]
    S3 --> S4["4. Missing Infrastructure Reconstruction"]
    S4 --> S5["5. Georeferencing & Transformation"]
    S5 --> S6["6. Canonical Modeling & Schema Normalization"]
    S6 --> S7["7. Spatial & Network Validation"]
    S7 --> S8["8. Provenance & Limitation Cataloguing"]
```

### 1. Source Discovery & Screening
Identify available datasets across diverse tiers:
* **Tier 0 (Authoritative Feeds)**: Official schedules and alignment data published by transit authorities (e.g. MMMOCL, MMRDA, MMRCL, Maha Metro).
* **Tier 1 (Engineering & Tender Annexures)**: Detailed Project Reports (DPRs), architectural tender layout sheets, station kiosk plans, and contractor CAD drawings.
* **Tier 2 (Open Community Registries)**: OpenStreetMap planet dumps, Overpass API queries, and municipal open data portals.
* **Tier 3 (Field & Community Surveys)**: Ground-truthed entrance gate coordinates, photographic wayfinding audits, and elevator accessibility surveys.

Each source is logged with capture date, URL/origin, licensing terms, and geographical boundary.

### 2. Geometric & Attribute Inspection
Before any automated processing, source files are manually audited in QGIS or inspected programmatically:
* **Coverage Analysis**: Checking whether all revenue stations and active lines are present.
* **Attribute Consistency**: Confirming station naming variants across languages (English, Marathi, Hindi) and verifying operational line codes (e.g., Line 2A vs Line 7).
* **Topological Sanity**: Detecting self-intersecting polygons, disconnected line segments, and inverted coordinate pairs (e.g. latitude/longitude reversals).

### 3. Coordinate Reference System (CRS) Normalization
Geographic transit calculations require switching between angular spherical coordinates and metric Euclidean projections:
* **Storage & Exchange (EPSG:4326 / WGS84)**: Used for all API payloads, GeoJSON exports, and PostgreSQL database storage. Coordinates are represented as decimal degrees `(longitude, latitude)`.
* **Metric Calculation (EPSG:32643 / UTM Zone 43N)**: Applied when measuring physical distances, walking isochrones, buffer radiuses, and pedestrian walking network lengths in Mumbai and Pune.
* **CAD Local Space**: 2D Cartesian sheet coordinates (measured in PostScript points or millimeters) with an arbitrary local origin `(0, 0)`.

### 4. Missing Infrastructure Reconstruction
When detailed station-level information or pedestrian access routes are absent from official mapping feeds:
* OpenStreetMap data is exported and brought into JOSM for topology auditing.
* Station footprints, mezzanine concourses, and access portals are identified from satellite imagery, contractor drawings, or on-site inspections.
* Mapped geometry is aligned with surrounding street networks to establish walkable pedestrian connections.

### 5. Georeferencing & Transformation
For architectural CAD drawings and station layout blueprints that lack spatial reference:
* Identifiable ground control points (GCPs)—such as station centerline piers, road median intersections, or highway flyover columns—are matched between the drawing and satellite basemaps.
* A Helmert (similarity) transformation is computed to translate, rotate, and uniformly scale drawing vectors into geographic coordinates.
* Transformation residuals and root-mean-square errors (RMSE) are recorded to quantify alignment confidence.

### 6. Canonical Modeling & Schema Normalization
Prepared spatial features are ingested into the **Canonical Transit Model (CTM)**:
* Stations are registered with unique stable IDs, official operational codes, English/vernacular names, and centroid coordinates.
* Station access points are structured as distinct `Gate` entities with ground-truthed GPS coordinates, directional tags, level designations, and street accessibility notes.
* Intra-station walking links (stairs, escalators, lifts, concourse passages) are compiled into typed pathway records.

### 7. Spatial & Network Validation
The compiled transit network is subjected to rigorous spatial and routing tests:
* **Coordinate Bounds Verification**: Ensures all points fall strictly within the defined metropolitan envelope (e.g., MMR boundary: `18.8°N - 19.5°N, 72.7°E - 73.2°E`).
* **GTFS Specification Conformance**: Verified against the Canonical MobilityData GTFS Validator to guarantee zero unreachable stops, zero loop pathways, and zero orphan platforms.
* **Graph Connectivity Auditing**: Validates that every platform is reachable from at least one entrance gate and that interchange transfers between intersecting corridors have valid pedestrian walking paths.

### 8. Provenance & Limitation Cataloguing
Finally, dataset metadata is recorded in the TransitOS catalogue:
* **Confidence Level**: Assigned based on source tier (Authoritative vs Curated vs Inferred).
* **Licensing Compliance**: Verifies that open database licenses (ODbL, CC-BY) or public record fair-use conditions are properly attributed.
* **Known Deficiencies**: Documents stations that currently rely on centroid approximations pending future on-site gate surveys.
