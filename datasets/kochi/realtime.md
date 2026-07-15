# Kochi Metro GTFS Realtime

## Status

> **No official GTFS-RT feed available from KMRL as of 2026-07-15.**
> Connector: N/A for Kochi until an official RT feed is published.

---

## Current Situation

KMRL (Kochi Metro Rail Limited) publishes a GTFS Static feed but does **not** currently offer a publicly accessible GTFS Realtime feed.

Options for realtime data if needed in the future:
1. **Monitor KMRL Open Data portal** — https://kochimetro.org/open-data/ — for future RT announcements
2. **Check MobilityDatabase** — https://mobilitydatabase.org — for any community-contributed RT feeds
3. **KMRL app API** — The official KMRL app may use a proprietary API; this would require reverse engineering (not recommended for production use)

---

## Sprint 6 Note

If KMRL publishes a GTFS-RT feed before Sprint 6, update this file with:
- Base URL
- Authentication method
- Available feeds (Vehicle Positions, Trip Updates, Service Alerts)
- Rate limits

Follow the same integration pattern as Delhi GTFS-RT.
