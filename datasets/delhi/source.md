# Delhi Metro GTFS Static — Acquisition Notes

## Dataset
- **Operator:** Delhi Metro Rail Corporation (DMRC)
- **Format:** GTFS Static
- **Trust Tier:** A (Official Government)
- **Last Verified:** 2026-07-15

---

## Primary Source

**Delhi Transport Stack**
URL: https://transportstack.delhi.gov.in

### Navigation Steps (as of 2026-07-15)
1. Visit https://transportstack.delhi.gov.in
2. Navigate to "Data & Services" section
3. Search for "Delhi Metro Rail Corporation (DMRC)" or "DMRC Static Transit Data"
4. Download the GTFS Static ZIP file
5. Note the "Last Updated" date shown on the portal page
6. The ZIP will include a bundled `LicenceAgreement1.0.pdf` — review it

### Legacy / Backup Source
**OTD Portal:** https://otd.delhi.gov.in
- Navigate to "Static Data" section
- Same dataset, older portal URL — still operational as of research date

---

## After Downloading

1. Compute SHA-256 checksum:
   ```bash
   sha256sum datasets/delhi/raw/gtfs-static.zip
   ```
2. Update `metadata.json` with:
   - `lastDownloaded` (today's date)
   - `feedVersion` (from `feed_info.txt` inside the ZIP)
   - `sha256` (computed checksum)
3. Run validation:
   ```bash
   npx ts-node tools/validate-dataset.ts --city=delhi
   ```
4. Import into MetroRadar:
   ```bash
   curl -X POST "http://localhost:3001/ingestion/gtfs?systemId=<uuid>" \
     -F "file=@datasets/delhi/raw/gtfs-static.zip"
   ```

---

## Known Caveats

- The primary portal migrated from `otd.delhi.gov.in` to `transportstack.delhi.gov.in` — both are active but Transport Stack is the current authoritative source
- Update frequency is periodic, not daily — always check the "Last Updated" timestamp on the portal
- Schedule data is approximate (planned timetables, not real-time precision)
- GTFS-RT (realtime) requires separate developer registration — see `realtime.md`

---

## GTFS-RT Access

Delhi OTD provides GTFS Realtime feeds (Vehicle Positions, Trip Updates, Service Alerts) behind an API key. See `realtime.md` for registration steps and API documentation.
