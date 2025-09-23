# PlayPulse

Open-source telemetry and analytics tooling for game teams who want production-grade insight without vendor lock-in.

> **Project status:** Discovery & design. Implementation work has not landed yet—we're finalizing contracts, architecture, and privacy guardrails before scaffolding the services.

## Purpose
- Give indie teams real gameplay metrics they can trust when tuning balance.
- Ship a polished dashboard that doubles as a portfolio piece for recruiters, partners, and collaborators.
- Keep ownership of your player data with an auditable, privacy-first stack.

## Product Pillars
- **Godot SDK** – lightweight client for structured event capture.
- **Ingestion & Analytics API** – Node/TypeScript services backed by Postgres for storage, querying, and privacy controls.
- **Dashboard** – Next.js 14 front end with shadcn/ui + Recharts for live and demo visualizations.

## Progress Snapshot
**What exists today**
- Project brief, architecture notes, privacy posture, and supporting guides under `docs/` (see `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/PRIVACY.md`).
- Decision log in `docs/DECISIONS.md` plus scoped RFCs in `docs/RFC/` (PRD, ingest security, throughput, observability, dashboard IA, etc.).
- Placeholder workspace directories in `apps/` (`analytics-api`, `dashboard`, `ingest`) ready for their first implementation commits.

**Currently shaping**
- Finalizing telemetry event contracts, ingest security posture, and observability requirements before coding begins.
- Defining dashboard UX flows and k-anonymity rules for public vs. private views.

**Next milestones**
- Bootstrap the pnpm workspace with shared configs, linting, and test tooling.
- Commit the ingestion API skeleton (Node/TypeScript, Postgres) with baseline validation and logging.
- Land the dashboard shell and sample dataset for local demos.

## Repository Layout
```
apps/
  analytics-api/  # Placeholder for telemetry + analytics services (implementation pending)
  dashboard/      # Placeholder for Next.js dashboard experience
  ingest/         # Placeholder for event gateway & worker processes

docs/
  RFC/            # Product and architecture design docs + decision history

packages/         # Reserved for shared SDKs & libraries (to be created)
```

## Getting Started (Pre-alpha)
Implementation has not started yet; we're still firming up the design docs.
- Clone the repo if you want to review or contribute to planning materials.
- Follow updates in the decision log and RFCs; expect rapid iteration until we tag the first alpha release.

## Roadmap Themes
1. End-to-end telemetry loop from Godot sample game to analytics API.
2. Privacy-first dashboards with k-anonymized public and authenticated views.
3. Hosting story: local Docker Compose for dev, lightweight cloud deploy guide.

## Stay in the Loop
- Review the decision log (`docs/DECISIONS.md`) and open RFCs in `docs/RFC/` for current product and technical thinking.
- File ideas and questions as GitHub issues or discussions.
- Reach out if you want to pilot the stack with your game—we are shaping the roadmap with early adopters.
