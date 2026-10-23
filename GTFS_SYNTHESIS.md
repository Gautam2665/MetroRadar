# TransitOS — Transit Data Synthesis Engine (TDSE)
### Technical Specification — Layer 0 Architecture

---

## Table of Contents

1. [The Core Problem](#1-the-core-problem)
2. [Transit Data Synthesis Engine Overview](#2-transit-data-synthesis-engine-overview)
3. [Document Classification System (Categories A–I + X)](#3-document-classification-system-categories-ai--x)
4. [GTFS Schedule Synthesis Pipeline](#4-gtfs-schedule-synthesis-pipeline)
5. [Realtime Data: Three Levels of Truth](#5-realtime-data-three-levels-of-truth)
6. [State Estimation Engine](#6-state-estimation-engine)
7. [Data Provenance and Confidence Scoring](#7-data-provenance-and-confidence-scoring)
8. [Network Coverage and Data Availability Strategy](#8-network-coverage-and-data-availability-strategy)
9. [Design Principles](#9-design-principles)

---

## 1. The Core Problem

Most transit routing and analysis tools are **consumers** of GTFS.

**TransitOS is a producer of GTFS.**

This is a fundamentally different position. Instead of waiting for operators to publish a standards-compliant feed — which many operators have not done and may not do — TransitOS synthesizes a feed from whatever authoritative documentation is publicly available.

The problem transforms from:

> *"We need GTFS to run the analysis."*

into:

> *"We need enough operational information to generate GTFS."*

For most transit networks, sufficient information exists in publicly available documents: Detailed Project Reports (DPRs), operator websites, timetable PDFs, GIS shapefiles, and OpenStreetMap data. The TDSE extracts, models, and synthesizes this information into standards-compliant GTFS schedules and Canonical Transit Model (CTM) records.

This approach has precedent. Community GTFS projects for several networks (e.g., Bengaluru Metro, Chennai Metro, Ahmedabad Metro) demonstrate that high-quality GTFS can be synthesized from public documents. TransitOS extends this methodology by:

1. Applying it systematically across all target networks
2. Assigning structured provenance and confidence to every synthesized field
3. Using the synthesized feed as the canonical input to a full routing and prediction engine
4. Generating an estimated GTFS-Realtime feed where no official feed exists

---

## 2. Transit Data Synthesis Engine Overview

The TDSE is the core data production module of Layer 0. It ingests classified documents and produces structured outputs consumed by all downstream systems.

```
                         Input Sources
        ┌────────────────────┬─────────────────────┐
        │ Official Documents │  GIS & Spatial Data  │
        │ Operator Websites  │  DPRs & EIRs         │
        │ Timetable PDFs     │  OSM Geometry        │
        │ Rolling Stock Specs│  Historical Data      │
        └────────────────────┴─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Transit Data Synthesis Engine │
              │                               │
              │  Document Classifier          │
              │  Extractor Pipelines          │
              │  Physics Modeler              │
              │  Schedule Generator           │
              │  GTFS Validator               │
              │  Provenance Engine            │
              │  Confidence Scorer            │
              └──────────────┬────────────────┘
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐
    │ GTFS Schedule│  │ Canonical   │  │ Provenance       │
    │ (static feed)│  │ Transit     │  │ Records +        │
    │              │  │ Model (CTM) │  │ Confidence Scores│
    └──────────────┘  └─────────────┘  └──────────────────┘
             │               │
             └───────────────┴──────► Journey Engine
                                      Prediction Engine
                                      State Estimation Engine
                                      Public APIs
```

### TDSE Sub-Components

| Sub-Component | Responsibility |
|:---|:---|
| **Document Classifier** | Assigns each ingested document to a category (A–I) based on content type |
| **Extractor** | Pulls structured data fields from PDFs, HTML, CSVs, and GIS files |
| **Physics Modeler** | Computes station-to-station travel times from distance, design speed, and rolling stock acceleration profile |
| **Schedule Generator** | Creates `trips.txt`, `stop_times.txt`, `calendar.txt`, and optionally `frequencies.txt` |
| **Validator** | Checks generated GTFS against the official GTFS specification; runs MobilityData gtfs-validator passes |
| **Provenance Engine** | Records source, method, and version for every generated field |
| **Confidence Scorer** | Assigns a 0–100% confidence score to every synthesized value |

---

## 3. Document Classification System (Categories A–I + X)

Every document ingested by the TDSE is assigned to one of ten categories. The category determines which extraction pipeline is applied, which CTM fields it populates, and which downstream systems it feeds.

### Category A — Network Topology

**Examples:** Detailed Project Reports (DPRs), Environmental Impact Reports (EIRs), alignment drawings, route maps, engineering sanction documents.

**Data extracted:** Line names and route identifiers, station order along each line, track section lengths (km), horizontal curves and gradients, speed restrictions, crossover locations, depot positions.

**CTM output:** `Line`, `Station`, `StationSequence` tables; inter-station distances used by the physics modeler.

---

### Category B — Station Infrastructure

**Examples:** Station architectural plans, platform layout drawings, entrance/exit point maps, concourse level drawings, accessibility audits.

**Data extracted:** Number of platforms and boarding directions, gate/entrance positions and names, lift/escalator/staircase locations, walking distances between platforms (for transfer time estimation), accessibility metadata.

**CTM output:** `Level`, `Platform`, `Entrance`, `Amenity` tables; interchange walk-time estimates; accessibility routing flags.

---

### Category C — Operations

**Examples:** Official timetable PDFs, headway tables, first and last train schedules, service circulars, fleet utilization plans.

**Data extracted:** First and last train times (each direction, each line), peak headway (minutes), off-peak headway, end-to-end journey time, service pattern variations (weekend, public holiday).

**GTFS output:** `trips.txt`, `stop_times.txt`, `calendar.txt`, `calendar_dates.txt`, `frequencies.txt`.

---

### Category D — Rolling Stock

**Examples:** Train set specifications, manufacturer technical manuals, fleet procurement documents, type approval certificates.

**Data extracted:** Maximum operating speed (km/h), acceleration rate (m/s²), braking rate (m/s²), passenger capacity per car and per train, number of cars per set, door configuration, gangway/accessibility features.

**Used for:** Physics-based travel time modeling between stations; capacity estimation; ETA prediction using acceleration/deceleration curves.

---

### Category E — Signalling and Operations Control

**Examples:** Signalling system manuals (CBTC, ATP, ETCS), block section diagrams, speed restriction charts, headway design documentation.

**Data extracted:** Block section boundaries and lengths, minimum safe headway (seconds), permanent speed restrictions by section, temporary speed restrictions from operating circulars.

**Used for:** Minimum headway modeling (capacity estimation), delay propagation simulation, State Estimation Engine.

---

### Category F — GIS and Spatial

**Examples:** Official GIS shapefiles, OpenStreetMap exports, GPS survey data, station coordinate lists, satellite imagery analysis.

**Data extracted:** Latitude/longitude for every station, track polyline geometry, depot coordinates, interchange walking path geometry.

**GTFS output:** `stops.txt` (lat/lon), `shapes.txt` (route geometry polylines); PostGIS geometry columns.

---

### Category G — Commercial and Passenger Information

**Examples:** Official fare charts, station amenity directories, retail outlet listings, parking facility information.

**Data extracted:** Fare zones and pricing matrices, distance-based fare tables, available amenities per station, parking bays and tariffs.

**GTFS output:** `fare_attributes.txt`, `fare_rules.txt`; passenger app station information cards.

---

### Category H — Historical Operations

**Examples:** Archived timetables from previous years, delay and incident reports, maintenance shutdown notices, historical GTFS archives, community-recorded trip timings.

**Data extracted:** Historical travel times (actual vs scheduled), dwell time distributions per station, delay frequency and magnitude patterns, reliability metrics by time of day.

**Used for:** Prediction Engine training data; dwell time estimation (replaces default assumption); section speed calibration; ETA confidence scoring.

---

### Category I — Live Observations

**Examples:** Official GTFS-Realtime feeds, operator REST/WebSocket APIs, GPS traces from contributors, crowdsourced delay reports, IoT sensors.

**Data extracted:** Current vehicle positions, trip updates (delay, cancellation, added service), service alerts, real-time crowding signals.

**Used for:** State Estimation Engine ground-truth anchoring; live vehicle position API; confidence score elevation for real-time predictions.

---

### Category X — TransitOS Synthesized (Intellectual Property)

Category X data is what TransitOS **creates** — not derived from any single external document. It does not exist before the TDSE processes Categories A–I.

**Examples of Category X outputs:** Generated GTFS Schedule feeds, estimated GTFS-Realtime feeds, CTM records, learned dwell time distributions, calibrated section speeds, predicted train positions, confidence scores, journey scores, provenance graphs.

> **Category X is the finished product.** Every other category is a raw material. Generated GTFS feeds may be published as open data contributions.

---

## 4. GTFS Schedule Synthesis Pipeline

Given a minimal operational profile extracted from Categories A, C, D, and F, the TDSE synthesizes a full GTFS schedule in five steps.

### Typical Available Information

| Information | Typical Source |
|:---|:---|
| First and last train times | Operator website |
| Peak / off-peak headway | Timetable PDF |
| End-to-end journey time | Operator website |
| Station names and order | DPR / official website |
| Station coordinates | Official website / GIS |
| Inter-station distances | DPR |
| Design speed | DPR |
| Track geometry | OSM / official GIS |

### Synthesis Steps

**Step 1 — Generate Departure List**

From first train time, last train time, peak headway, and off-peak headway, generate the complete departure sequence for each direction:

```
06:00, 06:04, 06:08, ...  (peak: 4 min headway)
10:00, 10:08, 10:16, ...  (off-peak: 8 min headway)
17:00, 17:04, 17:08, ...  (peak: 4 min headway)
```

**Step 2 — Allocate Inter-Station Travel Times**

Using Category A (inter-station distances) and Category D (rolling stock physics):

```python
# Simplified physics model
section_time = f(distance, max_speed, acceleration, braking, speed_restrictions)
dwell_time   = default_estimate  # or learned from Category H observations
```

The physics model integrates acceleration from rest, cruise at design speed, and braking to stop. Speed restrictions from Category E reduce the cruise speed for affected sections.

**Step 3 — Generate Stop Times**

Propagate departure times through the station sequence using section travel times and dwell times:

```
Station 1: arrive —       depart 06:00:00
Station 2: arrive 06:02   depart 06:02:30
Station 3: arrive 06:04   depart 06:04:30
...
Station N: arrive 06:38   depart —
```

**Step 4 — Generate GTFS Files**

| GTFS File | Source |
|:---|:---|
| `agency.txt` | Category G (operator metadata) |
| `stops.txt` | Category F (GIS coordinates) |
| `routes.txt` | Category A (network topology) |
| `trips.txt` | TDSE (departure list generation) |
| `stop_times.txt` | TDSE (physics model) |
| `calendar.txt` | Category C (operating days) |
| `calendar_dates.txt` | Category C (holidays, exceptions) |
| `shapes.txt` | Category F (route geometry) |
| `frequencies.txt` | Optional — headway-based representation |
| `fare_attributes.txt` | Category G |
| `fare_rules.txt` | Category G |

**Step 5 — Validate Against GTFS Spec**

The generated feed is run through a validation pass (MobilityData's `gtfs-validator`) to confirm spec compliance before it is published or imported into the CTM.

---

## 5. Realtime Data: Three Levels of Truth

Official GTFS-Realtime is not universally available. Where it exists, quality may be insufficient for reliable passenger-facing features (e.g., false vehicle positions, stale updates). TransitOS defines three levels of realtime data quality.

| Level | Label | Source | Confidence | Trigger |
|:---|:---|:---|:---|:---|
| **1** | `official` | Operator GTFS-Realtime feed | 95–99% | Feed exists and quality is verified |
| **2** | `enhanced` | Official feed + TransitOS validation | 85–99% | Official feed exists but is noisy or stale |
| **3** | `estimated` | State Estimation Engine | 60–90% | No official realtime exists |

> TransitOS never presents estimated data as official. Every API response includes `source` and `confidence` fields. The passenger-facing interface clearly distinguishes "Live" from "Estimated."

### GTFS-RT Response Schema

```json
{
  "system": "MMRDA",
  "line": "Yellow",
  "source": "estimated",
  "sourceLevel": 3,
  "confidence": 0.82,
  "generatedAt": "2026-10-01T09:00:00Z",
  "vehicle": {
    "tripId": "mmrda-yl-0900-up",
    "estimatedPosition": { "latitude": 19.1197, "longitude": 72.8466 },
    "currentStopSequence": 7,
    "currentStatus": "IN_TRANSIT_TO"
  }
}
```

---

## 6. State Estimation Engine

The State Estimation Engine (SEE) maintains a probabilistic model of vehicle positions for networks without official realtime feeds. It sits between the Journey Engine and the Prediction Engine.

```
TDSE Schedule
      │
      ▼
Journey Engine
      │
      ▼
State Estimation Engine  ◄── Category I (Live Observations)
      │                  ◄── Category H (Historical baselines)
      │                  ◄── Category C (Operating rules)
      ▼
Prediction Engine
      │
      ▼
Estimated GTFS-Realtime
```

### SEE Responsibilities

| Function | Description |
|:---|:---|
| **Position Inference** | Infer which section a vehicle is traversing based on scheduled time and learned dwell/run times |
| **Delay Estimation** | Estimate current delay from historical delay distributions (Category H) |
| **Dwell Time Inference** | Apply learned dwell distributions to refine position estimates |
| **Missed Departure Detection** | Detect when a departure is likely cancelled based on elapsed time |
| **Observation Fusion** | Merge crowdsourced reports, GPS traces, or official positions when available |
| **Confidence Computation** | Calculate a confidence score for each estimated position |

### State Object

```typescript
interface TrainState {
  tripId: string;
  systemId: string;
  lineId: string;
  estimatedSectionStart: string; // stationId
  estimatedSectionEnd: string;   // stationId
  progressPercent: number;       // 0.0–1.0 through current section
  delay: number;                 // estimated delay in seconds
  confidence: number;            // 0.0–1.0
  source: 'official' | 'enhanced' | 'estimated';
  lastObservation: string | null;
  observationSource: string | null; // 'gtfs-rt' | 'crowdsource' | 'schedule'
}
```

---

## 7. Data Provenance and Confidence Scoring

Every synthesized field in the CTM and every generated GTFS value carries a provenance record. This makes the data auditable and allows downstream users to filter by confidence level for analysis.

### Provenance Record Schema

```typescript
interface ProvenanceRecord {
  field: string;         // e.g. "travelTime", "firstTrain", "stationLat"
  value: unknown;
  source: string;        // Category label + document identifier
  category: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'X';
  method: 'official' | 'extracted' | 'modeled' | 'learned' | 'estimated';
  confidence: number;    // 0.0–1.0
  lastValidated: string; // ISO date
  version: string;       // e.g. "2026.3"
  notes?: string;
}
```

### Confidence Reference

| Data Field | Typical Source | Category | Confidence |
|:---|:---|:---|:---|
| Station coordinates | Official GIS / website | F | 95–100% |
| Station order | DPR | A | 100% |
| Inter-station distance | DPR | A | 100% |
| First / last train time | Official website | C | 95–100% |
| Peak headway | Timetable PDF | C | 90–95% |
| Design speed | DPR | A | 100% |
| Dwell time (default assumed) | — | X | 50–70% |
| Dwell time (learned from history) | Historical observations | H | 75–92% |
| Section speed (physics model) | — | X | 65–80% |
| Section speed (learned) | Historical + GPS | H | 80–95% |
| Track geometry | OSM | F | 80–90% |
| Track geometry | Official GIS shapefile | F | 97–100% |
| Rolling stock max speed | Manufacturer spec | D | 99% |
| Fare matrix | Official fare chart | G | 95–100% |
| Train position (official) | GTFS-Realtime | I | 95–99% |
| Train position (estimated) | State Estimation Engine | X | 60–88% |

### Calibration Feedback Loop

The Calibration and Observation Platform provides empirical ground truth that elevates confidence scores over time:

1. **Synthesized baseline**: Physics model estimates section time A→B = 150 s (confidence 0.70, `method: "modeled"`).
2. **Field measurements**: N=20 timed trips recorded: 148 s, 157 s, 152 s, 161 s, 149 s…
3. **Learned calibration**: System updates to median 153 s, P90 161 s, confidence elevated to 0.91 (`method: "learned"`).

---

## 8. Network Coverage and Data Availability Strategy

### GTFS Availability Matrix

| System | City | Static GTFS | Realtime | Strategy |
|:---|:---|:---|:---|:---|
| DMRC | Delhi-NCR | Official (transportstack.delhi.gov.in) | Level 2 (filtered) | Import static; SEE |
| KMRL | Kochi | Official (kochimetro.org) | Level 3 | Import static; SEE |
| HMRL | Hyderabad | Official (hmrl.co.in/open-data) | Level 3 | Import static; SEE |
| BMRCL | Bengaluru | Community (Vonter/bmrcl-gtfs) | None | Import community GTFS; SEE |
| CMRL | Chennai | Community (ungalsoththu/ChennaiGTFS) | None | Import via frequencies.txt; SEE |
| GMRC | Ahmedabad | Community ETL pipeline | None | Import community GTFS; SEE |
| MMRDA/MMRC | Mumbai | None | None | TDSE Synthesis from DPR + timetables |
| MahaMetro | Pune | None | None | TDSE Synthesis |
| MahaMetro | Nagpur | None | None | TDSE Synthesis |
| Kolkata Metro | Kolkata | None | None | TDSE Synthesis + OSM |
| UPMRC | Lucknow | None | None | TDSE Synthesis |
| JMRC | Jaipur | None | None | TDSE Synthesis |

### Ingestion Priority Phases

- **Phase 1 (immediate — official static)**: Delhi, Kochi, Hyderabad, NCRTC Namo Bharat
- **Phase 2 (immediate — community GTFS)**: Bengaluru, Chennai, Ahmedabad
- **Phase 3 (TDSE synthesis)**: Mumbai, Pune, Nagpur, Kolkata, Lucknow, Jaipur, Kanpur
- **Phase 4 (pre-opening synthesis)**: Networks under construction — Agra, Navi Mumbai, Indore, Surat, Patna, Bhopal

The TransitOS `IngestionService` and CTM schema are fully compatible with standard GTFS archives including `frequencies.txt`, `shapes.txt`, `calendar_dates.txt`, `trips.txt`, and `stop_times.txt`. Systems with official or community GTFS feeds can be imported directly without custom parsing code.

---

## 9. Design Principles

### P1 — Synthesis over Dependence

TransitOS does not depend on official GTFS or GTFS-Realtime. It consumes them when available, synthesizes them when absent, and clearly identifies the provenance and confidence of every dataset it serves. Analysis is not blocked by a missing operator feed.

### P2 — Provenance is Mandatory

TransitOS never serves a data point without knowing where it came from, how it was derived, and how confident the system is in its accuracy. Every generated field carries a `ProvenanceRecord`. This makes sensitivity analysis possible: analysts can filter routes or catchments by confidence tier to understand which conclusions depend on synthesized assumptions vs confirmed measurements.

### P3 — Honesty in Labels

TransitOS never presents synthesized data as official data. Every API response carries `source` and `confidence` metadata. The passenger-facing interface clearly distinguishes "Live" from "Estimated". This principle extends to corridor analysis outputs: results derived from modeled travel times are labelled as such and are distinct from results calibrated against field observations.

### P4 — Calibration over Assumption

Default physics model assumptions (dwell times, section speeds) are documented, defensible starting points — not permanent values. The Calibration and Observation Platform is designed to systematically replace assumptions with measured distributions as field data accumulates. Sensitivity outputs from the routing engine show which analytical conclusions are most sensitive to the least-calibrated inputs, directing data collection effort.

### P5 — Separation of Computation and Communication

Core transit calculations (routing, generalized cost, interchange friction, catchment analysis, demand estimation) execute on deterministic, testable backend engines. External AI systems (voice, vision, natural language) are interface translation layers only. Removing all external AI providers leaves the analytical platform fully operational.
