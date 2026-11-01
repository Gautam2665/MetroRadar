# Navi Mumbai Metro — Data Acquisition & Lineage

## Dataset Overview
- **Operator:** City and Industrial Development Corporation (CIDCO) / MMMOCL
- **Network:** Navi Mumbai Metro Line 1
  - **Route:** Belapur ↔ Pendhar (11 stations)
- **Format:** Canonical Reconstructed GTFS + Spatial Station Nodes
- **Trust Tier:** Tier B (Reconstructed from official alignments and field surveys)

---

## Data Acquisition Methodology
1. **Station Geocoding:** 11 operational elevated stations mapped using official CIDCO civil tender documents and satellite ground truth.
2. **Alignment Extraction:** Corridor geometry georeferenced from CIDCO alignment blueprints.
3. **Operational Timetables:** Frequency-based timetable modeling 15-minute headway operations.

---

## Access Governance
Raw static GTFS tables (`stop_times.txt`, `trips.txt`) are protected in TransitOS private object storage and accessed via the **TransitOS API Gateway**:
* **Stations Endpoint:** `GET /api/v1/stations?city=navi_mumbai`
* **Corridors Endpoint:** `GET /api/v1/corridors?system=CIDCO`
* **Route Calculation:** `POST /api/v1/journeys/plan`
