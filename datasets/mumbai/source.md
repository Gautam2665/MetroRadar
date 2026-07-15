# Mumbai Metro Dataset — Acquisition Strategy

## Status: RESEARCH_PENDING (Deferred to Sprint 4+)

> **No official GTFS exists** from any Mumbai Metro operator.
> This dataset must be manually curated. The strategy is documented here.

---

## Why Mumbai Is Different

Mumbai Metro has **four distinct operating entities** with no unified data source:

| Operator | Lines | Website |
|---------|-------|---------|
| MMOPL (Mumbai Metro One Pvt. Ltd.) | Line 1 (Versova–Andheri–Ghatkopar) | — |
| MMMOCL (Maharashtra Metro Rail Corp) | Lines 2A & 7 | https://www.mmmocl.co.in |
| MMRC (Mumbai Metro Rail Corp Ltd) | Line 3 / Aqua Line | https://mmrcl.com |
| MMRDA (Mumbai Metropolitan Region DA) | Lines 4, 5, 6, 9, 12+ (planned) | https://mmrda.maharashtra.gov.in |

This fragmentation makes a unified GTFS impossible from a single source. MetroRadar must build it.

---

## Curated Build Strategy

### Step 1 — Station List + Codes
- Source each operator's official station list from their website
- Cross-reference with official route maps (PDF)
- Assign MetroRadar station codes (format: `MUM_<LINE>_<STATION>`)

### Step 2 — Coordinates
- **Primary:** OpenStreetMap — Mumbai Metro relations are well-mapped (ODbL)
  - OSM Relation IDs to verify before use
- **Validation:** Cross-check against Google Maps satellite imagery
- **Fallback:** Official operator PDFs if OSM is incomplete

### Step 3 — Routes / Lines
- Route numbers and colors from official route maps
- Colors verified against operator branding guidelines

### Step 4 — Timetables / Stop Times
- Source from operator websites and app-based timetables
- Frequency-based service (headway) where exact times unavailable
- Mark as `FREQUENCY_BASED` in CTM metadata

### Step 5 — Build GTFS Files
- Manually construct `agency.txt`, `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`
- Use `feed_info.txt` to document MetroRadar as the feed publisher

---

## License Strategy

- OSM-derived coordinates → **ODbL (Open Database License)**
- Official PDF-derived content → Review each operator's terms
- MetroRadar-compiled GTFS → Attribute all sources in `feed_info.txt`

---

## OSM Resources

- Search https://www.openstreetmap.org for "Mumbai Metro" relations
- Verify each line's relation ID before extracting coordinates
- Use Overpass API or JOSM for bulk extraction

---

## Monitoring

Watch for future GTFS publication announcements:
- MMRDA tenders/notices: https://mmrda.maharashtra.gov.in
- MMMOCL updates: https://www.mmmocl.co.in
- data.gov.in: https://data.gov.in (search "Mumbai Metro")
