# Mumbai Metro & Monorail Network — Data Acquisition & Lineage

## Network Overview
- **System:** Mumbai Metropolitan Transit Network
- **Operators:**
  - Maha Mumbai Metro Operations Corporation Ltd (MMMOCL) — Lines 2A & 7
  - Mumbai Metro One Private Limited (MMOPL) — Line 1
  - Mumbai Metro Rail Corporation Limited (MMRCL) — Line 3 (Aqua Line)
  - Maha Mumbai Monorail Operations (MMRDA) — Monorail Line 1
- **Format:** Canonical Reconstructed GTFS + GTFS-Pathways + GTFS Fares v1/v2
- **Data Lineage:** Multimodal CAD blueprints, DPR alignment extractions, georeferenced station footprints, and calibrated field topologies.

---

## Data Distribution & Access Governance

In accordance with TransitOS data governance and operator licensing terms, raw operational schedule tables (`stop_times.txt`, `trips.txt`, `shapes.txt`) and CAD engineering extractions are **not redistributed as raw file dumps in public source control**.

Access to the Mumbai transit network model is provided programmatically via:

### 1. TransitOS Developer APIs
* **Station Metadata & Access Gates:** `GET /api/v1/stations?city=mumbai`
* **Corridor Geometry & Alignments:** `GET /api/v1/corridors?system=MMRDA`
* **Realtime Vehicle Telemetry & Predictions:** `GET /api/v1/realtime/updates`
* **Multimodal Routing Engine:** `POST /api/v1/journeys/plan`

### 2. Certified Feed Exports
Enterprise users, urban planning institutions, and transport research labs may request certified canonical GTFS exports (`mumbai_discrete_ready.zip`) via the TransitOS Data Portal with appropriate research or commercial licensing.
