# PlayPulse — Project Brief (Codex Anchor)

## Purpose
Open-source, production-credible **game telemetry & analytics** for Godot 4 titles (e.g., MythClash): a tiny SDK → secure ingest → warehouse → analytics API → polished dashboard (public + private).

## Outcomes
- Instrument a Godot 4 game with a lightweight SDK.
- Collect privacy-safe data (no PII, consent-aware) to a Postgres warehouse.
- Serve anonymized public metrics and deeper private insights.
- Ship a modern Next.js dashboard that’s recruiter-ready.

## Non‑Negotiables
- **TypeScript everywhere** (strict).
- **Postgres** as primary store; **Prisma** data access.
- **Privacy by design**: no PII, IP truncation, k-anonymity, explicit consent flag.
- **Tests-first loop** with Codex: generate tests → implement minimal diff → green CI.

## MVP Scope
- SDK events: `session_start`, `session_end`, `match_start`, `match_end`, `character_selected`.
- Ingest: `POST /events` with Zod validation, API key + HMAC, rate limit, body limit.
- Analytics: sessions/day, active players, character popularity; retention (D1/D7) soon after.
- Dashboard: public (2 charts) + private (1–2 charts).

## Success Criteria
- End-to-end demo dataset renders charts locally and on deployed preview.
- CI runs tests on PR; branch protection active.
- Public responses enforce k-anonymity; no raw identifiers exposed.
