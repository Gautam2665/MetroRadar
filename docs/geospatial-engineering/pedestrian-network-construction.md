# Pedestrian Network Construction & Station Access

In many naive transit journey planners, walking connections are modeled as straight Euclidean lines, and stations are collapsed into dimensionless single-coordinate points. This simplification introduces major errors in urban transit navigation:
1. **False Connectivity**: Two stations or gates may be $50\text{ meters}$ apart geometrically across an active railway embankment, highway divider, or security wall, with no legal pedestrian crossing.
2. **Missing Vertical Impedance**: Ascending three flights of stairs ($12\text{ meters}$ vertical rise) in a tropical climate imposes substantial physical exertion that is invisible in 2D Euclidean distance.
3. **Interchange Friction Underestimation**: Walking through a multi-corridor transit hub involves clearing ticket barriers (AFC), traversing pedestrian foot overbridges (FOBs), navigating concourse passageways, and descending to underground platforms.

TransitOS models pedestrian connectivity as a physically grounded, topologically verified network.

---

## Geometric Proximity vs. Physical Traversability

```
        Naive Model                     TransitOS CTM Model
        
    Gate A       Platform            Gate A          Platform
      ●──────────────●                 ●───────[Stair]───────●
     (50m straight jump)               │  (Level 0 -> Level 1)
                                   [FOB Corridor]
                                       │
                                     Gate B
                                       ●
```

TransitOS enforces two foundational modeling rules:
* **No Phantom Connections**: Two nodes are only connected in the graph if an explicit, ground-truthed physical traversable link exists (verified via OpenStreetMap, aerial imagery, or station blueprint).
* **Directional Impedance**: Pathways encode traversal mode (walking, stair, escalator, elevator), directionality (unidirectional turnstiles or bidirectional corridors), and vertical level differentials.

---

## The Multimodal Pedestrian Graph Structure

The pedestrian network is represented as an edge-weighted directed graph $G_p = (V_p, E_p)$:

### 1. Vertices ($V_p$)
* **`STATION_ENTRANCE`**: Street-level access gates with verified GPS coordinates (e.g. Churchgate Gate A1).
* **`CONCOURSE_NODE`**: Ticket hall, ticketing banks, and security screening plazas (Level 0 / Level 1).
* **`PLATFORM_NODE`**: Train boarding areas tagged with track identifiers, platform numbers, and line associations.
* **`STREET_INTERSECTION`**: Street crossings and sidewalk junctions connecting surrounding pedestrian networks.

### 2. Edges ($E_p$)
* **Horizontal Walkway (`WALK`)**: Flat concourse corridors, foot overbridges (FOBs), and street sidewalks. Speed: $v_{\text{walk}} \approx 1.2\text{ m/s}$.
* **Stairs (`STAIR`)**: Fixed stairways with step counts and vertical rise ($\Delta Z$). Weighted with an energy penalty factor ($w_z = 2.5$).
* **Escalators (`ESCALATOR`)**: Mechanised moving stairs operating at nominal speed $0.6\text{ m/s}$, flagged with ascent/descent directionality.
* **Elevators / Lifts (`ELEVATOR`)**: Step-free accessible connections with door open/close cycle waiting buffers ($t_{\text{cycle}} \approx 30\text{--}45\text{ s}$).
* **Fare Gates (`AFC_TURNSTILE`)**: Automated fare collection barriers representing entry/exit between paid and unpaid concourse areas.

---

## Tooling & Pipelines in TransitOS

### 1. JOSM Topological Auditing (`scripts/export_l2a_l7_for_josm.js`)
The TransitOS codebase provides an automated exporter that extracts all database station entities, verified gate coordinates, and pedestrian alignments into GeoJSON formatted specifically for JOSM:
```bash
node scripts/export_l2a_l7_for_josm.js
```
This generates four audited datasets in `datasets/mumbai/exports/`:
* `clean_l2a_l7_entrances.geojson`: Verified gate points with `ref` tags.
* `l2a_l7_stations.geojson`: Station centroids with line codes.
* `l2a_l7_alignments.geojson`: Viaduct centerlines.
* `l2a_l7_pedestrian_network.geojson`: Street sidewalk ways tagged with `highway=footway` and `footway=sidewalk`.

In JOSM, transport engineers can visually inspect the snapped connection between the station entrance node and the surrounding OSM sidewalk network to ensure zero disconnected islands.

### 2. Pedestrian Graph Ingestion (`scripts/ingest_all_l2a_l7_pedestrian.js`)
Once validated, the pedestrian network is compiled into the PostgreSQL/PostGIS database:
```bash
node scripts/ingest_all_l2a_l7_pedestrian.js
```
The script registers all entrance gates, snaps them to nearest concourse nodes, and establishes bidirectional walking edges with calculated lengths and walking durations.

### 3. Walking Catchment Isochrones (`scripts/compute_all_l2a_l7_isochrones.js`)
Rather than drawing circular radial buffers (which overestimate accessibility in areas with physical barriers such as railway tracks or water bodies), TransitOS computes network-based pedestrian catchments:
```bash
node scripts/compute_all_l2a_l7_isochrones.js
```
* Generates **5-minute (400m)**, **10-minute (800m)**, and **15-minute (1200m)** pedestrian isochrones along actual walkable street centerlines.
* Output GeoJSON polygons are stored in `datasets/mumbai/line1_station_blueprints/` and rendered in the Transit Data Explorer.
