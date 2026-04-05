# AGENTS.md

## Purpose

This file is for AI coding agents working in PlayPulse.

Use it as a short operating map:

- what this repo is
- where the source of truth lives
- which constraints are non-negotiable
- how to work without drifting from the design docs

Do not treat this file as the full specification. Follow the linked docs.

## Project

PlayPulse is a privacy-first, self-hostable telemetry stack for Godot 4 games:

`SDK -> ingest -> Postgres warehouse -> analytics API -> dashboard`

The repo is still design-first. Most implementation has not landed yet. Prefer small vertical slices that ratify the documented architecture instead of broad speculative scaffolding.

## Repo Map

- `apps/ingest`: future write path for `POST /events`
- `apps/analytics-api`: future read-only metrics API
- `apps/dashboard`: future Next.js dashboard
- `packages/*`: shared schemas, config, helpers, and reusable libraries
- `docs/*`: source of truth for product, architecture, contracts, privacy, and workflow

## Read First

Before any substantial code change, read:

1. `docs/PROJECT_BRIEF.md`
2. `docs/ARCHITECTURE.md`
3. `docs/EVENTS.md`
4. `docs/CONTRACTS/API_CONTRACT.md`
5. `docs/PRIVACY.md`
6. `docs/CODING_STANDARDS.md`
7. `docs/TEST_STRATEGY.md`
8. `docs/ENV.md`
9. `docs/DECISIONS.md`

Then read only the RFCs relevant to the task.

## Decision Order

When docs overlap, use this precedence:

1. `docs/DECISIONS.md`
2. ratified RFCs
3. contracts, architecture, privacy, env, and test docs
4. README and supporting guides

If an RFC still says `Draft` in its header but `docs/DECISIONS.md` says it was ratified, treat it as normative.

If docs conflict and the conflict changes implementation behavior, call it out instead of silently picking one.

Known branch-process conflict:

- `docs/PLAYBOOK.md` says default branch is `main`
- `CONTRIBUTING.md`, `docs/GUIDES/DEVELOPMENT_FLOW.md`, and `docs/RFC/RFC-009.md` use `develop` for day-to-day work

Until unified, treat `develop` as the integration branch and `main` as release-only.

## Non-Negotiables

- TypeScript strict mode everywhere.
- No `any` in exported types.
- Postgres is the primary store.
- Prisma is the intended data access layer.
- JSON-only APIs.
- Event and analytics payload keys use `snake_case`.
- Error responses use the standard JSON envelope with stable `code`.
- Never expose stack traces in API responses.
- Shared validation belongs in `packages/schemas`; do not redeclare shapes in apps.
- Logging must be structured JSON and privacy-safe.
- Never log raw request bodies, raw headers, player identifiers, or other PII.
- No PII is accepted or stored.
- Truncate IPs at ingest.
- Respect `consent_analytics` end-to-end.
- Public analytics must enforce k-anonymity; buckets under 10 are hidden, merged, or flagged as suppressed.
- Carry `schema_version` end-to-end.
- Document environment-driven behavior in `docs/ENV.md`.

## Default Workflow

Prefer this loop unless the task is docs-only:

1. derive acceptance criteria from docs
2. write tests first
3. implement the minimum code needed
4. run targeted tests, lint, and typecheck
5. update docs if contracts or operational behavior changed

Keep diffs small. Prefer narrow, reviewable slices over whole-system scaffolding.

Every bug fix should add or update a regression test unless the change is docs-only.

## Structural Rules

For Node/TypeScript services, default to:

`src/{routes,controllers,services,repos,lib,config}`

Use these boundaries:

- routes: HTTP wiring only
- controllers: request/response orchestration
- services: business and privacy rules
- repos: Prisma and SQL access only
- lib: pure utilities
- config: env parsing and runtime config

Do not combine validation, SQL, privacy filtering, and response mapping in a single route file.

If multiple apps need the same rules or shapes, move them into `packages/*`.

## Area Rules

### Ingest

- `POST /events` is batch-based.
- Enforce JSON-only requests, 1 MB body limit, auth, replay protection, and rate limits.
- Validate with shared schemas.
- Verify HMAC against the raw-body contract from RFC-003.
- Persist append-only raw events.

### Analytics API

- Read from derived views/tables for product endpoints.
- Enforce zero-fill and suppression behavior.
- Keep endpoints read-only and stable for dashboard consumers.

### Dashboard

- Implement public and private views separately.
- Honor suppression UX exactly as specified in RFC-006.
- Empty, loading, and error states are part of the feature.

### Godot SDK

- Keep `track()` cheap on the main thread.
- Queue, batch, retry, and persist offline according to RFC-007.
- Respect consent immediately.

## Commands

- install: `pnpm install`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`
- dev: `pnpm dev`

Run narrower workspace commands when possible.

## Prompting And Workflows

Use:

- `docs/GUIDES/USING_CODEX.md` for agent usage guidance
- `docs/GUIDES/AGENT_WORKFLOWS.md` for PlayPulse-specific prompt recipes
- `docs/PROMPTS/*` for short prompt templates

## Definition Of Done

A change is not done unless it keeps the repo aligned with its documented contracts, privacy guarantees, and operational constraints.
