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
| **QGIS (3.28+ LTR)** | **Primary GIS Workbench** | Desktop GIS environment where 80% of spatial corrections, layer verifications, gate placements, and visual audits were performed manually against satellite imagery and georeferenced DPRs (`mumbai.qgz`). | `mumbai.qgz`, QGIS Python console scripts |
| **JOSM (Java OpenStreetMap Editor)** | **Pedestrian Topology Workbench** | Granular inspection and manual micro-editing of OSM pedestrian ways, tag validation (`railway=station`, `highway=footway`), topological splitting, and gate connectivity auditing. | `scripts/export_l2a_l7_for_josm.js`, `datasets/mumbai/exports/` |
| **PostgreSQL 16 + PostGIS 3.4** | **Implemented Engine** | Canonical spatial storage, GIST indexing, spatial joins (`ST_DWithin`, `ST_Distance`), line-string snapping, and network topology storage. | `database/prisma/schema.prisma`, `apps/backend/src/modules/gis/` |
| **Custom TypeScript Processing Engine** | **Implemented Engine** | Ingestion pipelines, GTFS timetable synthesis, coordinate bounds checking, topological validation, and Pareto routing multigraph construction. | `apps/backend/src/modules/journey/`, `scripts/` |
| **Python Spatial Scripts** | **Implemented Utility** | Layout parsing via PyMuPDF (`fitz`), mathematical coordinate transformations, and GeoJSON generation. | `tools/`, QGIS console workflows |
| **OpenStreetMap (OSM)** | **Data Source / Standard** | Baseline physical road, sidewalk, and building footprint geometry where official municipal or operator spatial datasets are unavailable. | `scripts/export_l2a_l7_for_josm.js`, `datasets/pune/` |
| **CAD Layout Sheets & Blueprints** | **Engineering Baseline** | Architectural station layouts, kiosk plans, concourse floorplans, and station entrance locations extracted from public agency tender annexures. | Historical DPR annexures, civil tender layouts |
| **Helmert & Affine Transformations** | **Implemented Method** | Mathematical rotation, translation, and scaling of local Cartesian CAD drawing coordinates to WGS84 geographic coordinates. | Math models documented in `cad-georeferencing.md` |
| **QNEAT3 (QGIS Network Analysis)** | **Methodological Reference** | External QGIS network distance and catchment plugin. Relevant as an external benchmarking reference for walking accessibility, distinct from TransitOS's internal Dijkstra/Pareto engine. | Mentioned in accessibility benchmarking |
| **GTFS Schedule & GTFS-RT** | **Implemented Standard** | Authoritative schedule representation (stops, stop_times, pathways, levels) and live telemetry bindings. | `datasets/mumbai/`, `apps/backend/src/modules/realtime/` |

---

## The 80% Principle: Why Desktop GIS Forged the Spatial Network

A central reality of urban transport engineering is that **software code alone cannot solve spatial ground-truth**. 

While automated scripts and PostGIS queries efficiently execute mathematical translations and schema migrations, programmatic heuristics are blind to real-world physical obstructions. An algorithm cannot recognize whether an entrance coordinate lands on a continuous pedestrian sidewalk, inside an impenetrable boundary wall, or in the center median of an active expressway.

In TransitOS:
* **Code Handled the Pipes (20%)**: Programmatic ingestion, relational database constraints, GTFS export pipelines, and API routing services.
* **Desktop GIS Handled the Reality (80%)**: Candidate station points, corridor polylines, and gate locations were loaded into **QGIS** (`mumbai.qgz`) and **JOSM** for exhaustive manual cartographic correction:
  1. **Visual Layer Cross-Auditing**: Overlaying candidate coordinates against high-resolution satellite imagery (Google Satellite, Esri World Imagery, Bing Aerial) and georeferenced civil DPR drawings.
  2. **Manual Digitization & Snapping**: Transport planners manually dragged and snapped entrance gates from arbitrary road centroids to physical sidewalk kerbs and Foot Overbridge (FOB) staircases.
  3. **Viaduct & Track Centering**: Re-aligning elevated corridor centerlines to strictly follow structural metro pier columns rather than adjacent vehicular flyovers.
  4. **Micro-Topological Editing in JOSM**: Tracing real pedestrian walkways, crosswalks, FOB stairs, and station entry gates to guarantee seamless mathematical reachability from the surrounding street grid.
  5. **Bidirectional Synchronization**: Re-exporting the ground-truthed geometries from QGIS back into the PostGIS database and canonical transit model.

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
