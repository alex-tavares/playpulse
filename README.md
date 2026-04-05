# PlayPulse

Open-source telemetry and analytics tooling for game teams who want production-grade insight without vendor lock-in.

> **Project status:** Foundation in place. MVP contracts, shared packages, local Postgres workflow, and CI validation are ready; application services and UI implementation are next.

## Purpose
- Give indie teams real gameplay metrics they can trust when tuning balance.
- Ship a polished dashboard that doubles as a portfolio piece for recruiters, partners, and collaborators.
- Keep ownership of player data with an auditable, privacy-first stack.

## Product Pillars
- **Godot SDK**: lightweight client for structured event capture.
- **Ingestion and Analytics API**: Node/TypeScript services backed by Postgres for storage, querying, and privacy controls.
- **Dashboard**: Next.js 14 front end with shadcn/ui and Recharts for live and demo visualizations.

## Progress Snapshot
**What exists today**
- Project brief, architecture notes, privacy posture, and supporting guides under `docs/` (see `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/PRIVACY.md`).
- Decision log in `docs/DECISIONS.md` plus scoped RFCs in `docs/RFC/`.
- Shared workspace tooling and foundation packages for schemas, config, and test helpers under `packages/`.
- Placeholder workspace directories in `apps/` (`analytics-api`, `dashboard`, `ingest`) ready for their first implementation commits.
- Local Postgres development workflow via `docker compose` and CI validation for lint, typecheck, and tests.

**Currently shaping**
- Beginning service implementation on top of the finalized MVP contracts and shared foundation packages.
- Using the shared schemas, config parsing, test helpers, local Postgres workflow, and CI baseline as the starting point for Phase 3.

**Next milestones**
- Commit the ingestion API skeleton (Node/TypeScript, Postgres) with baseline validation and logging.
- Add the warehouse schema, refresh jobs, and initial derived data flow.
- Land the dashboard shell and sample dataset for local demos.

## Repository Layout
```text
apps/
  analytics-api/  # Placeholder for telemetry + analytics services (implementation pending)
  dashboard/      # Placeholder for Next.js dashboard experience
  ingest/         # Placeholder for event gateway and worker processes

docs/
  RFC/            # Product and architecture design docs + decision history

packages/         # Shared schemas, config parsing, and test helpers
```

## Getting Started (Pre-alpha)
The repository now includes the shared foundation for implementation, but the product apps themselves are still being built.
- Clone the repo to review the docs or start Phase 3 service work.
- Follow the implementation checklist and RFCs for the current delivery sequence.

## Development Setup
- Enable the pinned package manager with `corepack enable`, then install dependencies with `pnpm install`.
- Workspaces under `apps/*` and `packages/*` share the root toolchain and configs.
- Start local Postgres with `pnpm db:up`; stop it with `pnpm db:down`; inspect logs with `pnpm db:logs`.
- Use `PLAYPULSE_DATABASE_URL=postgresql://playpulse:playpulse@localhost:5432/playpulse` for local backend work until app-specific env wiring lands.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` for the shared validation baseline.
- Build shared workspaces with `pnpm build`.
- Individual workspace scripts can be executed with filters, for example `pnpm --filter @playpulse/schemas test`.

## Roadmap Themes
1. End-to-end telemetry loop from Godot sample game to analytics API.
2. Privacy-first dashboards with k-anonymized public and authenticated views.
3. Hosting story: local Docker Compose for dev, lightweight cloud deploy guide.

## Stay in the Loop
- Review the decision log (`docs/DECISIONS.md`) and open RFCs in `docs/RFC/` for current product and technical thinking.
- File ideas and questions as GitHub issues or discussions.
- Reach out if you want to pilot the stack with your game; we are shaping the roadmap with early adopters.
