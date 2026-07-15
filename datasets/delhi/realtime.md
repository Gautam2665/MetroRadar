# Delhi Metro GTFS Realtime

## Status

> **API key: NOT YET APPLIED FOR**
> Connector: Deferred to Sprint 6

Apply at https://otd.delhi.gov.in before Sprint 6 begins (approval can take several days).

---

## Registration

1. Visit https://otd.delhi.gov.in
2. Click "Register as Developer"
3. Fill in application details
4. API key delivered via email after approval
5. Update this file with key details (not the key itself — store in `.env`)

---

## API Details

| Field | Value |
|-------|-------|
| Base URL | `https://otd.delhi.gov.in/api/realtime/` |
| Authentication | `x-api-key` header |
| Format | Protocol Buffers (GTFS-RT) |
| Registration URL | https://otd.delhi.gov.in |

---

## Available Feeds

| Feed | Endpoint | Description |
|------|----------|-------------|
| Vehicle Positions | `/VehiclePositions.pb` | Real-time location of trains |
| Trip Updates | `/TripUpdates.pb` | Delays, cancellations, predictions |
| Service Alerts | `/ServiceAlerts.pb` | Disruptions, elevator outages |

---

## Rate Limits & Quota

| Field | Value |
|-------|-------|
| Minimum polling interval | 10 seconds |
| Daily quota | TBD — update after registration |

---

## Implementation Notes (Sprint 6)

- Parse feeds using `gtfs-realtime-bindings` npm package
- Cache each feed in Redis with TTL matching the polling interval
- On change, broadcast delta via WebSocket to subscribed frontend clients
- **Never write realtime data to PostgreSQL** — it is an in-memory overlay only
- Feed data expires naturally when TTL elapses (no manual cleanup)

---

## .env Keys Required (Sprint 6)

```
DELHI_GTFS_RT_API_KEY=<obtained after registration>
DELHI_GTFS_RT_BASE_URL=https://otd.delhi.gov.in/api/realtime/
DELHI_GTFS_RT_POLL_INTERVAL_MS=10000
```
