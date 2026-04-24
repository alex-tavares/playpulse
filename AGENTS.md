# AGENTS.md

## Project

PlayPulse is a privacy-first, self-hostable telemetry stack for Godot 4 games:

`Godot SDK -> ingest -> Postgres warehouse -> analytics API -> external consumers`

Prefer small vertical slices that ratify the documented architecture. Do not invent broad scaffolding beyond the source-of-truth docs.

## Read First

Before substantial code changes, read:

1. `docs/PROJECT_BRIEF.md`
2. `docs/ARCHITECTURE.md`
3. `docs/EVENTS.md`
4. `docs/CONTRACTS/API_CONTRACT.md`
5. `docs/PRIVACY.md`
6. `docs/CODING_STANDARDS.md`
7. `docs/TEST_STRATEGY.md`
8. `docs/ENV.md`
9. `docs/DECISIONS.md`

Then read only RFCs relevant to the task.

## Decision Order

When docs overlap, use this precedence:

1. `docs/DECISIONS.md`
2. Ratified RFCs
3. Contracts, architecture, privacy, env, and test docs
4. README and supporting guides

If an RFC header still says `Draft` but `docs/DECISIONS.md` says it was ratified, treat it as normative. If docs conflict and the conflict changes behavior, call it out before implementing.

Known branch-process conflict: `docs/PLAYBOOK.md` says `main`, while `CONTRIBUTING.md`, `docs/GUIDES/DEVELOPMENT_FLOW.md`, and `docs/RFC/RFC-009.md` use `develop`. Until unified, treat `develop` as the integration branch and `main` as release-only.

## Non-Negotiables

- TypeScript strict mode everywhere.
- No `any` in exported types.
- Postgres is the primary store; Prisma is the intended data access layer.
- JSON-only APIs with `snake_case` payload keys.
- Error responses use the standard JSON envelope with stable `code`; never expose stack traces.
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

Unless the task is docs-only:

1. Derive acceptance criteria from docs.
2. Write or update tests first.
3. Implement the minimum code needed.
4. Run targeted tests, lint, and typecheck.
5. Update docs if contracts or operational behavior changed.

Every bug fix should add or update a regression test unless the change is docs-only.

## Branches And Commits

- Use Conventional Commits for commit messages and PR titles: `type(scope): summary`.
- Use conventional branch prefixes that match the change type, such as `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`, or `chore/<slug>`.
- Branch from `develop` for day-to-day work unless the task is a release or hotfix.

## Repo Boundaries

- `apps/ingest`: batch `POST /events`, JSON-only, 1 MB body limit, auth, replay protection, rate limits, HMAC raw-body verification, append-only raw event persistence.
- `apps/analytics-api`: read-only metrics API backed by derived views/tables; enforce zero-fill, consent, and suppression.
- `apps/warehouse-worker`: warehouse refresh and derived data workflows.
- `packages/schemas`: shared validation and contract types.
- `packages/config`: environment parsing and runtime config.
- `packages/testkit`: shared test helpers.
- `sdk`: Godot SDK; keep `track()` cheap, queue/batch/retry offline, and respect consent immediately.

For Node/TypeScript services, use `src/{routes,controllers,services,repos,lib,config}`. Routes wire HTTP only, controllers orchestrate request/response mapping, services own business/privacy rules, repos own Prisma/SQL access, `lib` holds pure utilities, and `config` parses runtime configuration.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`

Run narrower workspace commands when possible.

## Codex Workflows

- Repo skills live in `.agents/skills/*/SKILL.md`; use them for repeatable PlayPulse workflows.
- Custom read-only subagents live in `.codex/agents/*.toml`; ask Codex to spawn them explicitly for parallel research or review.
- Shared Codex config lives in `.codex/config.toml`; keep user-specific model, sandbox, approval, credential, and provider settings out of the repo.
- Human workflow guidance lives in `docs/GUIDES/USING_CODEX.md` and `docs/GUIDES/AGENT_WORKFLOWS.md`.

## Definition Of Done

A change is not done unless it keeps the repo aligned with documented contracts, privacy guarantees, and operational constraints.
