# MetroRadar Datasets

This directory contains **real operator datasets** used for development and demonstrations.

> **Not sample data.** Sample data (tiny synthetic datasets for CI/unit tests) lives in `sample-data/`.

---

## Trust Tier Reference

| Tier | Source Type | Trust | Examples |
|------|------------|-------|---------|
| **A** | Official Government GTFS | ⭐⭐⭐⭐⭐ | Delhi OTD, Kochi KMRL |
| **B** | Operator PDFs, annual reports, official websites | ⭐⭐⭐⭐☆ | MMRDA PDFs, BMRCL maps |
| **C** | OpenStreetMap | ⭐⭐⭐⭐☆ | Coordinates, entrances, lifts |
| **D** | Wikipedia | ⭐⭐⭐☆☆ | Opening dates, station names **only** |
| **E** | Manual / estimated | ⭐⭐☆☆☆ | Absolute last resort |

> ⚠️ **Never use Wikipedia for geometry.** Coordinates from Wikipedia are unreliable and must always be cross-validated against Tier A or C sources.

---

## Directory Structure

Each city follows this layout:

```
datasets/{city}/
  raw/                  ← Original unmodified downloads (gitignored if >5MB)
  processed/            ← Validation reports, comparison outputs
  metadata.json         ← Machine-readable provenance record
  source.md             ← Human-readable acquisition instructions
  license.json          ← License reference (NOT the full license text)
  realtime.md           ← GTFS-RT API documentation (Sprint 6 reference)
```

---

## Adding a New City Dataset

1. Create the directory: `datasets/{city}/`
2. Create `raw/` and `processed/` subdirectories
3. Fill in `metadata.json` using the template from any existing city
4. Write `source.md` with the exact steps taken to acquire the data (navigation path, date, notes)
5. Fill `license.json` with a **reference** to the license — do not copy full license text unless you have a specific reason and the license permits it
6. Run validation: `npx ts-node tools/validate-dataset.ts --city={city}`
7. Add the dataset to `datasets/catalog.json`

---

## Dataset Status

| City | Operator | Format | Status |
|------|---------|--------|--------|
| Delhi | DMRC | GTFS Static (Tier A) | ACTIVE |
| Kochi | KMRL | GTFS Static (Tier A) | ACTIVE |
| Mumbai | MMRDA/MMMOCL/MMRC | Curated (Tier B) | RESEARCH_PENDING |
| Bangalore | BMRCL | GTFS Static via IUDX (Tier B) | RESEARCH_PENDING |

See `catalog.json` for full machine-readable registry.

---

## Raw Files Are Gitignored

Large GTFS ZIPs (10–50MB) are not committed to git. Use `source.md` in each city directory for exact download instructions. After downloading, run the validator to verify the checksum matches `metadata.json`.

```bash
npx ts-node tools/validate-dataset.ts --city=delhi
```
