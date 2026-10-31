# TransitOS — Research Integrity, Limitations & Governance

## Commitment to Transparent Engineering

TransitOS maintains an explicit distinction between:
1. **Verified Physical Ground-Truth**: Features verified through CAD blueprints, field surveys, official Wayfinder documents, or high-resolution imagery.
2. **Official Timetable Schedules**: Published agency schedules, stopping patterns, and service windows.
3. **Simulated & Estimated Computations**: In-memory state estimation, kinematic train progression, and synthesized discrete dispatches where real-time AVL streams are not publicly published.

We explicitly reject the practice of presenting estimated or simulated data as official telemetry without clear labeling.

---

## Known Limitations & Boundaries

### 1. Real-Time Feeds vs Operational Telematics
* While TransitOS generates standard GTFS-Realtime Protocol Buffer streams (`/gtfsrt/updates`, `/gtfsrt/vehicles`), these feeds are **Level 3 State-Estimated feeds** derived from discrete timetable physics and headway tracking.
* They represent expected kinematic train progression rather than direct on-board GPS transponder telemetry.
* Direct Level 1 official real-time feeds require formal operational agreements with transit authorities (e.g. MMRCL, MMMOCL).

### 2. Micro-Interchange Internal Depths
* Station platform and concourse vertical depths ($\Delta Z$) are reconstructed from public Detailed Project Report (DPR) engineering cross-sections and architectural plans.
* While horizontal gate positions and platform coordinates are ground-truthed, minor vertical variances may exist in as-built stations.

### 3. Footfall & Passenger Demand
* TransitOS provides the routing graph and spatial capacity models to perform passenger assignment.
* Actual hourly passenger boarding numbers, AFC tap-in/tap-out counts, and ticketing revenue data are proprietary to transit operators and are incorporated only when released under open-data mandates or formal research licenses.

---

## Institutional Engagement & Licensing Principles

* **Independent & Vendor-Neutral**: TransitOS is developed as an independent open-technology initiative. It is designed to interface cleanly with government and transit agency systems without claiming official endorsement where none has been formally granted.
* **Open Source & Open Data**: Core schemas, export tools, and validated GTFS Schedule feeds are published under permissive open licenses (MIT / ODbL) to encourage academic research, developer innovation, and citizen science.
* **Institutional Collaboration**: Academic inquiries, research partnerships, and operator integration discussions should follow standard institutional mechanisms (e.g. IIT Bombay IRCC / SINE collaboration pathways).
