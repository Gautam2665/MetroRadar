# Spatial & Topological Validation Framework

A transit platform that claims to model physical station infrastructure must prove its spatial integrity through repeatable automated audits. TransitOS implements a multi-stage validation framework that verifies coordinate geometry, topological graph connectivity, and transit specification compliance before data is served to routing engines.

---

## 1. Geometric & Coordinate Bounds Validation

Every spatial entity ingested into TransitOS must pass automated geographic boundary checks:

```typescript
// Metropolitan Regional Envelope (MMR)
const MMR_BOUNDS = {
  minLat: 18.8000,
  maxLat: 19.5000,
  minLng: 72.7000,
  maxLng: 73.3000,
};

function validateCoordinates(lat: number, lng: number, entityId: string): void {
  if (isNaN(lat) || isNaN(lng)) {
    throw new ValidationError(`Entity ${entityId} has NaN coordinate values`);
  }
  if (lat < MMR_BOUNDS.minLat || lat > MMR_BOUNDS.maxLat ||
      lng < MMR_BOUNDS.minLng || lng > MMR_BOUNDS.maxLng) {
    throw new BoundsError(`Entity ${entityId} coordinates (${lat}, ${lng}) fall outside MMR envelope`);
  }
}
```

* **Inversion Detection**: Catches accidental `(lat, lng)` vs `(lng, lat)` transpositions by checking that all longitudes reside near $72.8^\circ\text{E}$ and latitudes near $19.0^\circ\text{N}$.
* **Zero & Null Point Exclusion**: Rejects placeholder coordinates `(0, 0)` or missing geometry fields during ingestion.

---

## 2. Referential & Topological Integrity

TransitOS validates the parent-child hierarchy across all station infrastructure entities:

```
               [Parent Station] (location_type = 1)
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [Platform]              [Entrance]
 (location_type = 0)    (location_type = 2)
         │                       │
         └──────────┬────────────┘
                    ▼
               [Pathways]
      (Stairs, Corridors, Lifts)
```

1. **Orphan Platform Prevention**: Every platform (`location_type=0`) must belong to an active parent station (`location_type=1`).
2. **Orphan Entrance Prevention**: Every entrance gate (`location_type=2`) must resolve to a valid parent station.
3. **No Self-Referencing Pathways**: `pathway.from_stop_id !== pathway.to_stop_id`.
4. **Valid Level Association**: Nodes referenced in vertical pathway links must specify valid matching `level_id` values defined in `levels.txt`.

---

## 3. Cartographic & Visual Auditing in QGIS (Why Code Alone Fails)

Automated programmatic validation (bounds checks, schema tests, foreign key integrity) is essential for data hygiene, but it is **fundamentally incapable of verifying physical urban reality**. A coordinate pair `(19.1197, 72.8464)` is completely valid to a TypeScript parser, but that same coordinate might sit in the center median of an active highway, on top of an impenetrable sound-barrier wall, or 30 meters away from the actual pedestrian entrance.

Transport planners in TransitOS bridge this gap by enforcing **human-in-the-loop cartographic auditing in QGIS (`mumbai.qgz`) and JOSM**, accounting for **over 80% of all spatial corrections**:

| Error Category | What Code Sees | What Desktop GIS (QGIS & JOSM) Audits |
|---|---|---|
| **Entrance Gate Placement** | Valid float coordinates within metropolitan boundary. | Verifies whether the gate node physically snaps to a walkable sidewalk kerb rather than a vehicular carriageway. |
| **Foot Overbridge (FOB) Landings** | Straight-line distance $d < 500\text{ m}$. | Traces actual physical staircases, concourse connection piers, and pedestrian skywalk enclosures over arterial roads. |
| **Platform Orientation & Viaduct Alignment** | Polyline with $N$ vertices. | Aligns platform geometry directly over physical structural columns and revenue tracks visible in high-resolution satellite imagery. |
| **Pedestrian Graph Continuity** | Graph nodes exist in database. | Audits in JOSM to ensure footpaths do not terminate abruptly at kerbs without connecting crosswalks or access pathways. |
| **Multi-Tier Vertical Interchanges** | Two stations have $d \approx 100\text{ m}$. | Distinguishes elevated viaduct levels (+18m), concourse mezzanines (+8m), and ground access (0m) to eliminate unrealistic horizontal teleportation. |

