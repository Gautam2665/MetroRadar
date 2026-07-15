# Kochi Metro GTFS Static — Acquisition Notes

## Dataset
- **Operator:** Kochi Metro Rail Limited (KMRL)
- **Format:** GTFS Static
- **Trust Tier:** A (Official — first Indian metro to publish GTFS, ~2018)
- **Last Verified:** 2026-07-15

---

## Primary Source

**KMRL Official Open Data Portal**
URL: https://kochimetro.org

### Navigation Steps (as of 2026-07-15)
1. Visit https://kochimetro.org
2. Navigate to the "Open Data" section (check the footer or main menu)
3. Download `KMRL-Open-Data.zip` (or the current named file)
4. Note the version/date shown on the page

### Backup Source
**MobilityDatabase:** https://mobilitydatabase.org
- Search "Kochi Metro" or "KMRL"
- Use the latest listed feed version URL
- MobilityDatabase is the global canonical GTFS catalog (replaced TransitFeeds.com)

---

## After Downloading

1. Compute SHA-256 checksum:
   ```bash
   sha256sum datasets/kochi/raw/gtfs-static.zip
   ```
2. Update `metadata.json` with:
   - `lastDownloaded` (today's date)
   - `feedVersion` (from `feed_info.txt` if present, or portal page)
   - `sha256` (computed checksum)
3. Run validation:
   ```bash
   npx ts-node tools/validate-dataset.ts --city=kochi
   ```
4. Import into MetroRadar:
   ```bash
   curl -X POST "http://localhost:3001/ingestion/gtfs?systemId=<uuid>" \
     -F "file=@datasets/kochi/raw/gtfs-static.zip"
   ```

---

## Feed Contents

KMRL's GTFS notably includes **fare data** — a highlight that most Indian metro GTFS feeds lack:
- `agency.txt`
- `stops.txt`
- `routes.txt`
- `trips.txt`
- `stop_times.txt`
- `fare_attributes.txt` ← fare zones and prices
- `fare_rules.txt` ← fare zone assignments

---

## Network Coverage

- **Blue Line:** Aluva ↔ Thrippunithura (core corridor)
- **Extensions:** Kakkanad branch, SN Junction — verify if included in current feed version

---

## Known Caveats

- Direct download URL structure has changed over time — always navigate the portal rather than using a hardcoded URL
- Extensions may not yet be in the published feed (new stations take time to appear)
- No GTFS-RT (realtime) feed published by KMRL as of 2026-07-15

---

## GTFS-RT

No realtime feed available. See `realtime.md` for details.
