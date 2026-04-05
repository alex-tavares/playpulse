# Implementation Checklist

This is the master execution checklist for shipping the PlayPulse MVP. It tracks what already exists in the repository and the remaining implementation work needed to deliver the documented scope.

## How to use this doc

- Use `- [ ]` for incomplete work and `- [x]` for completed work.
- Each checkbox should represent one mergeable slice of work.
- Only mark a task done when code, tests, and relevant docs are updated.
- If a task changes a contract or ops behavior, update the corresponding docs or RFCs in the same PR.
- Keep new items under the correct phase instead of appending ad hoc TODOs.

## Current Status

The repository now has the MVP design foundation plus the shared implementation baseline: project docs, ratified RFCs, agent guidance, a bootstrapped pnpm workspace, shared TypeScript/ESLint/Prettier configuration, shared packages under `packages/`, a root Vitest setup, a local Postgres `docker compose` workflow, and real CI validation for lint, typecheck, and tests. Placeholder app directories and per-app `tsconfig.json` files still exist for `ingest`, `analytics-api`, and `dashboard`.

There is still no production service or UI code in `apps/`, and the warehouse, Prisma schema, backend implementations, and dashboard application remain to be built. The shared packages and tooling foundation are in place, but Phase 3 onward is still implementation work.

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

- [ ] Scaffold `apps/ingest/src/{routes,controllers,services,repos,lib,config}`
- [ ] Implement the `POST /events` route
- [ ] Validate batched payloads with shared schemas
- [ ] Enforce the 1 MB body limit
- [ ] Implement API key and HMAC verification using the raw-body signing contract
- [ ] Implement timestamp window validation and nonce replay detection
- [ ] Implement per-IP and per-key rate limiting
- [ ] Implement structured request logging without request bodies
- [ ] Implement the standard JSON error envelope
- [ ] Persist accepted events into Postgres `events_raw`
- [ ] Expose a health endpoint and minimal service startup path
- [ ] Add unit tests for auth and security helpers
- [ ] Add integration tests for valid batch, invalid schema, bad signature, replay, rate limit, and payload too large

## Phase 4 - Warehouse And Derived Data

- [ ] Add Prisma schema and initial database setup for `events_raw`
- [ ] Create the raw-event storage model aligned with the ERD and RFC-008
- [ ] Create `dim_dates`
- [ ] Implement refreshable derived structures for sessions per day
- [ ] Implement refreshable derived structures for character popularity
- [ ] Implement retention cohort derivation for D1 and D7
- [ ] Add refresh jobs or commands for 5-minute and nightly refresh cadence
- [ ] Add zero-fill behavior through date joins
- [ ] Store suppression flags in derived outputs
- [ ] Add DB tests or integration coverage for inserts and derivations
- [ ] Document the local seed and refresh workflow

## Phase 5 - Analytics API MVP

- [ ] Scaffold `apps/analytics-api/src/{routes,controllers,services,repos,lib,config}`
- [ ] Implement the sessions-per-day endpoint
- [ ] Implement the active-players metric path
- [ ] Implement the character-popularity endpoint
- [ ] Implement the retention-cohorts endpoint
- [ ] Enforce consent filtering on reads
- [ ] Enforce k-anonymity and suppression behavior on public responses
- [ ] Implement zero-fill response behavior for time series
- [ ] Return stable JSON response shapes for dashboard consumers
- [ ] Add integration tests for zero-fill, suppression, public/private behavior, and error cases

## Phase 6 - Dashboard MVP

- [ ] Scaffold the Next.js dashboard app shell
- [ ] Implement the global layout and navigation from RFC-006
- [ ] Implement the public metrics page
- [ ] Implement the sessions-per-day chart card
- [ ] Implement the character-popularity chart card
- [ ] Implement the private insights page
- [ ] Implement the retention chart card
- [ ] Implement loading, empty, and error states
- [ ] Implement suppression UX exactly as documented
- [ ] Connect the dashboard to the analytics API or seeded demo service
- [ ] Add a sample or demo dataset flow for local preview
- [ ] Add UI smoke checks for public/private pages and chart-state rendering

## Phase 7 - Godot SDK MVP

- [ ] Create the SDK workspace or location and basic project structure
- [ ] Implement `configure`
- [ ] Implement `track`
- [ ] Implement queueing and batch flush behavior
- [ ] Implement offline persistence and replay
- [ ] Implement the HMAC signing contract
- [ ] Implement consent enable and disable behavior
- [ ] Implement retry, backoff, and failure handling
- [ ] Implement shutdown flush behavior
- [ ] Instrument a sample Godot integration path for demo use
- [ ] Add tests or validation coverage for envelope generation, queue behavior, signing, and consent logic

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
- [ ] Verify the end-to-end path from SDK to ingest to warehouse to analytics to dashboard
- [ ] Verify public endpoints never expose raw identifiers
- [ ] Verify k-anonymity with automated tests
- [ ] Verify lint, typecheck, and tests run in CI
- [ ] Verify local setup works from clone to demo
- [ ] Update `README.md` with real run instructions, architecture status, and MVP capabilities
- [ ] Complete the MVP release-readiness checklist

## Post-MVP Backlog

- [ ] C# bindings
- [ ] Additional Godot export targets
- [ ] Custom event schema registration and quarantine flow
- [ ] Dimension tables and richer metadata joins
- [ ] Advanced analytics beyond the current MVP
- [ ] Optional cloud deployment hardening and multi-region concerns
