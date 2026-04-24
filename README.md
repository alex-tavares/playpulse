# PlayPulse

Open-source telemetry and analytics tooling for game teams who want production-grade insight without vendor lock-in.

> **Project status:** The reusable core is live in the repo: Godot SDK MVP, ingest MVP, warehouse derivations, analytics API, shared packages, local Postgres workflow, raw-event Prisma storage, derived data refresh commands, and CI validation. First-party UI, Metabase automation, and game-specific examples now live in companion repos.

## Purpose
- Give indie teams real gameplay metrics they can trust when tuning balance.
- Keep ownership of player data with an auditable, privacy-first stack.

## Product Pillars
- **Godot SDK**: lightweight client for structured event capture.
- **Ingestion and Analytics API**: Node/TypeScript services backed by Postgres for storage, querying, and privacy controls.
- **Warehouse**: Postgres tables, materialized views, and refresh commands for sessions, popularity, cohorts, and KPI summaries.
- **Optional Consumers**: BI tools, dashboards, and example game integrations are treated as companion projects rather than core product code.

## Progress Snapshot
**What exists today**
- Project brief, architecture notes, privacy posture, and supporting guides under `docs/`.
- Decision log in `docs/DECISIONS.md` plus scoped RFCs in `docs/RFC/`.
- Shared workspace tooling and foundation packages for schemas, config, and test helpers under `packages/`.
- The ingest service in `apps/ingest`, including `POST /events`, `GET /health`, structured logging, auth checks, and Postgres-backed raw event persistence.
- The warehouse worker in `apps/warehouse-worker`, including date-dimension seeding, demo-data seeding, and refresh flows for sessions, character popularity, retention cohorts, and KPI summary views.
- The analytics API in `apps/analytics-api`, including health, summary, daily sessions, character popularity, and private retention read endpoints backed by the warehouse structures.
- The Godot SDK under `sdk/godot/playpulse`, including the `PlayPulse` autoload addon and standalone SDK tests.
- Local Postgres development workflow via `docker compose` and CI validation for lint, typecheck, and tests.

**Next milestones**
- Add the remaining observability and deployment readiness work around the backend services.
- Tighten the open-source story with companion repos for BI and game-specific examples.

## Repository Layout
```text
apps/
  analytics-api/    # Express analytics read API backed by warehouse-derived structures
  ingest/           # Express ingest service with auth, validation, and raw-event persistence
  warehouse-worker/ # Refresh and seed commands for derived warehouse structures

docs/
  RFC/              # Product and architecture design docs + decision history

packages/           # Shared schemas, config parsing, and test helpers
sdk/godot/playpulse/ # Shippable Godot addon/autoload
```

## Companion Repos
- **BI companion**: [alex-tavares/playpulse-bi](https://github.com/alex-tavares/playpulse-bi) for Metabase compose, bootstrap scripts, starter dashboards, and read-only BI roles.
- **Examples repo**: [alex-tavares/playpulse-examples](https://github.com/alex-tavares/playpulse-examples) for MythTag-style integrations, launch helpers, and consumer-specific validation bridges.

## Getting Started
The repository includes runnable backend services, a seeded warehouse flow, and a reusable Godot SDK.
- Clone the repo to review the docs or continue ingest, warehouse, analytics, or SDK work.
- Use a BI tool or custom consumer against the warehouse outputs and analytics API.
- Follow the implementation checklist and RFCs for the current delivery sequence.

## Development Setup
- Enable the pinned package manager with `corepack enable`, then install dependencies with `pnpm install`.
- Workspaces under `apps/*` and `packages/*` share the root toolchain and configs.
- Start local Postgres with `pnpm db:up`; stop it with `pnpm db:down`; inspect logs with `pnpm db:logs`.
- Generate the Prisma client with `pnpm db:generate`, then apply the migration with `pnpm db:migrate` before running backend integration tests or the services locally.
- Use `PLAYPULSE_DATABASE_URL=postgresql://playpulse:playpulse@localhost:5432/playpulse` for local backend work.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` for the current validation baseline.
- Build shared workspaces with `pnpm build`.
- Run the ingest service locally with `pnpm --filter @playpulse/ingest dev`.
- Run the analytics API locally with `pnpm --filter @playpulse/analytics-api dev`.
- Seed the demo warehouse data with `pnpm db:seed-demo`, then rebuild derived structures with `pnpm db:refresh`.
- Rebuild only retention cohorts with `pnpm db:refresh:retention` when validating retention-specific changes.
- Individual workspace scripts can be executed with filters, for example `pnpm --filter @playpulse/schemas test`.
- Run the standalone Godot SDK test suite with `powershell -ExecutionPolicy Bypass -File scripts/godot/Run-SdkTests.ps1`.
- For game-specific validation flows such as MythTag, use the companion examples repo.
- For internal analysis with Metabase, use the BI companion repo against the warehouse structures (`mv_metrics_summary_current`, `mv_sessions_daily`, `mv_character_popularity`, `retention_cohorts`).

## Roadmap Themes
1. End-to-end telemetry loop from Godot SDK to ingest, warehouse, and analytics API.
2. Privacy-first storage and read APIs with auditable consent and suppression rules.
3. Hosting story: local Docker Compose for dev, lightweight cloud deploy guide.

## Stay in the Loop
- Review the decision log (`docs/DECISIONS.md`) and open RFCs in `docs/RFC/` for current product and technical thinking.
- File ideas and questions as GitHub issues or discussions.
- Reach out if you want to pilot the stack with your game; companion repos and consumer examples will keep expanding with early adopters.
