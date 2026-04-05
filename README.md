# PlayPulse

Open-source telemetry and analytics tooling for game teams who want production-grade insight without vendor lock-in.

> **Project status:** Ingest MVP is live in the repo. Shared packages, local Postgres workflow, raw-event Prisma storage, and CI validation are in place; analytics, dashboard, and SDK implementation are next.

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
- The first runnable app in `apps/ingest`, including `POST /events`, `GET /health`, structured logging, auth checks, and Postgres-backed raw event persistence.
- Local Postgres development workflow via `docker compose` and CI validation for lint, typecheck, and tests.

**Currently shaping**
- Building warehouse derivations and analytics reads on top of the ingest write path and raw-event storage slice.
- Keeping the shared schemas, config parsing, test helpers, local Postgres workflow, and CI baseline as the foundation for the next phases.

**Next milestones**
- Add the warehouse schema, refresh jobs, and initial derived data flow.
- Land the dashboard shell and sample dataset for local demos.
- Implement the Godot SDK and end-to-end sample integration path.

## Repository Layout
```text
apps/
  analytics-api/  # Placeholder for telemetry + analytics services (implementation pending)
  dashboard/      # Placeholder for Next.js dashboard experience
  ingest/         # Express ingest service with auth, validation, and raw-event persistence

docs/
  RFC/            # Product and architecture design docs + decision history

packages/         # Shared schemas, config parsing, and test helpers
```

## Getting Started (Pre-alpha)
The repository now includes the first runnable backend service plus the shared implementation foundation.
- Clone the repo to review the docs or continue warehouse, analytics, or SDK work.
- Follow the implementation checklist and RFCs for the current delivery sequence.

## Development Setup
- Enable the pinned package manager with `corepack enable`, then install dependencies with `pnpm install`.
- Workspaces under `apps/*` and `packages/*` share the root toolchain and configs.
- Start local Postgres with `pnpm db:up`; stop it with `pnpm db:down`; inspect logs with `pnpm db:logs`.
- Generate the Prisma client with `pnpm db:generate`, then apply the migration with `pnpm db:migrate` before running the ingest integration tests or the service locally.
- Use `PLAYPULSE_DATABASE_URL=postgresql://playpulse:playpulse@localhost:5432/playpulse` for local backend work.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` for the current validation baseline.
- Build shared workspaces with `pnpm build`.
- Run the ingest service locally with `pnpm --filter @playpulse/ingest dev`.
- Individual workspace scripts can be executed with filters, for example `pnpm --filter @playpulse/schemas test`.

## Roadmap Themes
1. End-to-end telemetry loop from Godot sample game to analytics API.
2. Privacy-first dashboards with k-anonymized public and authenticated views.
3. Hosting story: local Docker Compose for dev, lightweight cloud deploy guide.

## Stay in the Loop
- Review the decision log (`docs/DECISIONS.md`) and open RFCs in `docs/RFC/` for current product and technical thinking.
- File ideas and questions as GitHub issues or discussions.
- Reach out if you want to pilot the stack with your game; we are shaping the roadmap with early adopters.
