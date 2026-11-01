# Geospatial Engineering Case Studies

This document provides technical case studies demonstrating how TransitOS acquires, reconstructs, georeferences, and validates transit infrastructure data when standard machine-readable feeds are incomplete or unavailable.

---

## Case Study 1: Pune Metro Line 3 — Spatial Data Preparation & Network Reconstruction

### Context & Problem
During the development of the Pune transit model, detailed station-level spatial information and pedestrian connectivity for Pune Metro Line 3 (the Hinjawadi to Shivajinagar elevated corridor) were not available through official open data APIs or single-source mapping downloads. 

A usable pedestrian and station-access representation could not be obtained from an off-the-shelf GTFS feed. Building a reliable routing model required acquiring, inspecting, and reconstructing the spatial infrastructure from ground-level geographic evidence.

```
       [Raw OSM Data Dump]
                │
                ▼
      [JOSM Manual Audit] ───> Fixed disconnected footpaths & station nodes
                │
                ▼
  [Pathways & Access Compiler]
                │
                ▼
[datasets/pune/pune_pathways_network.geojson]
[datasets/pune/pune_discrete_ready.zip]
```

### Data Acquisition & Engineering Approach
1. **OSM Vector Extraction**: OpenStreetMap data covering the Pune metropolitan corridor was exported and filtered for transit infrastructure primitives (`railway=station`, `railway=construction`, `highway=footway`).
2. **Topological Editing in JOSM**: The exported layers were loaded into the Java OpenStreetMap Editor (JOSM). Station footprints were checked against satellite imagery to distinguish physical elevated viaduct alignments from adjacent road kerbs.
3. **Station-Access Reconstruction**: Mapped geometry was inspected to identify gaps between station access portals and the surrounding pedestrian sidewalk grid. Missing pedestrian links across major arterial roads were reconstructed using verified crossing locations.
4. **Integration into Canonical Model**: The prepared geometry was converted into the TransitOS spatial model, producing `datasets/pune/pune_pathways_network.geojson` and unified schedule data in `datasets/pune/pune_discrete_ready.zip`.

### Engineering Significance
A routing engine is only as sound as the network topology beneath it. Where official station CAD or machine-readable pathways do not exist, assuming instantaneous point-to-point transfers produces invalid passenger guidance. Reconstructing and auditing the network in JOSM ensures that passenger routing reflects actual pedestrian access.

---

## Case Study 2: Mumbai Metro Line 7 & Line 9 — CAD Extraction & Helmert Transformation

### Context & Problem
Official station architectural floorplans for Mumbai Metro Line 7 (Andheri East to Dahisar East) and Line 9 (Dahisar East to Mira-Bhayandar) were published in public tender documentation as unprojected, multi-page vector PDF drawings (MMMOCL Annexures B, C, and D). 

These drawings contained high-precision CAD geometry of platform screen doors, concourse stairs, mechanized escalators, passenger elevators, and street-level entry/exit gates, but lacked any spatial reference system (no EPSG code, no geographic coordinates).

```
   [Tender PDF Layout Sheets] (Annexures B, C, D)
                │
                ▼
  [PyMuPDF Vector Primitive Parser]
                │
                ▼
   [Helmert Transformation Engine]
       - Scale: 0.35 m/pt (1:200 sheets)
       - Rotation: Highway corridor bearing
       - Translation: Ground GPS anchor
                │
                ▼
      [Direct QGIS Injection]
  (Loaded as vector layers into mumbai.qgz)
```

