# Bangalore / Namma Metro GTFS Static — Acquisition Notes

## Status: RESEARCH_PENDING (Deferred — IUDX registration required)

---

## Data Source

**India Urban Data Exchange (IUDX)**
URL: https://iudx.org.in

BMRCL publishes its GTFS Static data via the IUDX platform — a government-backed urban data exchange hub. Unlike Delhi OTD and Kochi KMRL, this is **not a simple public download** — it requires developer registration.

Data quality is high: used by Namma Yatri and Tummoc apps commercially.

---

## Acquisition Steps (when ready)

1. Visit https://iudx.org.in
2. Register as a developer (fill in project/organization details)
3. Search the catalog for "BMRCL" or "Namma Metro" or "Bengaluru Metro"
4. Request access to the GTFS Static dataset
5. After approval, download the feed (API or direct ZIP)
6. Compute SHA-256 checksum
7. Update `metadata.json` and run:
   ```bash
   npx ts-node tools/validate-dataset.ts --city=bangalore
   ```

---

## Network Coverage (expected)

- **Purple Line:** Baiyappanahalli ↔ Mysuru Road
- **Green Line:** Nagasandra ↔ Silk Institute
- **Extensions:** RV Road–Bommasandra, other Phase 2+ lines

---

## Alternative Sources (not recommended for production)

- Unofficial datasets on Kaggle and GitHub exist but may be stale
- Always cross-validate unofficial sources against IUDX data

---

## GTFS-RT

GTFS Realtime availability via IUDX is unclear as of 2026-07-15. Check IUDX catalog after registration.

---

## Monitoring

- IUDX catalog: https://iudx.org.in
- BMRCL official site: https://bmrcl.co.in
- data.gov.in: https://data.gov.in (search "BMRCL")
