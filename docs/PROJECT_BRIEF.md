# Project Brief (Codex anchor)

## Goal
Open-source telemetry + analytics for Godot games: SDK → ingest → Postgres → analytics API → Next.js dashboard.

## Non-negotiables
- TypeScript everywhere; pnpm workspaces; Node 20.
- Postgres primary store; no raw PII; IP truncation; k-anonymity.
- Public vs Private data split; auth with NextAuth.

## First MVP scope
- SDK: `track`, batch flush, events (session, match_start, match_end).
- Ingest: POST /events with Zod validation + HMAC + Postgres.
- Analytics API: sessions/day, active players, character popularity.
- Dashboard: 2 public charts, 1 private chart.

## Definition of Done
- Tests pass, docs updated, CI green, demo dataset renders charts.