### Data Acquisition & Engineering Approach
1. **Script Development**: Developed a dedicated Python transformation script: [`tools/extract_line7_cad_to_qgis.py`](file:///c:/Users/HP/OneDrive/Desktop/MetroRadar/tools/extract_line7_cad_to_qgis.py).
2. **Vector Primitive Extraction**: Using PyMuPDF (`fitz`), the script parsed CAD vector shapes, identifying bounding boxes for ticket counters, security turnstiles, and stairways on $2384 \times 1684\text{ pt}$ layout sheets.
3. **Rigid-Body Helmert Transformation**:
   * **Scale Factor**: Calculated from the sheet drawing scale ($1\text{ pt} = 1/72\text{ in} \approx 0.35\text{ m/pt}$ on $1:200$ engineering sheets).
   * **Corridor Alignment**: Anchored each station to its verified platform centroid and rotated coordinates by the exact highway bearing along the Western Express Highway (e.g. Ovaripada: $6.29^\circ$, National Park: $4.15^\circ$).
4. **QGIS Integration**: The script was designed to run directly inside the **QGIS Python Console** (`qgis.core`), automatically transforming vector paths and loading them as active layers into the project workspace [`mumbai.qgz`](file:///c:/Users/HP/OneDrive/Desktop/MetroRadar/mumbai.qgz).

### Outcome
Generated georeferenced spatial layers for Line 9 stations:
* `datasets/mumbai/line9_geojson/dahisar_east_cad_georeferenced.geojson`
* `datasets/mumbai/line9_geojson/kashigaon_cad_georeferenced.geojson`
* `datasets/mumbai/line9_geojson/miragaon_cad_georeferenced.geojson`
* `datasets/mumbai/line9_geojson/pandurang_wadi_cad_georeferenced.geojson`

---

## Case Study 3: Mumbai Metro Line 1 & Line 3 — Multi-Corridor Interchange Friction

### Context & Problem
Interchanges between legacy elevated metro lines (Line 1) and new underground corridors (Line 3) in Mumbai involve complex vertical and horizontal passenger transitions. 

At **Marol Naka**, commuters transferring between Line 1 (elevated) and Line 3 (underground) must:
1. Alight from the elevated platform (Level +2) and descend to the street exit (Level 0).
2. Exit the Line 1 paid area and walk $180\text{ meters}$ across an outdoor public street plaza.
3. Enter Line 3 underground concourse Gate 1 or Gate 4 and descend through mezzanine levels to the deep bored tunnel platform (Level -3, $\approx 24\text{ meters}$ below street grade).
4. Re-clear security baggage screening and tap in through separate automated fare collection (AFC) turnstiles.

A naive single-point transit model would treat Marol Naka as a zero-second, zero-cost transfer.

```
       [Line 1 Elevated Platform] (Level +2)
                   │
            [Descend Stairs/Escalator]
                   │
            [Exit Line 1 Fare Gates]
                   │
         [Street Walkway: 180m Outdoor Plaza]
                   │
           [Enter Line 3 Gate 1/4]
                   │
            [Security Re-Screening]
                   │
           [Enter Line 3 Fare Gates]
                   │
       [Descend to Deep Bounded Platform] (Level -3)
```

### Engineering Approach
1. **Desktop GIS Layer Auditing in QGIS (`mumbai.qgz`)**: Candidate coordinates for Line 1 elevated piers and Line 3 underground shafts were loaded into QGIS and overlaid against high-resolution aerial imagery. Visual inspection revealed that relying on automated centroid snapping would miss the physical $180\text{ m}$ street-level plaza walk and place the transfer node inside a private commercial compound. Planners manually traced and snapped the walking pathway across the Andheri-Kurla Road pedestrian crossing.
2. **Blueprint Georeferencing**: Georeferenced station blueprints for Line 1 stations to determine exact concourse dimensions and vertical stair locations.
3. **Explicit Transfer Edge Modeling**: In the Canonical Transit Model, the interchange is structured as a typed `WALK` transfer edge:
   * Distance: $450\text{ meters}$ (total walking path including concourses).
   * Duration: $8\text{ minutes}$ ($450\text{ seconds}$).
   * Security / Re-ticketing penalty: Explicitly accounted for in transfer wait calculation.
4. **Isochrone Verification**: Computed 5, 10, and 15-minute pedestrian street catchments around both stations to assess street accessibility.

### Outcome
Commuters receive realistic transfer guidance:
* Step-by-step instructions: *"Exit paid area, complete street walk, then clear security re-screening at destination concourse."*
* Journey planning algorithms accurately rank routes based on true passenger transfer friction rather than illusory instant transfers.
