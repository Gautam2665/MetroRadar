## Description

_What does this PR add, fix, or change? Link to the relevant issue(s)._

Closes #

## Type of Change

- [ ] Bug fix (incorrect routing output, data error, API mismatch)
- [ ] Analytical improvement (scoring model, friction model, catchment logic)
- [ ] New data (GTFS import, TDSE synthesis, calibration data)
- [ ] New feature or capability (new engine, new endpoint, new analysis method)
- [ ] Refactor (no functional change)
- [ ] Documentation update
- [ ] Test addition

## Affected Components

- [ ] Journey routing engine (`modules/journey/`)
- [ ] GIS / spatial layer (`modules/gis/`)
- [ ] GTFS ingestion pipeline (`modules/ingestion/`)
- [ ] Realtime telemetry (`modules/realtime/`)
- [ ] Frontend (map, journey planner, inspector)
- [ ] Database schema (`prisma/schema.prisma`)
- [ ] Documentation (`.md` files)
- [ ] Tests (`*.spec.ts`)

## Testing

- [ ] 63 existing tests pass (`npm run test --workspace=apps/backend`)
- [ ] New tests added for changed logic
- [ ] Manually verified against live API or local environment

## Transport Engineering Validation

_For changes to routing, scoring, friction, or catchment logic: describe how you verified the output is analytically correct. Include example origin/destination pairs, expected vs actual candidates, and any parameter sensitivity checks._

## Notes for Reviewer

_Any edge cases, known limitations, or design decisions that need discussion._
