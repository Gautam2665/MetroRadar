# Transit Data Synthesis Engine (TDSE)

> **Sprint v0.6.5** — National Metro Data Expansion & GTFS Synthesis

The TDSE is MetroRadar's internal pipeline for acquiring, normalizing, synthesizing, validating, and publishing transit data for systems that lack official GTFS feeds.

---

## Architecture

```
Official Sources (PDFs, APIs, OSM)
        │
        ▼
┌─────────────────────┐
│   Acquisition Layer │  → tdse/acquisition/
│   (source-aware)    │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Extraction Layer   │  → tdse/extraction/
│  (PDF, HTML, OSM)   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Normalization Layer│  → tdse/normalization/
│  (→ CTM structs)    │
└─────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│          Canonical Transit Model (CTM)              │  → tdse/ctm/
│  The single internal source of truth.               │
│  NOT GTFS. GTFS is derived FROM CTM.               │
└─────────────────────────────────────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ GTFS Export  │ │  Topology    │ │  Schedule Engine │
│ tdse/gtfs-   │ │  tdse/       │ │  tdse/schedule/  │
│ export/      │ │  topology/   │ │                  │
└──────────────┘ └──────────────┘ └──────────────────┘
        │
        ▼
┌─────────────────────┐
│  Validation Layer   │  → tdse/validation/
│  (schema + topology │
│   + plausibility)   │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Provenance Layer   │  → tdse/provenance/
│  (audit trail,      │
│   confidence scores)│
└─────────────────────┘
        │
        ▼
  Journey Engine / Map / Digital Twin
```

---

## Golden Rule

> **The CTM is the source of truth. GTFS is the export format.**
>
> If you need to change a stop name, change it in the CTM — not in `stops.txt`.
> GTFS is generated from CTM on every export run.

---

## Knowledge Categories (A–I + X)

Every piece of data belongs to a knowledge category. This determines its acquisition path, confidence level, and provenance record.

| Category | Name | Description |
|----------|------|-------------|
| **A** | Network Topology | Lines, sequences, interchanges, topology graph |
| **B** | Station Infrastructure | Station names, codes, platforms, entrances |
| **C** | Operations | Timetables, headways, service patterns, calendar |
| **D** | Rolling Stock | Train types, consist lengths, doors |
| **E** | Signalling | Block types, cab signalling, ATP/ATO |
| **F** | GIS & Spatial | Shapes, coordinates, elevation, indoor maps |
| **G** | Commercial & Passenger | Fares, smart card, accessibility, retail |
| **H** | Historical Operations | Commissioning dates, phase history |
| **I** | Live Observations | Pi sensor data, crowd reports, real-time inputs |
| **X** | Synthesized/Derived | TransitOS-generated values (X1–X10), with confidence scores |

---

## Source Tiers

| Tier | Description | Trust |
|------|-------------|-------|
| **Tier A** | Official GTFS from operator | Highest — certified |
| **Tier B** | Official timetable PDF / operator data | High — validated |
| **Tier C** | Government datasets / IUDX / open data | Medium — cross-checked |
| **Tier D** | OSM / community datasets | Medium — peer-reviewed |
| **Tier E** | Manual reconstruction / estimation | Low — flagged + audited |

> Never silently combine tiers. Every field carries its source tier.

---

## City Rollout Waves

| Wave | Cities | Strategy |
|------|--------|----------|
| 1 | **Mumbai** | Full TDSE demonstration — flagship synthesis |
| 2 | Pune, Nagpur | MahaMetro systems — leverage Mumbai learnings |
| 3 | Hyderabad, Chennai, Bengaluru, Ahmedabad | Audit official GTFS first; synthesize gaps only |

---

## Directory Structure

```
tdse/
├── README.md                  ← this file
├── ctm/
│   ├── schema.ts              ← CTM TypeScript interfaces (source of truth for all types)
│   └── index.ts               ← CTM loader / registry
├── acquisition/
│   ├── index.ts               ← Acquisition orchestrator
│   └── sources/               ← Source-specific adapters
├── extraction/
│   ├── osm.ts                 ← OSM Overpass API extractor
│   ├── pdf.ts                 ← PDF text extractor (tabular data)
│   └── gtfs.ts                ← GTFS zip extractor
├── normalization/
│   ├── index.ts               ← Normalization pipeline
│   └── validators.ts          ← Input validators
├── topology/
│   ├── graph.ts               ← Graph construction from CTM
│   └── interchange.ts         ← Interchange detection
├── schedule/
│   ├── headway.ts             ← Headway-to-stop-times converter
│   └── calendar.ts            ← Calendar & service patterns
├── geometry/
│   ├── shapes.ts              ← Shape interpolation from coordinates
│   └── bbox.ts                ← Bounding box utilities
├── gtfs-export/
│   ├── index.ts               ← GTFS export orchestrator
│   ├── agency.ts              ← agency.txt generator
│   ├── routes.ts              ← routes.txt generator
│   ├── stops.ts               ← stops.txt generator
│   ├── trips.ts               ← trips.txt generator
│   ├── stop_times.ts          ← stop_times.txt generator
│   ├── calendar.ts            ← calendar.txt + calendar_dates.txt generator
│   ├── shapes.ts              ← shapes.txt generator
│   ├── transfers.ts           ← transfers.txt generator
│   └── feed_info.ts           ← feed_info.txt generator
├── validation/
│   ├── index.ts               ← Validation orchestrator
│   ├── schema.ts              ← GTFS schema validation
│   ├── referential.ts         ← Referential integrity checks
│   ├── geography.ts           ← Geographic plausibility
│   ├── schedule.ts            ← Schedule plausibility
│   └── topology.ts            ← Network topology validation
└── provenance/
    ├── index.ts               ← Provenance recorder
    └── audit-trail.ts         ← Audit trail writer
```
