# GTFS Engineering Synthesis
### TransitOS — Transit Data Synthesis Engine (TDSE)
**Permanent Architecture Reference**

---

## Table of Contents
- [1. The Core Insight](#1-the-core-insight)
- [2. Transit Data Synthesis Engine (TDSE)](#2-transit-data-synthesis-engine-tdse)
- [3. Document Classification System (A–I + X)](#3-document-classification-system-ai--x)
- [4. GTFS Schedule Synthesis Pipeline](#4-gtfs-schedule-synthesis-pipeline)
- [5. Realtime: Three Levels of Truth](#5-realtime-three-levels-of-truth)
- [6. State Estimation Engine](#6-state-estimation-engine)
- [7. Data Provenance & Confidence Scoring](#7-data-provenance--confidence-scoring)
- [8. All 20 Indian Metro Systems Strategy](#8-all-20-indian-metro-systems-strategy)
- [9. The Four-Layer Platform Architecture](#9-the-four-layer-platform-architecture)
- [10. TransitOS Design Principles](#10-transitios-design-principles)
- [11. Relationship to Existing Architecture](#11-relationship-to-existing-architecture)

---

## 1. The Core Insight

Most journey planners are **consumers** of GTFS.

**TransitOS is a producer of GTFS.**

That is a fundamentally different position. Instead of waiting for operators to publish a standards-compliant feed, TransitOS synthesizes one from whatever authoritative documentation is publicly available. The problem transforms from:

> *"We need GTFS."*

into:

> *"We need enough operational information to generate GTFS."*

### Evidence from the Field

The [BMRCL community GTFS project](https://github.com/opentransitindia/bengaluru-metro) demonstrates this is already being done. That feed is generated from:
- **OpenStreetMap geometry** for route shapes
- **BMRCL published headways** (not stop-by-stop timings) for schedule reconstruction
- **Modeled dwell times and section speeds** to synthesize `stop_times.txt`

TransitOS takes this approach further by:
1. Covering all 20 Indian metro systems
2. Assigning provenance and confidence to every synthesized field
3. Using the synthesized feed as the canonical input to a full journey planner and prediction engine
4. Ultimately generating an **estimated GTFS-Realtime** feed as well

---

## 2. Transit Data Synthesis Engine (TDSE)

The **Transit Data Synthesis Engine** is the core module responsible for turning raw operator documents, GIS data, and historical observations into standards-compliant transit feeds and a Canonical Transit Model (CTM).

> **Why "Synthesis" and not "Reconstruction"?**  
> "Reconstruction" implies restoring something that once existed. TransitOS is *creating* something new from first principles. The operator may never have published a GTFS feed. We are synthesizing one.

### Responsibility Diagram

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    Input Sources                            │
  │                                                             │
  │  Official Documents    GIS & Spatial    Historical Data     │
  │  Operator Websites     DPRs & EIRs      Live Observations   │
  │  Timetable PDFs        OSM Geometry     Community GTFS      │
  └────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │            Transit Data Synthesis Engine (TDSE)             │
  │                                                             │
  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
  │  │  Extractor  │  │  Validator   │  │  Provenance Engine │  │
  │  └─────────────┘  └──────────────┘  └───────────────────┘  │
  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
  │  │  Modeler    │  │  Confidence  │  │  Knowledge Graph   │  │
  │  │  (physics)  │  │  Scorer      │  │  Builder           │  │
  │  └─────────────┘  └──────────────┘  └───────────────────┘  │
  └────────────────────────────┬────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐
  │  GTFS Schedule │  │ Canonical    │  │  Provenance      │
  │  (static feed) │  │ Transit      │  │  Metadata +      │
  │                │  │ Model (CTM)  │  │  Confidence      │
  └────────────────┘  └──────────────┘  │  Scores          │
                               │        └──────────────────┘
                               ▼
               ┌───────────────────────────────┐
               │   Journey Planner             │
               │   Prediction Engine           │
               │   State Estimation Engine     │
               │   Public APIs                 │
               │   Analytics                   │
               └───────────────────────────────┘
```

### TDSE Sub-Components

| Sub-Component | Responsibility |
|:---|:---|
| **Document Classifier** | Assigns each ingested document to a category (A–I) based on content type |
| **Extractor** | Pulls structured data fields from PDFs, HTML, CSVs, and GIS files |
| **Physics Modeler** | Computes travel times between stations using distance, design speed, acceleration profiles |
| **Schedule Generator** | Creates `trips.txt`, `stop_times.txt`, `calendar.txt`, and optionally `frequencies.txt` |
| **Validator** | Checks generated GTFS against the official GTFS specification schema |
| **Provenance Engine** | Records the source, method, and version for every generated field |
| **Confidence Scorer** | Assigns a 0–100% confidence to every synthesized value |
| **Knowledge Graph Builder** | Maintains a graph of all extracted facts and their relationships |

---

## 3. Document Classification System (A–I + X)

Every document ingested by TransitOS is classified into one of ten categories. The category determines which extractor pipeline is applied, which CTM fields it can populate, and which downstream modules it feeds.

---

### Category A — Network Topology

**Purpose**: Define the physical network structure.

**Examples**:
- Detailed Project Reports (DPRs)
- Environmental Impact Reports (EIRs)
- Alignment drawings / route maps
- Engineering sanction documents

**Data Extracted**:
- Line names and route identifiers
- Station order along each line
- Track section lengths (km)
- Curves, gradients, and speed restrictions
- Crossover locations
- Depot positions

**Used For**:
- CTM `Line`, `Station`, `StationSequence` tables
- Route graph construction
- Distance-based travel time modeling
- Track geometry generation for `shapes.txt`

---

### Category B — Station Infrastructure

**Purpose**: Model the internal physical structure of stations.

**Examples**:
- Station architectural plans
- Platform layout drawings
- Entry/exit point maps
- Concourse level drawings
- Accessibility audits

**Data Extracted**:
- Number of platforms and their directions
- Gate / entrance positions and names
- Lift, escalator, and staircase locations
- Walking distances between platforms (transfer time estimation)
- Accessibility metadata (wheelchair, tactile paving)

**Used For**:
- CTM `Level`, `Platform`, `Entrance`, `Amenity` tables
- Digital Twin payloads
- Indoor navigation routing
- Inter-platform transfer time calculation
- Accessibility routing flags

---

### Category C — Operations

**Purpose**: Define how the service runs.

**Examples**:
- Official timetable PDFs
- Headway tables
- First and last train schedules
- Service circulars / notices
- Fleet utilization plans

**Data Extracted**:
- First train time (each direction, each line)
- Last train time (each direction, each line)
- Peak headway (minutes)
- Off-peak headway (minutes)
- End-to-end journey time
- Service pattern variations (weekend, public holiday)

**Used For**:
- GTFS `trips.txt` generation
- GTFS `stop_times.txt` generation
- GTFS `calendar.txt` and `calendar_dates.txt`
- GTFS `frequencies.txt` for headway-based representation
- Journey planner scheduling

---

### Category D — Rolling Stock

**Purpose**: Characterize the performance envelope of trains.

**Examples**:
- Train set specifications
- Manufacturer technical manuals
- Fleet procurement documents
- Type approval certificates

**Data Extracted**:
- Maximum operating speed (km/h)
- Acceleration rate (m/s²)
- Braking rate (m/s²)
- Passenger capacity per car and per train
- Number of cars per train set
- Door configuration (number of doors, door width)
- Gangway / accessible features

**Used For**:
- Physics-based travel time modeling between stations
- Energy consumption models
- Digital Twin capacity estimation
- ETA prediction (acceleration/deceleration curves)
- Crowd estimation

---

### Category E — Signalling & Operations Control

**Purpose**: Model the operational safety envelope and headway constraints.

**Examples**:
- Signalling system manuals (CBTC, ATP, ETCS)
- Block section diagrams
- Speed restriction charts
- Headway design documentation

**Data Extracted**:
- Block section boundaries and lengths
- Minimum safe headway (seconds)
- Signal aspect sequences
- Permanent speed restrictions by section
- Temporary speed restrictions (if from operating circulars)

**Used For**:
- Minimum headway modeling (capacity estimation)
- Delay propagation simulation
- State Estimation Engine (inferring train positions)
- Digital Twin operational state overlays

---

### Category F — GIS & Spatial

**Purpose**: Anchor all network elements to real-world coordinates.

**Examples**:
- Official GIS shapefiles
- OpenStreetMap (OSM) export
- GPS survey data
- Station coordinate lists from official websites
- Satellite imagery analysis

**Data Extracted**:
- Latitude / longitude for every station
- Track polyline geometry
- Depot coordinates
- Interchange walking path geometry

**Used For**:
- GTFS `stops.txt` (lat/lon)
- GTFS `shapes.txt` (route geometry polylines)
- Map rendering (MapLibre layers)
- PostGIS geometry columns
- Spatial proximity queries (transfer detection)

---

### Category G — Commercial & Passenger Information

**Purpose**: Enrich the passenger experience with commercial data.

**Examples**:
- Official fare charts
- Station amenities directories
- Retail outlet listings
- Parking facility information
- Lost and found procedures

**Data Extracted**:
- Fare zones and pricing matrices
- Distance-based fare tables
- Available amenities per station (ATM, food, pharmacy)
- Parking bays and tariffs

**Used For**:
- Fare Intelligence Engine
- GTFS `fare_attributes.txt` and `fare_rules.txt`
- Passenger app station information cards
- Commercial analytics module

---

### Category H — Historical Operations

**Purpose**: Learn from the past to improve present estimates.

**Examples**:
- Archived timetables (previous years)
- Delay and incident reports
- Maintenance shutdown notices
- Historical GTFS archives
- Community-recorded trip timings

**Data Extracted**:
- Historical travel times (actual vs scheduled)
- Dwell time distributions per station
- Delay frequency and magnitude patterns
- Common disruption patterns (signal failures, crowding)
- Reliability metrics by time of day

**Used For**:
- Prediction Engine ML training datasets
- Dwell time estimation (replaces default assumption)
- Section speed calibration
- ETA confidence scoring
- Reliability dashboards

---

### Category I — Live Observations

**Purpose**: Capture the current operational state of the network.

**Examples**:
- Official GTFS-Realtime feeds
- Operator REST / WebSocket APIs
- GPS traces from community contributors
- Crowdsourced delay reports
- IoT sensors (BLE beacons, Wi-Fi probes)
- CCTV analytics (if accessible)

**Data Extracted**:
- Current vehicle positions
- Trip updates (delay, cancellation, added service)
- Service alerts
- Real-time crowding signals

**Used For**:
- State Estimation Engine (ground-truth anchoring)
- Live Vehicle Position API
- Estimated GTFS-Realtime improvement
- Confidence score elevation for real-time predictions
- Incident detection and alerting

---

### Category X — TransitOS Synthesized (Intellectual Property)

**Purpose**: Data that TransitOS itself creates — not derived from any single external document.

This is the output layer. It does not exist before TransitOS processes categories A–I.

**Examples**:
- Generated GTFS Schedule feeds
- Estimated GTFS-Realtime feeds
- Canonical Transit Model (CTM) records
- Learned dwell time distributions
- Calibrated section speeds
- Predicted train positions
- Confidence scores per field
- Journey scores
- Route scoring outputs
- ETA predictions
- Provenance graphs

**Used For**:
- Journey Planner (all downstream routing)
- State Estimation Engine
- Prediction Engine
- Public APIs (GTFS export, developer access)
- Passenger app
- Operator analytics
- Open data contributions

> **Category X is TransitOS's intellectual property.**  
> Every other category is a raw material. Category X is the finished product.

---

## 4. GTFS Schedule Synthesis Pipeline

### What Operators Typically Publish

For most Indian metro systems, the following information is publicly available even without an official GTFS feed:

| Information | Typical Source |
|:---|:---|
| First train time | Operator website |
| Last train time | Operator website |
| Peak headway | Timetable PDF / website |
| Off-peak headway | Timetable PDF / website |
| End-to-end journey time | Operator website |
| Station names and order | DPR / official website |
| Station coordinates | Official website / GIS |
| Distance between stations | DPR |
| Design speed | DPR |
| Track geometry | OSM / GIS |

### From That Information to GTFS

Given a minimal operational profile:

```
First train:   05:30
Last train:    23:30
Peak headway:  4 minutes   (06:00–10:00, 17:00–21:00)
Off-peak:      8 minutes   (all other times)
Journey time:  38 minutes
Stations:      22 stations
```

The TDSE performs the following steps:

**Step 1 — Generate Departure List**

```
06:00, 06:04, 06:08, 06:12 ...  (peak)
10:00, 10:08, 10:16 ...         (off-peak)
17:00, 17:04, 17:08 ...         (peak)
```

**Step 2 — Allocate Inter-Station Travel Times**

Using Category A (distance) + Category D (rolling stock physics):

```python
# Simplified physics model
section_time = f(distance, max_speed, acceleration, braking, speed_restrictions)
dwell_time   = default_estimate  # or learned from Category H
```

**Step 3 — Generate Stop Times**

```
Station 1: arrive -      depart 06:00
Station 2: arrive 06:02  depart 06:02:30
Station 3: arrive 06:04  depart 06:04:30
...
Station 22: arrive 06:38  depart -
```

**Step 4 — Generate GTFS Files**

| GTFS File | Generated By |
|:---|:---|
| `agency.txt` | Category G (operator metadata) |
| `stops.txt` | Category F (GIS coordinates) |
| `routes.txt` | Category A (network topology) |
| `trips.txt` | TDSE (departure list) |
| `stop_times.txt` | TDSE (physics model) |
| `calendar.txt` | Category C (operating days) |
| `calendar_dates.txt` | Category C (holidays, exceptions) |
| `shapes.txt` | Category F (route geometry) |
| `frequencies.txt` | Optional — headway-based service representation |
| `fare_attributes.txt` | Category G (fare data) |
| `fare_rules.txt` | Category G (zone rules) |

**Step 5 — Validate Against GTFS Spec**

The generated feed is run through a validation pass (e.g., MobilityData's `gtfs-validator`) to confirm spec compliance before it is published or imported into the CTM.

---

## 5. Realtime: Three Levels of Truth

Official GTFS-Realtime is not universally available, and where it exists (e.g., Delhi Metro), the quality may be insufficient for reliable passenger features. TransitOS defines three levels of realtime data.

```
┌─────────────────────────────────────────────────────────┐
│                  Realtime Feed Levels                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1 — Official                                     │
│  ─────────────────                                      │
│  Source: Operator GTFS-Realtime                         │
│  Label:  "Official"                                     │
│  Confidence: 99%+                                       │
│  Used when: Feed exists AND quality is verified         │
│                                                         │
│  Level 2 — Enhanced Official                            │
│  ──────────────────────────                             │
│  Source: Official feed + TransitOS validation/filter    │
│  Label:  "Enhanced"                                     │
│  Confidence: 85–99% (depends on official feed quality)  │
│  Used when: Official feed exists but is noisy/stale     │
│  Example: Delhi Metro publishes positions; TransitOS    │
│           filters DTC bus false-positives and applies   │
│           Haversine distance validation                 │
│                                                         │
│  Level 3 — Estimated                                    │
│  ──────────────────                                     │
│  Source: TDSE Schedule + State Estimation Engine        │
│  Label:  "TransitOS Estimated"                          │
│  Confidence: 60–90% (depends on historical data depth)  │
│  Used when: No official realtime exists                 │
│  Example: Mumbai Metro, Pune Metro, Nagpur Metro        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

> **Critical Principle**: TransitOS never presents an estimated feed as official. Every response object includes `source` and `confidence` metadata. The passenger app surface clearly distinguishes "Live" from "Estimated".

### GTFS-Realtime Output Schema

All realtime outputs from TransitOS include provenance metadata:

```json
{
  "system": "MMRDA",
  "line": "Aqua",
  "source": "estimated",
  "sourceLevel": 3,
  "confidence": 0.82,
  "generatedAt": "2026-08-01T09:00:00Z",
  "vehicle": {
    "tripId": "mmrda-aq-0830-dn",
    "estimatedPosition": {
      "latitude": 19.1234,
      "longitude": 72.8765
    },
    "currentStopSequence": 7,
    "currentStatus": "IN_TRANSIT_TO"
  }
}
```

```json
{
  "system": "DMRC",
  "line": "Yellow",
  "source": "official",
  "sourceLevel": 1,
  "confidence": 0.99,
  "generatedAt": "2026-08-01T09:00:05Z",
  "vehicle": { ... }
}
```

---

## 6. State Estimation Engine

The **State Estimation Engine (SEE)** sits between the Journey Engine and the Prediction Engine. It is responsible for maintaining a probabilistic model of where every train currently is, even in the absence of live GPS or operator feeds.

### Position in the Architecture

```
  TDSE (Schedule)
       │
       ▼
  Journey Engine
       │
       ▼
  State Estimation Engine  ◄──── Category I (Live Observations)
       │                   ◄──── Category H (Historical baselines)
       │                   ◄──── Category C (Operating rules)
       ▼
  Prediction Engine
       │
       ▼
  Estimated GTFS-Realtime
```

### SEE Responsibilities

| Function | Description |
|:---|:---|
| **Position Inference** | Infer which section a train is currently traversing based on scheduled time + learned dwell/run times |
| **Delay Estimation** | Estimate current delay from historical delay distributions |
| **Dwell Time Inference** | Apply learned dwell distributions to refine position estimates |
| **Missed Departure Detection** | Detect when a departure is likely cancelled based on time elapsed |
| **Observation Fusion** | Merge crowdsourced reports, GPS traces, or official positions when available |
| **Confidence Computation** | Calculate confidence score for each estimated position |

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
  lastObservation: string | null; // ISO timestamp of last known fix
  observationSource: string | null; // e.g. 'gtfs-rt', 'crowdsource', 'schedule'
}
```

---

## 7. Data Provenance & Confidence Scoring

Every synthesized field in the CTM and every generated GTFS value carries a provenance record.

### Provenance Schema

```typescript
interface ProvenanceRecord {
  field: string;          // e.g. "travelTime", "firstTrain", "stationLat"
  value: unknown;
  source: string;         // Category label + document identifier
  category: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'X';
  method: 'official' | 'extracted' | 'modeled' | 'learned' | 'estimated';
  confidence: number;     // 0.0–1.0
  lastValidated: string;  // ISO date
  version: string;        // e.g. "2026.3"
  notes?: string;
}
```

### Confidence Reference Table

| Data Field | Typical Source | Category | Confidence |
|:---|:---|:---|:---|
| Station coordinates | Official GIS / website | F | 95–100% |
| Station order | DPR | A | 100% |
| Inter-station distance | DPR | A | 100% |
| First/last train | Official website | C | 95–100% |
| Peak headway | Timetable PDF | C | 90–95% |
| Off-peak headway | Timetable PDF | C | 90–95% |
| End-to-end journey time | Operator website | C | 90–95% |
| Design speed | DPR | A | 100% |
| Dwell time (default) | Assumed default | X | 50–70% |
| Dwell time (learned) | Historical observations | H | 75–92% |
| Section speed (modeled) | Physics model | X | 65–80% |
| Section speed (learned) | Historical + GPS traces | H | 80–95% |
| Track geometry | OSM | F | 80–90% |
| Track geometry | Official GIS shapefile | F | 97–100% |
| Rolling stock max speed | Manufacturer spec | D | 99% |
| Fare matrix | Official fare chart | G | 95–100% |
| Train position (official) | GTFS-Realtime | I | 95–99% |
| Train position (estimated) | State Estimation Engine | X | 60–88% |

### How Confidence Flows to the Passenger

The passenger app does not expose raw confidence numbers. Instead, it translates confidence into experience labels:

| Confidence Range | Label Shown to Passenger |
|:---|:---|
| ≥ 95% | Live |
| 80–94% | Approx. |
| 60–79% | Estimated |
| < 60% | Scheduled |

---

## 8. All 20 Indian Metro Systems Strategy & Data Availability

TransitOS's GTFS availability, source mapping, and synthesis strategy across all Indian metro systems:

### Indian Metro & Regional Rail GTFS Availability Matrix

| # | System Name | City / Region | Status | Static GTFS Source | RT Source / Status | TransitOS Strategy | Importer Compatibility |
|:--|:---|:---|:---|:---|:---|:---|:---|
| 1 | **DMRC** | Delhi-NCR | Operational | ✅ Official ([transportstack.delhi.gov.in](https://transportstack.delhi.gov.in)) | ⚠️ OTD API (poor quality) | Import static; Level 2 filtering / SEE | ✅ 100% (In CTM) |
| 2 | **KMRL** | Kochi | Operational | ✅ Official ([kochimetro.org](https://kochimetro.org)) | ⚠️ Partial | Import static; Level 3 SEE | ✅ 100% (In CTM) |
| 3 | **HMRL** | Hyderabad | Operational | ✅ Official ([hmrl.co.in/open-data](https://hmrl.co.in/open-data.html)) | ⚠️ Limited | Import static; Level 3 SEE | ✅ 100% Compatible |
| 4 | **NCRTC RRTS (Namo Bharat)** | Delhi-Ghaziabad-Meerut | Operational (since Oct 2023) | 🔶 Separate Regional Agency | ❌ None | TDSE Synthesis / Regional Transit Adapter | 🔄 Separate System ID |
| 5 | **BMRCL** | Bengaluru | Operational | 🌐 Community ([Vonter/bmrcl-gtfs](https://github.com/Vonter/bmrcl-gtfs)) | ❌ None | Import community GTFS; Level 3 SEE | ✅ 100% Compatible |
| 6 | **CMRL** | Chennai | Operational | 🌐 Community ([ungalsoththu/ChennaiGTFS](https://github.com/ungalsoththu/ChennaiGTFS)) | ❌ None | Import community GTFS (`frequencies.txt`); Level 3 SEE | ✅ 100% Compatible |
| 7 | **GMRC** | Ahmedabad | Operational | 🌐 Community ([notnamansinha/ahmedabad-transit-gtfs-pipeline](https://github.com/notnamansinha/ahmedabad-transit-gtfs-pipeline)) | ❌ None | Import community ETL GTFS; Level 3 SEE | ✅ 100% Compatible |
| 8 | **MMRDA / MMRC** | Mumbai | Operational | ❌ None (OSM geometry available) | ❌ None | TDSE Synthesis from DPR + Timetables | 🔄 Needs TDSE |
| 9 | **MahaMetro** | Pune | Operational | ❌ None (PDF timetables available) | ❌ None | TDSE Synthesis from DPR + Timetables | 🔄 Needs TDSE |
| 10 | **MahaMetro** | Nagpur | Operational | ❌ None (PDF timetables available) | ❌ None | TDSE Synthesis from DPR + Timetables | 🔄 Needs TDSE |
| 11 | **Kolkata Metro** | Kolkata | Operational | ❌ None (OSM geometry available) | ❌ None | TDSE Synthesis from Timetables + OSM | 🔄 Needs TDSE |
| 12 | **UPMRC** | Lucknow | Operational | ❌ None (PDF timetables available) | ❌ None | TDSE Synthesis from DPR + Timetables | 🔄 Needs TDSE |
| 13 | **UPMRC** | Kanpur | Operational | ❌ None | ❌ None | TDSE Synthesis (share UPMRC pipeline) | 🔄 Needs TDSE |
| 14 | **UPMRC** | Agra | Operational | ❌ None | ❌ None | TDSE Pre-synthesis from DPR | 🔄 Needs TDSE |
| 15 | **JMRC** | Jaipur | Operational | ❌ None | ❌ None | TDSE Synthesis from Timetables | 🔄 Needs TDSE |
| 16 | **NMMC / CIDCO** | Navi Mumbai | Operational | ❌ None | ❌ None | TDSE Synthesis from DPR | 🔄 Needs TDSE |
| 17 | **MPRDC** | Indore | Under const. | ❌ None | ❌ None | TDSE Pre-synthesis from DPR | 🔄 Needs TDSE |
| 18 | **SMCL** | Surat | Under const. | ❌ None | ❌ None | TDSE Pre-synthesis from DPR | 🔄 Needs TDSE |
| 19 | **PMDCL** | Patna | Under const. | ❌ None | ❌ None | TDSE Pre-synthesis from DPR | 🔄 Needs TDSE |
| 20 | **BCLL** | Bhopal | Under const. | ❌ None | ❌ None | TDSE Pre-synthesis from DPR | 🔄 Needs TDSE |

> **The Strategic Insight**: Official GTFS is available for 4 systems (Delhi, Kochi, Hyderabad, NCRTC). Community GTFS feeds exist for 3 systems (Bengaluru, Chennai, Ahmedabad). Together, **7 Indian transit systems can be imported immediately into TransitOS without writing any custom parsing code**, because the CTM schema and `IngestionService` fully support standard GTFS archives (including `frequencies.txt`, `shapes.txt`, `calendar_dates.txt`, `trips.txt`, `stop_times.txt`).

### Verification of Existing GTFS Importer Compatibility

The TransitOS `IngestionService` and relational PostgreSQL schema (Prisma) were verified against available GTFS specifications:

1. **Hyderabad Metro (HMRL)**: Official ZIP contains `agency.txt`, `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`. Matches `IngestionService` stage 3–10 directly.
2. **NCRTC Namo Bharat**: Official ZIP on Delhi OTD portal uses exact same schema as Delhi DMRC. Matches `IngestionService` directly.
3. **Bengaluru Metro (Vonter/bmrcl-gtfs)**: Community GTFS contains `agency.txt`, `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `shapes.txt`, `calendar.txt`. Matches `IngestionService` stage 3–10 directly.
4. **Chennai Metro (ungalsoththu/ChennaiGTFS)**: Community GTFS utilizes `frequencies.txt` for headway representation. Matches `IngestionService` stage 11 (`FrequenciesParser` / `FrequenciesNormalizer` / `FrequenciesTransformer`) and `Frequency` Prisma model.
5. **Ahmedabad Metro (notnamansinha pipeline)**: Community ETL outputs standard GTFS files. Matches `IngestionService` directly.

### Priority Onboarding Order

1. **Phase 1 (Immediate - Static in CTM)**: Delhi, Kochi, Hyderabad, NCRTC Namo Bharat
2. **Phase 2 (Immediate - Community GTFS Import)**: Bengaluru, Chennai, Ahmedabad
3. **Phase 3 (TDSE Synthesis)**: Mumbai, Pune, Nagpur, Kolkata, Lucknow, Jaipur, Kanpur
4. **Phase 4 (Pre-opening Synthesis)**: Agra, Navi Mumbai, Indore, Surat, Patna, Bhopal

---

## 9. The Four-Layer Platform Architecture

The TDSE addition expands the TransitOS platform from three layers to four.

```
                         TransitOS Platform

──────────────────────────────────────────────────────────────────
 Layer 0: Transit Knowledge Platform
──────────────────────────────────────────────────────────────────

  Document Repository
  Classification Engine (A–I + X)
  Extraction Pipelines
  Validation
  Transit Data Synthesis Engine (TDSE)
  Data Provenance Framework
  Confidence Scoring Framework
  Knowledge Graph

──────────────────────────────────────────────────────────────────
 Layer 1: Transit Data Platform
──────────────────────────────────────────────────────────────────

  Generated / Imported GTFS Schedule
  Estimated / Official GTFS-Realtime
  Canonical Transit Model (CTM)
  PostgreSQL + PostGIS Spatial Database
  Redis Cache Layer
  REST & WebSocket Public APIs

──────────────────────────────────────────────────────────────────
 Layer 2: Transit Intelligence Platform
──────────────────────────────────────────────────────────────────

  Journey Intelligence Engine
  State Estimation Engine
  Prediction Engine (Delay Propagation)
  Fare Intelligence Engine
  Booking Engine & Provider Adapters
  Payment Intelligence Engine
  Notification Orchestration
  Analytics Engine

──────────────────────────────────────────────────────────────────
 Layer 3: Transit Experience Platform
──────────────────────────────────────────────────────────────────

  Passenger Web / Mobile App
  Operator Analytics Dashboard
  Developer APIs & SDK
  AI / Voice Interface (Intelligence Gateway)
  Smartwatch & Ambient Interface
  Future AR Indoor Navigation
```

### Data Flow Across All Layers

```
External Sources (A–I)
        │
        ▼
  Layer 0: TDSE
  (synthesis + provenance)
        │
        ▼
  Layer 1: CTM + GTFS
  (canonical storage + APIs)
        │
        ▼
  Layer 2: Intelligence
  (routing + prediction + fares)
        │
        ▼
  Layer 3: Experience
  (passenger + operator + developer)
```

---

## 10. TransitOS Design Principles

The following principles govern the TDSE and all data-related decisions across the platform.

### P1 — Synthesis over Dependence

> TransitOS does not depend on official GTFS or official GTFS-Realtime. It consumes them when available, synthesizes them when absent, and clearly identifies the provenance and confidence of every dataset it serves.

### P2 — Provenance is Mandatory

> TransitOS never serves a data point without knowing where it came from, how it was derived, and how confident the system is in its accuracy.

### P3 — Honesty in Labels

> TransitOS never presents synthesized data as official data, and never presents estimated realtime positions as live positions. Every API response and passenger-facing surface carries an accurate label:
> - `"Official"` — from a verified operator source
> - `"Enhanced Official"` — official + TransitOS validation/filtering
> - `"TransitOS Estimated"` — synthesized by TDSE or State Estimation Engine

### P4 — AI Communicates, Engines Compute

> (From the Project Bible) Every core user feature must function deterministically even if all external LLMs disappear tomorrow. AI is a language interface layer only.

### P5 — Category X is a Product, Not a Side Effect

> The synthesized GTFS feeds, CTM records, confidence scores, and provenance graphs generated by TransitOS are first-class intellectual outputs, not intermediate processing artifacts. They may be published as open data.

---

## 11. Relationship to Existing Architecture

### How TDSE Fits into v0.5.1

The current v0.5.1 sprint (Realtime Infrastructure) is broadened by this architecture:

**Before (original scope)**:
```
Delhi GTFS-Realtime integration
```

**After (revised scope)**:
```
Realtime Infrastructure that supports multiple feed levels:
  - Official Feed Adapter (Level 1)
  - Enhanced Official Adapter (Level 2) — with validation/filtering
  - Estimated Feed Adapter (Level 3) — from State Estimation Engine
```

### How TDSE Fits into the Roadmap

| Milestone | TDSE Contribution |
|:---|:---|
| v0.5 ✅ Journey Intelligence | GTFS import pipeline (the first use of synthesized data already works) |
| v0.5.1 Realtime Infrastructure | Multi-level realtime adapters; State Estimation Engine scaffold |
| v0.6 Passenger Experience | Confidence labels surfaced in UI ("Live" / "Estimated") |
| v0.7 Prediction | Prediction Engine reads SEE outputs; historical data feeds back to TDSE |
| **v0.8+** | Dedicated TDSE module; Document ingestion UI; All-metro synthesis |

### The BMRCL Community Project Relationship

The [BMRCL community GTFS](https://github.com/opentransitindia/bengaluru-metro) is a proof of concept that this approach works. The key differences with TransitOS:

| Dimension | BMRCL Community Project | TransitOS TDSE |
|:---|:---|:---|
| Scope | Single city (Bengaluru) | All 20 Indian metros |
| Output | GTFS Schedule only | GTFS Schedule + Estimated GTFS-RT + CTM |
| Confidence tracking | None | Full provenance per field |
| Realtime | No | Estimated realtime via SEE |
| Learning | No | Historical calibration of dwell/speed |
| Validation | Basic | Full spec validation + confidence scoring |

---

## Appendix: GTFS Files Reference

| File | Required | Description | TDSE Generated? |
|:---|:---|:---|:---|
| `agency.txt` | ✅ | Transit operator metadata | ✅ (from Category G) |
| `stops.txt` | ✅ | Station coordinates and names | ✅ (from Category F + A) |
| `routes.txt` | ✅ | Line definitions | ✅ (from Category A) |
| `trips.txt` | ✅ | Individual service trips | ✅ (TDSE generated) |
| `stop_times.txt` | ✅ | Arrival/departure times | ✅ (physics model) |
| `calendar.txt` | ✅ | Service days | ✅ (from Category C) |
| `calendar_dates.txt` | Optional | Holiday exceptions | ✅ (from Category C) |
| `shapes.txt` | Optional | Route geometry polylines | ✅ (from Category F) |
| `frequencies.txt` | Optional | Headway-based schedules | ✅ (preferred for Indian metros) |
| `fare_attributes.txt` | Optional | Fare pricing rules | ✅ (from Category G) |
| `fare_rules.txt` | Optional | Fare zone assignments | ✅ (from Category G) |
| `transfers.txt` | Optional | Interchange rules | ✅ (from Category B) |
| `feed_info.txt` | Recommended | Feed metadata and versioning | ✅ (TransitOS metadata) |

---

*Document version: 2026.08 | TransitOS GTFS Engineering Synthesis*  
*This document is the authoritative reference for the Transit Data Synthesis Engine (TDSE) and all GTFS generation, estimation, and provenance architecture.*