### The PostGIS ↔ QGIS Auditing Cycle
1. Candidate spatial tables are loaded directly into **QGIS** as PostGIS vector layers.
2. Layers are visualized over multi-source satellite basemaps (Google Satellite, Bing Aerial, Esri World Imagery) and georeferenced civil DPR drawings.
3. Planners manually adjust vertex positions, snap gate coordinates to real kerbs, and rectify corridor curves.
4. Cleaned spatial geometries are committed back into the canonical database.

---

## 4. GTFS Schedule Specification Compliance

TransitOS validates all synthesized feeds using the **Canonical GTFS Schedule Validator** (version 8.0.1, maintained by MobilityData).

### Critical Notice Checks & Resolutions

| GTFS Notice Code | Severity | Description | Resolution in TransitOS Pipeline |
|---|---|---|---|
| `pathway_unreachable_location` | **ERROR** | A platform, boarding area, or node cannot be reached from an entrance or exit. | Synchronized entrance bidirectional pathways and corrected gate regex filtering in `scripts/export_synchronized_gtfs.js`. |
| `stop_without_parent_station` | **WARNING** | Platforms or gates lack assigned parent stations. | Enforced relational foreign keys in `prisma.station.findMany()`. |
| `pathway_loop` | **WARNING** | A pathway begins and ends at the exact same stop. | Filtered out reflexive edges during pathway compilation. |
| `transfers_missing_stop` | **ERROR** | Transfer points reference deleted or non-existent stops. | Foreign key constraints in PostGIS prevent orphan transfer edges. |

*Production Benchmark*: Canonical GTFS export (`datasets/mumbai/mumbai_discrete_ready.zip`) passes MobilityData validation with **zero errors**.

---

## 5. Graph Reachability & Routing Sanity Checks

Beyond static GTFS schema checks, TransitOS validates that the graph is mathematically and operationally traversable:

### 1. BFS Entrance-to-Platform Reachability
For every station in the system, a Breadth-First Search (BFS) is executed starting from each street entrance gate:
$$\forall s \in S_{\text{platforms}}, \quad \exists v \in S_{\text{entrances}} : \text{Path}(v, s) \neq \emptyset$$
If any platform cannot be reached from the street due to broken or unidirectionally inverted pathways, an automated audit alert is generated.

### 2. Interchange Connectivity Verification
Every declared multi-line interchange complex (e.g. D.N. Nagar $\leftrightarrow$ Andheri West, Marol Naka Line 1 $\leftrightarrow$ Line 3, Gundavali $\leftrightarrow$ Western Express Highway) is checked to ensure that:
* Physical pedestrian walking edges connect the intersecting concourses or platforms.
* Walking distance does not exceed realistic human limits ($d_{\text{transfer}} \le 1200\text{ m}$).
* Realistic traversal times ($t_{\text{walk}} \ge 60\text{ s}$) are assigned rather than zero-second teleport jumps.

---

## 6. Unresolved Gaps & Uncertainty Tracking

TransitOS explicitly documents the maturity of each station representation in its dataset catalogue:
* **Surveyed & Ground-Truthed**: Entrances, platforms, and turnstiles mapped from as-built drawings or physical GPS surveys (e.g. Line 2A, Line 7, Line 3). Confidence score: `0.95`.
* **CAD-Reconstructed**: Station geometry transformed from design layout drawings pending post-construction verification (e.g. Line 9). Confidence score: `0.85`.
* **Centroid Approximations**: Stations where entrance locations are temporarily approximated using station platform centroids until detailed surveys are completed. Confidence score: `0.70`.
