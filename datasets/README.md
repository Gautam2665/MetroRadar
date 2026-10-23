# TransitOS — Transit Datasets

This directory contains real operator datasets used for development, certification, and production analysis.

> **Note:** This is not sample or synthetic data. Synthetic datasets for unit tests live in `apps/backend/src/__fixtures__/`.

---

## Data Source Trust Tiers

Every dataset is classified by source reliability. The trust tier determines the confidence range assigned to derived CTM fields.

| Tier | Source Type | Confidence | Examples |
|:---|:---|:---|:---|
| **A — Official government GTFS** | Machine-readable feeds from official operator portals | 95–100% | Delhi DMRC (transportstack.delhi.gov.in), Kochi KMRL |
| **B — Operator documents** | Official PDFs, annual reports, operator websites | 85–95% | MMRDA DPRs, BMRCL timetable PDFs |
| **C — OpenStreetMap** | Community-maintained GIS data | 80–90% | Station coordinates, entrance positions, route geometry |
| **D — Community GTFS** | Verified community-maintained GTFS feeds | 80–90% | BMRCL (Vonter/bmrcl-gtfs), CMRL (ChennaiGTFS) |
| **E — Modeled / estimated** | Physics model outputs, TDSE synthesis | 50–80% | Synthesized stop times, estimated dwell times |

> Do not use Wikipedia for station coordinates. Wikipedia coordinates are unreliable and must always be cross-validated against Tier A or C sources before use in the CTM.

---

## Directory Structure

Each city follows a standard layout:

```
datasets/{city}/
  raw/               Original unmodified downloads (large files gitignored)
  processed/         Validation reports and comparison outputs
  metadata.json      Machine-readable provenance record
  source.md          Human-readable acquisition instructions with exact steps
  license.json       License reference (not the full license text)
  realtime.md        GTFS-RT API documentation for this operator (if available)
```

---

## Dataset Registry

| City | Operator | Format | Trust Tier | Status |
|:---|:---|:---|:---|:---|
| Delhi | DMRC | GTFS Static | A — Official | Active |
| Kochi | KMRL | GTFS Static | A — Official | Active |
| Hyderabad | HMRL | GTFS Static | A — Official | Active |
| Bengaluru | BMRCL | Community GTFS | D — Community | Active |
| Chennai | CMRL | Community GTFS (`frequencies.txt`) | D — Community | Active |
| Ahmedabad | GMRC | Community GTFS (ETL pipeline) | D — Community | Active |
| Mumbai | MMRDA / MMRC / MMMOCL | TDSE Synthesis | B/E | Research pending |

See `datasets/catalog.json` for the full machine-readable registry with checksums, versions, and import session IDs.

---

## Adding a New City Dataset

1. Create the directory: `datasets/{city}/`
2. Create `raw/` and `processed/` subdirectories
3. Write `source.md` with exact acquisition steps (navigation path, date, URL, notes)
4. Create `metadata.json` using the template from an existing city — include checksum, source URL, download date, and trust tier
5. Create `license.json` with a reference to the data license — do not copy full license text unless explicitly required
6. Run the validation CLI: `npx ts-node tools/validate-dataset.ts --city={city}`
7. If validation passes, add the dataset to `datasets/catalog.json`
8. Import into CTM: `POST /ingestion/gtfs?systemId=<uuid>&dryRun=true` first, then without `dryRun`

---

## Dataset Certification Reports

Individual audit reports for each certified network are in `datasets/reports/`:

- `datasets/reports/INDIA_TRANSIT_STATUS.md` — National Transit Status Dashboard
- `datasets/reports/CERTIFICATION_DMRC.md` — Delhi Metro certification
- `datasets/reports/CERTIFICATION_KMRL.md` — Kochi Metro certification
- `datasets/reports/CERTIFICATION_HMRL.md` — Hyderabad Metro certification
- `datasets/reports/CERTIFICATION_BMRCL.md` — Bengaluru Metro certification
- `datasets/reports/CERTIFICATION_CMRL.md` — Chennai Metro certification
- `datasets/reports/CERTIFICATION_GMRC.md` — Ahmedabad Metro certification

Each report records: quality score (5-dimension, 100-point scale), trust tier, import session ID, field-level confidence scores, and known limitations.

---

## Raw Files Are Gitignored

Large GTFS ZIP archives (10–50 MB) are not committed to git. Use `source.md` in each city directory for exact download instructions. After downloading, run the validator to verify the checksum matches `metadata.json`:

```bash
npx ts-node tools/validate-dataset.ts --city=delhi
```
