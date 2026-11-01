# Nagpur Metro — Data Acquisition & Lineage

## Dataset Overview
- **Operator:** Maharashtra Metro Rail Corporation Limited (Maha Metro)
- **Network:** Nagpur Metro
  - **Orange Line (North-South):** Automotive Square ↔ Khapri
  - **Aqua Line (East-West):** Prajapati Nagar ↔ Lokmanya Nagar
- **Format:** Canonical Reconstructed GTFS + Spatial Station Nodes
- **Trust Tier:** Tier B (Reconstructed from official alignments and field surveys)

---

## Data Acquisition Methodology
1. **Station Geocoding:** Mapped using authoritative Maha Metro portal coordinates cross-referenced against Esri ArcGIS spatial features.
2. **Alignment Extraction:** Extracted corridor centerlines and turn radii adhering to revenue railway tracks.
3. **Operational Timetables:** Frequency-based headway scheduling representing standard operational headways (15-min off-peak, 10-min peak).

---

## Access Governance
Raw static GTFS tables (`stop_times.txt`, `trips.txt`) are protected in TransitOS private object storage and accessed via the **TransitOS API Gateway**:
* **Stations Endpoint:** `GET /api/v1/stations?city=nagpur`
* **Corridors Endpoint:** `GET /api/v1/corridors?system=NAGPUR`
* **Route Calculation:** `POST /api/v1/journeys/plan`
