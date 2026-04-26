# Architecture

## Components
1) **Godot SDK (client)**
   - `track(event_name, props)`; queue, batch, retries; offline buffer.
   - Trusted builds send `X-Api-Key` + `X-Signature` (HMAC-SHA256 of raw body).
   - Public web/native builds fetch short-lived bearer tokens with `auth_mode = "public_client"` and do not ship secrets.
   - Respects `consent_analytics`.

2) **Ingestion API** (Node/Express + TS)
   - Endpoint `POST /events` (batch).
   - Zod validation using shared schemas.
   - Request auth: API key + HMAC or short-lived public client bearer tokens; per-IP and per-key/client rate limits.
   - JSON logging (no bodies). Body size < 1 MB.
   - Insert into Postgres `events_raw` via Prisma.

3) **Warehouse** (Postgres)
   - **Raw**: `events_raw` (append only).
   - **Derived**: materialized views for sessions/day, character popularity, retention cohorts.
   - Scheduled refresh (cron or on-demand).

4) **Analytics API** (Node/Express + TS)
   - Read-only endpoints that query views/tables.
   - Applies **k-anonymity** for public requests.

5) **External Consumers**
   - Optional BI tools, community integrations, and hosted clients consume the analytics API or warehouse outputs outside the core repo.

## Data Flow
SDK → Ingest (`POST /events`) → `events_raw` → refresh MVs → Analytics API → external consumers.

## Cross-cutting Concerns
- **Privacy**: no PII; IP truncated (/24); consent filtering on read.
- **Security**: HMAC, API key, rate limits, strict CORS, JSON logs only.
- **Versioning**: `schema_version` carried end-to-end.
- **Observability**: structured logs with request id; basic metrics per service.
