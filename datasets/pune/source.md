# Pune Metro — Data Acquisition & Lineage

## Dataset Overview
- **Operator:** Maharashtra Metro Rail Corporation Limited (Maha Metro) & PMRDA
- **Network:** Pune Metro
  - **Purple Line (Line 1):** PCMC ↔ Swargate
  - **Aqua Line (Line 2):** Vanaz ↔ Ramwadi
  - **Line 3:** Hinjawadi ↔ Shivajinagar
- **Format:** Canonical Reconstructed GTFS + Spatial Pathways
- **Trust Tier:** Tier B (Reconstructed from official alignments and field surveys)

---

## Data Acquisition Methodology
1. **Station Geocoding & Footprints:** Sourced via OpenStreetMap extracts and refined with JOSM micro-mapping for entry/exit gates.
2. **Alignment Extraction:** Georeferenced alignment polylines extracted from Maha Metro public GIS layers and validated against MoHUA project boundaries.
3. **Operational Timetables:** Frequency-based headway scheduling calibrated to revenue operating windows (06:00 to 22:00 IST).

---

## Access Governance
Raw static GTFS tables (`stop_times.txt`, `trips.txt`) are maintained in TransitOS private object storage and accessed via the **TransitOS API Gateway**:
* **Stations Endpoint:** `GET /api/v1/stations?city=pune`
* **Corridors Endpoint:** `GET /api/v1/corridors?system=PUNE`
* **Route Calculation:** `POST /api/v1/journeys/plan`
