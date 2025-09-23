# PlayPulse

Open-source telemetry and analytics tooling for game teams who want production-grade insight without vendor lock-in.

> **Project status:** Pre-alpha. Repo scaffolding and design docs are in place while we stand up the ingestion pipeline and dashboard slices.

## Purpose
- Give indie teams real gameplay metrics they can trust when tuning balance.
- Ship a polished dashboard that doubles as a portfolio piece for recruiters, partners, and collaborators.
- Keep ownership of your player data with an auditable, privacy-first stack.

## Product Pillars
- **Godot SDK** – lightweight client for structured event capture.
- **Ingestion & Analytics API** – Node/TypeScript services backed by Postgres for storage, querying, and privacy controls.
- **Dashboard** – Next.js 14 front end with shadcn/ui + Recharts for live and demo visualizations.

## Progress Snapshot
**In repo today**
- Monorepo layout and workspace directories for ingestion, analytics, and dashboard apps (`apps/`).
- Early information architecture, chart specs, and privacy rules captured in design RFCs (see `docs/RFC/RFC-006.md`).
- Contributor and security guidelines to support incoming collaborators.

**Active build**
- Telemetry event schema definition and ingestion gateway prototype in progress.
- Dashboard shell with public/private metrics tabs, k-anonymity messaging, and chart scaffolding.

**Up next**
- Godot sample project wired to the ingestion API for end-to-end demos.
- Seed analytics dataset and scripted fixtures for repeatable testing.
- Deployment playbooks (Docker Compose + cloud baseline).

## Repository Layout
```
apps/
  analytics-api/  # Telemetry and analytics services (Node/TypeScript)
  dashboard/      # Next.js dashboard experience
  ingest/         # Event gateway & worker processes

docs/
  RFC/            # Product and architecture design docs

packages/         # Shared SDKs & libraries (landing soon)
```

## Getting Started (Pre-alpha)
Tooling is landing alongside the first running services.
- Clone the repo, install `pnpm`, and follow along in the RFCs while the workspace configuration is finalized.
- Track progress via issues and RFC updates; expect breaking changes until we tag the first alpha release.

## Roadmap Themes
1. End-to-end telemetry loop from Godot sample game to analytics API.
2. Privacy-first dashboards with k-anonymized public and authenticated views.
3. Hosting story: local Docker Compose for dev, lightweight cloud deploy guide.

## Stay in the Loop
- Review open RFCs in `docs/RFC/` for product and technical decisions.
- File ideas and questions as GitHub issues or discussions.
- Reach out if you want to pilot the stack with your game—we are shaping the roadmap with early adopters.
