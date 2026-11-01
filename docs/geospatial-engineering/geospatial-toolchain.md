# Geospatial & Infrastructure Toolchain

TransitOS operates at the intersection of transport software engineering and geospatial infrastructure modeling. Because urban transit networks in Indian cities rarely provide complete, turnkey, machine-readable micro-spatial datasets, TransitOS employs a hybrid geospatial toolchain.

This document classifies every tool, framework, and technique used in the platform into three transparent categories:
1. **Implemented & Maintained in Codebase**: Core software, parsers, and spatial engines committed to the repository.
2. **Used in Geospatial Workflows**: External GIS, CAD, and mapping software used for manual inspection, survey verification, georeferencing, and network editing.
3. **Planned & Methodological References**: Analytical tools and external algorithms relevant to future research tracks, distinguished from the currently implemented pipeline.

---

## Toolchain Classification Matrix

| Tool / Technology | Status | Role in TransitOS Platform | Primary Repository Evidence |
|---|---|---|---|
| **PostgreSQL 16 + PostGIS 3.4** | **Implemented** | Canonical spatial storage, GIST indexing, spatial joins (`ST_DWithin`, `ST_Distance`), line-string snapping, and network topology storage. | `database/prisma/schema.prisma`, `apps/backend/src/modules/gis/` |
| **Custom TypeScript Processing Engine** | **Implemented** | Ingestion pipelines, GTFS timetable synthesis, coordinate bounds checking, topological validation, and Pareto routing multigraph construction. | `apps/backend/src/modules/journey/`, `scripts/` |
| **Python Spatial Scripts** | **Implemented** | Layout parsing via PyMuPDF (`fitz`), mathematical coordinate transformations, and GeoJSON generation. | `datasets/mumbai/extract_line7_cad_to_qgis.py` |
| **QGIS (3.28+ LTR)** | **Workflow Tool** | Visual spatial auditing, layer verification, coordinate reference system (CRS) transformations, inspection of station polygons, and project workspace. | `mumbai.qgz`, QGIS Python console scripts |
| **JOSM (Java OpenStreetMap Editor)** | **Workflow Tool** | Granular inspection and editing of OSM pedestrian ways, tag validation (`railway=station`, `highway=footway`), topological splitting, and gate connectivity auditing. | `scripts/export_l2a_l7_for_josm.js`, `datasets/mumbai/exports/` |
| **OpenStreetMap (OSM)** | **Data Source / Workflow** | Baseline physical road, sidewalk, and building footprint geometry where official municipal or operator spatial datasets are unavailable. | `scripts/export_l2a_l7_for_josm.js`, `datasets/pune/` |
| **CAD Layout Sheets & Blueprints** | **Data Source / Workflow** | Architectural station layouts, kiosk plans, concourse floorplans, and station entrance locations extracted from public agency tender annexures. | `datasets/mumbai/Annexure_*_cad_extracted.json`, `datasets/mumbai/line1_station_blueprints/` |
| **Helmert & Affine Transformations** | **Implemented Method** | Mathematical rotation, translation, and scaling of local Cartesian CAD drawing coordinates to WGS84 geographic coordinates. | `datasets/mumbai/extract_line7_cad_to_qgis.py` |
| **QNEAT3 (QGIS Network Analysis)** | **Methodological Reference** | External QGIS network distance and catchment plugin. Relevant as an external benchmarking reference for walking accessibility, distinct from TransitOS's internal Dijkstra/Pareto engine. | Mentioned in accessibility benchmarking |
| **GTFS Schedule & GTFS-RT** | **Implemented Standard** | Authoritative schedule representation (stops, stop_times, pathways, levels) and live telemetry bindings. | `datasets/mumbai/mumbai_discrete_ready.zip`, `apps/backend/src/modules/realtime/` |

---

## Detailed Tool Descriptions & Operational Roles

### 1. PostgreSQL 16 & PostGIS 3.4
PostGIS serves as the single spatial source of truth (SSOT). All station coordinates, entrance points, pedestrian paths, and corridor centerlines are stored using native PostGIS geometry types (`GEOMETRY(Point, 4326)`, `GEOMETRY(LineString, 4326)`). 
* **Spatial Queries**: Calculates physical straight-line distances and catchment radiuses using spherical geography calculations (`ST_DWithin`, `ST_Distance_Sphere`).
* **Spatial Indexing**: 2D GIST indexes are maintained on all spatial columns to ensure sub-millisecond candidate attachment during journey planning.

### 2. QGIS (Quantum GIS)
QGIS is used as the desktop GIS environment for manual inspection, layer alignment, and spatial quality control.
* **Coordinate System Management**: Handles projections between local metric projections (e.g., EPSG:32643 / UTM Zone 43N) and global geographic coordinates (EPSG:4326 / WGS84).
* **Layer Auditing**: Enables multi-layer overlays of OpenStreetMap basemaps, georeferenced station blueprints, CAD-extracted entrance coordinates, and official corridor alignments.
* **Workspace**: The project file `mumbai.qgz` maintains the curated visualization layers for the Mumbai Metropolitan Region.

### 3. JOSM (Java OpenStreetMap Editor)
JOSM is the primary tool for topological inspection and correction of pedestrian networks.
* **Micro-Topological Editing**: Verifies that sidewalk ways physically connect to station entrance nodes rather than floating disjointedly.
* **OSM Tag Harmonization**: Ensures station facilities adhere to established OSM tagging standards (`railway=subway_entrance`, `highway=footway`, `footway=crossing`, `level=*`, `tactile_paving=*`).
* **JOSM Export Pipeline**: The script `scripts/export_l2a_l7_for_josm.js` extracts CTM database records into OSM-formatted GeoJSON, allowing rapid inspection and topological auditing in JOSM.

### 4. CAD & Blueprint Interpretation
Engineering drawings from operator tender documents (such as MMMOCL Annexures B, C, and D for Lines 2A, 7, and 9) provide detailed concourse and platform information.
* **Scale & Coordinate System**: CAD drawings lack geographic metadata and exist in unprojected arbitrary sheet coordinate spaces (points or millimeters).
* **PyMuPDF Extraction**: Vector path primitives, text labels, stairs, turnstiles, and kiosk locations are extracted programmatically.
* **Coordinate Conversion**: Local coordinates are mapped to physical coordinates using rigid-body 2D similarity (Helmert) or affine transformation models.

### 5. OpenStreetMap (OSM)
OpenStreetMap provides the foundational open street network. It is utilized:
* To obtain street alignments and footpaths surrounding metro corridors.
* As an independent source of geometric validation against CAD-derived station centroids.
* When official GIS layers for surrounding neighborhoods are not publicly published by transit agencies.

---

## Limitations & Best Practices

1. **Precision Divergence**: CAD drawings represent design-intent geometry, which may diverge from final as-built construction. All CAD-derived coordinates must be cross-verified against aerial imagery and ground surveys.
2. **Topological Disconnects**: OpenStreetMap footways often terminate at road kerbs without connecting to station entrance gates. TransitOS explicitly avoids assuming connectivity purely from spatial proximity.
3. **Reference Separation**: External tools such as QNEAT3 are used for exploratory spatial research and validation; the live TransitOS passenger routing and isochrone engine operates independently via its own in-memory multigraph.
