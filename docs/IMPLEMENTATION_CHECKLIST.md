# Implementation Checklist

This is the master execution checklist for shipping the PlayPulse core telemetry stack. It tracks what already exists in the repository and the remaining implementation work needed to deliver the documented scope.

## How to use this doc

- Use `- [ ]` for incomplete work and `- [x]` for completed work.
- Each checkbox should represent one mergeable slice of work.
- Only mark a task done when code, tests, and relevant docs are updated.
- If a task changes a contract or ops behavior, update the corresponding docs or RFCs in the same PR.
- Keep new items under the correct phase instead of appending ad hoc TODOs.

## Current Status

The repository now has the MVP design foundation plus the reusable telemetry core needed for a real local loop: project docs, ratified RFCs, agent guidance, a bootstrapped pnpm workspace, shared TypeScript/ESLint/Prettier configuration, shared packages under `packages/`, a root Vitest setup, a local Postgres `docker compose` workflow, real CI validation for lint/typecheck/tests, a Prisma-backed `events_raw` schema, the ingest service in `apps/ingest`, the warehouse worker plus derived data flow in `apps/warehouse-worker`, the analytics API in `apps/analytics-api`, and the Godot SDK under `sdk/godot`.

The main remaining work is release hardening and finish-line verification. The raw write path, warehouse derivation layer, analytics read layer, and Godot client SDK are now in place for local end-to-end validation. First-party UI, BI automation, and game-specific examples are treated as companion repos rather than core deliverables.

- [x] Architecture, privacy, testing, env, and RFC docs committed
- [x] Agent guidance and workflows documented
- [x] pnpm workspace bootstrapped
- [x] Shared TS/ESLint/Prettier root config added
- [x] Placeholder app workspaces created
- [x] CI workflow committed

## Phase 1 - Close Spec Gaps

- [x] Finalize MVP event schemas from RFC-002 into `docs/EVENTS.md`
- [x] Define the ingest request and response contract in `docs/CONTRACTS/API_CONTRACT.md`
- [x] Define the first analytics endpoint contracts in `docs/CONTRACTS/API_CONTRACT.md`
- [x] Document stable error codes in one place, aligned with `docs/ERRORS.md`
- [x] Lock accepted `schema_version` policy for MVP
- [x] Confirm seeded demo dataset shape for MythClash and MythTag
- [x] Document unresolved RFC conflicts or implementation assumptions before coding starts

## Phase 2 - Shared Packages And Dev/Test Foundation

- [x] Create `packages/schemas` with shared Zod schemas and exported types
- [x] Create a shared config or env parsing package or module for documented env vars
- [x] Add a test runner and test scripts at the repo level
- [x] Add shared test fixtures and factories for telemetry payloads
- [x] Add a local Postgres dev workflow with `docker compose` and documented commands
- [x] Add baseline repo scripts for test, build, and filtered workspace execution
- [x] Wire lint, typecheck, and test to pass in the current scaffold
- [x] Replace the placeholder CI workflow with lint, typecheck, and test checks on PRs

## Phase 3 - Ingest Service MVP

- [x] Scaffold `apps/ingest/src/{routes,controllers,services,repos,lib,config}`
- [x] Add the initial Prisma schema and database setup for `events_raw`
- [x] Implement the `POST /events` route
- [x] Validate batched payloads with shared schemas
- [x] Enforce the 1 MB body limit
- [x] Implement API key and HMAC verification using the raw-body signing contract
- [x] Implement timestamp window validation and nonce replay detection
- [x] Implement per-IP and per-key rate limiting
- [x] Implement structured request logging without request bodies
- [x] Implement the standard JSON error envelope
- [x] Persist accepted events into Postgres `events_raw`
- [x] Expose a health endpoint and minimal service startup path
- [x] Add unit tests for auth and security helpers
- [x] Add integration tests for valid batch, invalid schema, bad signature, replay, rate limit, and payload too large

## Phase 4 - Warehouse And Derived Data

- [x] Create the raw-event storage model aligned with the ERD and RFC-008
- [x] Create `dim_dates`
- [x] Implement refreshable derived structures for sessions per day
- [x] Implement refreshable derived structures for character popularity
- [x] Implement retention cohort derivation for D1 and D7
- [x] Add refresh jobs or commands for 5-minute and nightly refresh cadence
- [x] Add zero-fill behavior through date joins
- [x] Store suppression flags in derived outputs
- [x] Add DB tests or integration coverage for inserts and derivations
- [x] Document the local seed and refresh workflow

## Phase 5 - Analytics API MVP

- [x] Scaffold `apps/analytics-api/src/{routes,controllers,services,repos,lib,config}`
- [x] Implement the sessions-per-day endpoint
- [x] Implement the active-players metric path
- [x] Implement the character-popularity endpoint
- [x] Implement the retention-cohorts endpoint
- [x] Enforce consent filtering on reads
- [x] Enforce k-anonymity and suppression behavior on public responses
- [x] Implement zero-fill response behavior for time series
- [x] Return stable JSON response shapes for analytics consumers
- [x] Add integration tests for zero-fill, suppression, public/private behavior, and error cases

## Phase 6 - Companion Repos And Optional Consumers

- [x] Move the first-party UI out of the core repo scope
- [x] Move Metabase automation and starter dashboards into a companion BI repo
- [x] Move MythTag-specific bridge helpers and validation scripts into a companion examples repo
- [ ] Publish generic consumer guidance outside the core repo if the community demands it

## Phase 7 - Godot SDK MVP

- [x] Create the SDK workspace or location and basic project structure
- [x] Implement `configure`
- [x] Implement `track`
- [x] Implement queueing and batch flush behavior
- [x] Implement offline persistence and replay
- [x] Implement the HMAC signing contract
- [x] Implement consent enable and disable behavior
- [x] Implement retry, backoff, and failure handling
- [x] Implement shutdown flush behavior
- [x] Add tests or validation coverage for envelope generation, queue behavior, signing, and consent logic

## Phase 8 - Observability, Security, And Ops Readiness

- [ ] Add metrics for ingest, analytics, and materialized-view refresh aligned with RFC-005
- [ ] Add request IDs and trace propagation
- [ ] Ensure log fields align with RFC-005 and privacy requirements
- [ ] Add staging and prod environment config documentation as code or templates
- [ ] Document secret handling and local `.env` setup
- [ ] Add a deployable local stack for demo and staging parity where feasible
- [ ] Add a smoke-test checklist for staging
- [ ] Align actual branch protection and CI expectations with the documented workflow
- [ ] Confirm retention, backup, and restore procedures are represented in repo docs

## Phase 9 - Finish Line

- [ ] Seed end-to-end demo data for MythClash and MythTag
- [ ] Verify the end-to-end path from SDK to ingest to warehouse to analytics
- [ ] Verify public endpoints never expose raw identifiers
- [ ] Verify k-anonymity with automated tests
- [ ] Verify lint, typecheck, and tests run in CI
- [ ] Verify local setup works from clone to demo
- [ ] Update `README.md` with real run instructions, architecture status, and MVP capabilities
- [ ] Verify the companion BI and examples repos still integrate cleanly with the core stack
- [ ] Complete the MVP release-readiness checklist

## Post-MVP Backlog

- [ ] C# bindings
- [ ] Additional Godot export targets
- [ ] Custom event schema registration and quarantine flow
- [ ] Dimension tables and richer metadata joins
- [ ] Advanced analytics beyond the current MVP
- [ ] Optional cloud deployment hardening and multi-region concerns
