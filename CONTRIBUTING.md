# Contributing to TransitOS 🚇📡

Thank you for your interest in contributing to **TransitOS (Project MetroRadar)**! 

TransitOS is an open-source transit data infrastructure and mobility intelligence platform. We welcome contributions from software engineers, GIS analysts, transport planners, academic researchers, and transit enthusiasts.

---

## Ways to Contribute

There are several ways you can contribute to the project:

### 1. Transit Data & Ground-Truthing
Accurate, verified spatial data is the backbone of TransitOS. You can help by:
* **Surveying Station Entrances**: Verifying exact gate coordinates, official gate numbers (e.g. A1, B2), and street names.
* **Accessibility Audits**: Ground-truthing whether specific station gates have operational street-to-concourse elevators, escalators, or tactile paving.
* **Foot Overbridges (FOBs) & Pedestrian Connections**: Mapping transfer walkways connecting metro stations to suburban railway platforms and bus terminals.
* **Timetable Verification**: Reporting discrepancy in service windows, first/last train timings, or holiday schedules.

### 2. Software Development
* **Backend (NestJS / TypeScript)**: Developing new API endpoints, spatial PostGIS queries, routing algorithm optimizations, and data sync workers.
* **Frontend (Next.js / MapLibre GL)**: Enhancing the commuter UI, improving station digital twin rendering, optimizing map tile rendering, and mobile responsiveness.
* **Data Pipelines & GTFS Tools**: Creating automated ingestion scripts for new cities (e.g., Pune, Nagpur), feed validation hooks, or OSM pedestrian network processors.

### 3. Academic Research & Mobility Intelligence
* Submitting research notebooks evaluating station accessibility, transfer friction, or origin-destination flows.
* Benchmarking pathfinding algorithms (Yen's KSP, multi-criteria Pareto filters, contraction hierarchies).
* Developing new spatial analytics tools (e.g., automated sidewalk impedance scoring).

---

## Data Standards & Validation Rules

To protect the integrity of our canonical datasets, all contributions modifying transit data must adhere to strict quality rules:

1. **Zero Unreachable Locations**:
   Any modification to `stops.txt` or `pathways.txt` must ensure all platforms and concourses maintain continuous directed pathways to/from street entrances.
2. **Referential Integrity**:
   No orphan stops or dangling pathways are permitted. Run the verification script before submitting:
   ```bash
   node scripts/export_synchronized_gtfs.js
   ```
3. **Coordinate Precision & Sidewalk Snapping**:
   Station gates must be placed at the physical street threshold and snapped to walkable sidewalks (within 30 meters of a surveyed pedestrian edge). Do not snap gates onto building rooftops or un-walkable highway medians.
4. **Data Provenance & Licensing**:
   Any external dataset must clearly document its source organization, document URL, license (must be compatible with MIT / ODbL), and verification methodology.

---

## Development Setup

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/MetroRadar.git
cd MetroRadar
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
Ensure your local PostgreSQL/PostGIS database or Docker container is running (`docker-compose up -d`).

### 3. Run Migrations & Ingestion
```bash
npm run db:migrate --workspace=apps/backend
npm run db:generate --workspace=apps/backend
```

### 4. Run Tests & Validation
```bash
npm test
node scripts/export_synchronized_gtfs.js
```

---

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names:
   * `feat/gate-survey-line2a`
   * `fix/pathway-connectivity`
   * `docs/api-guide-update`
   * `perf/routing-multigraph`
2. **Commit Messages**: Write clear, imperative commit messages (e.g., `feat(gtfs): add verified elevator pathways for Gundavali Gate 1`).
3. **Automated Checks**: Ensure your PR passes all existing unit tests and referential validation scripts.
4. **Documentation**: Update relevant markdown documentation in `docs/` or the root README when adding new features or modifying data schemas.

---

## Community & Academic Inquiries

For academic partnerships, research collaborations (e.g. with **IIT Bombay Transportation Systems Engineering**), or transit agency data-sharing discussions, please open an Issue or contact the project maintainers via GitHub.
