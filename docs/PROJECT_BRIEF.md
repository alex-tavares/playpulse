# PlayPulse - Project Brief (Codex Anchor)

## Purpose
Open-source, production-credible **game telemetry and analytics** for Godot 4 titles: a tiny SDK -> secure ingest -> warehouse -> analytics API.

## Outcomes
- Instrument a Godot 4 game with a lightweight SDK.
- Collect privacy-safe data (no PII, consent-aware) to a Postgres warehouse.
- Expose privacy-safe aggregates through a reusable analytics API.
- Support optional consumers such as BI tools and community-built dashboards without coupling them to the core repo.

## Non-Negotiables
- **TypeScript everywhere** (strict).
- **Postgres** as primary store; **Prisma** data access.
- **Privacy by design**: no PII, IP truncation, k-anonymity, explicit consent flag.
- **Tests-first loop** with Codex: generate tests -> implement minimal diff -> green CI.

## MVP Scope
- SDK events: `session_start`, `session_end`, `match_start`, `match_end`, `character_selected`.
- Ingest: `POST /events` with Zod validation, API key + HMAC, rate limit, body limit.
- Analytics: sessions/day, active players, character popularity, retention (D1/D7).
- Companion consumers: external BI tooling and example integrations can consume the warehouse outputs and analytics API.

## Success Criteria
- End-to-end demo data is queryable locally and in hosted environments through warehouse outputs and the analytics API.
- CI runs tests on PR; branch protection active.
- Public responses enforce k-anonymity; no raw identifiers exposed.
