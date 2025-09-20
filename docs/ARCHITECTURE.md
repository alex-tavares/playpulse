# Architecture

## Components
1) **Godot SDK (client)**
   - `track(event_name, props)`; queue, batch, retries; offline buffer.
   - Sends `X-Api-Key` + `X-Signature` (HMAC-SHA256 of raw body).
   - Respects `consent_analytics`.

2) **Ingestion API** (Node/Express + TS)
   - Endpoint `POST /events` (batch).
   - Zod validation using shared schemas.
   - Request auth: API key + HMAC; per-IP and per-key rate limits.
   - JSON logging (no bodies). Body size < 1 MB.
   - Insert into Postgres `events_raw` via Prisma.

3) **Warehouse** (Postgres)
   - **Raw**: `events_raw` (append only).
   - **Derived**: materialized views for sessions/day, character popularity, retention cohorts.
   - Scheduled refresh (cron or on-demand).

4) **Analytics API** (Node/Express + TS)
   - Read-only endpoints that query views/tables.
   - Applies **k-anonymity** for public requests.

5) **Dashboard** (Next.js 14 + Tailwind + shadcn/ui + Recharts)
   - Public section: anonymized, live-ish stats.
   - Private section: retention, balance, drill-down (auth’d with NextAuth).

## Data Flow
SDK → Ingest (`POST /events`) → `events_raw` → refresh MVs → Analytics API → Dashboard.

## Cross-cutting Concerns
- **Privacy**: no PII; IP truncated (/24); consent filtering on read.
- **Security**: HMAC, API key, rate limits, strict CORS, JSON logs only.
- **Versioning**: `schema_version` carried end-to-end.
- **Observability**: structured logs with request id; basic metrics per service.
