# Mumbai Metro — A_network Knowledge Category

## Status: PARTIAL (CTM v0.1.0)

This directory contains network topology data for Mumbai Metro — the A-category knowledge for the TDSE pipeline.

## Lines (4 operational + upcoming)

| Line | Name | Operator | Stations | Length | Status | Color |
|------|------|----------|----------|--------|--------|-------|
| Line 1 | Versova–Andheri–Ghatkopar | MMOPL | 12 | 11.4 km | **Operational (2014)** | Blue `#0066CC` |
| Line 2A | Dahisar East–D.N. Nagar | MMMOCL | 17 | 18.6 km | **Operational (2022)** | Yellow `#FFCC00` |
| Line 7 | Dahisar East–Andheri East | MMMOCL | 13 | 16.5 km | **Operational (2022)** | Red `#CC0000` |
| Line 3 (Aqua) | Aarey–BKC (Phase 1) | MMRC | 10 | 12.69 km | **Operational (2024)** | Aqua `#00CCCC` |
| Line 3 (Aqua) | BKC–Cuffe Parade (Phase 2) | MMRC | 17 | 20.8 km | Under construction | Aqua `#00CCCC` |
| Line 4 | Wadala–Kasarvadavali | MMRDA | — | 32.3 km | Under construction | — |

## CTM Coverage Status

| Category | Status | Confidence | Notes |
|----------|--------|------------|-------|
| Line 1 stops (all 12) | ✅ Complete | 0.92 | OSM + MMOPL official |
| Line 2A stops (all 17) | ⚠️ Partial | 0.80 | Only 4 modelled in CTM v0.1.0 — backlog |
| Line 7 stops (all 13) | ⚠️ Partial | 0.80 | Only 2 modelled — backlog |
| Line 3 Phase 1 stops | ⚠️ Partial | 0.85 | 3 of 10 modelled — backlog |
| Interchanges | ✅ 3 modelled | 0.75 | D.N. Nagar, Dahisar, Andheri |
| Stop sequences | ⚠️ Partial | 0.85 | Only outbound direction, terminal-to-terminal |

## Backlog Items (A_network)

- [ ] Complete all 17 Line 2A stations in CTM
- [ ] Complete all 13 Line 7 stations in CTM
- [ ] Complete all 10 Line 3 Phase 1 stations
- [ ] Add return direction sequences (direction: 1)
- [ ] Verify interchange platform-level distances
- [ ] Add Line 4 (under construction) as `PLANNED` status

## Sources

| Source | Tier | What it covers |
|--------|------|----------------|
| MMOPL official website | Tier B | Line 1 stations, fares |
| MMMOCL official website | Tier B | Lines 2A, 7 stations, fares |
| MMRC official website | Tier B | Line 3 stations, alignment |
| MMRDA official website | Tier B | Lines 4, 5, 6, 9 (planned) |
| OpenStreetMap relations | Tier D | All coordinates |
| OSM Relation IDs to verify: Line 1 = 7076048, Line 2A = ~, Line 3 = ~ | | |

## OSM Resources

```
https://www.openstreetmap.org/relation/7076048  ← Line 1 (verify before use)
https://overpass-api.de/api/interpreter?data=[out:json];relation["name"~"Mumbai Metro"];out%20body;
```
