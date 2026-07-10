# MetroRadar 🚇📡

MetroRadar is a real-time transit visualization, monitoring, and prediction platform. 

It provides an interactive, beautiful interface for tracking metro/subway systems, calculating live delay analytics, and alerting commuters to service changes.

---

## Repository Structure

MetroRadar is organized as a monorepo:

*   **`apps/`**: Applications (web dashboards, API services, ingestion daemons).
*   **`packages/`**: Shared modules (UI design systems, global type definitions, config presets).
*   **`database/`**: Database schemas, geospatial indexing, and migration scripts.
*   **`docker/`**: Container configurations for local development and production.

---

## Core Documentation

Explore these reference files to learn more about the project:

*   [PROJECT_BIBLE.md](./PROJECT_BIBLE.md): Architecture, technology stack, and engineering guidelines.
*   [ROADMAP.md](./ROADMAP.md): Release phases, features, and timeline milestones.
*   [TODO.md](./TODO.md): Backlog checklist and current task progress.

---

## Getting Started

*(Detailed installation instructions will be added as tech stack implementation is finalized.)*

### Prerequisites

*   Node.js (LTS version) or Docker (recommended)
*   Git

### Local Development

1.  Clone this repository:
    ```bash
    git clone https://github.com/your-username/MetroRadar.git
    cd MetroRadar
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development environment (with Docker Compose):
    ```bash
    docker-compose -f docker/docker-compose.yml up
    ```
