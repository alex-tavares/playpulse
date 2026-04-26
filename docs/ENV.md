# Environment Configuration

Set these variables in deployment environments to align with RFC-003 and RFC-004 targets. Values shown are the current documented defaults used by the shared config package plus the ingest, analytics, and warehouse flows in the core PlayPulse repo.

Use `.env.example` for local development defaults and `.env.production.example` as the production template. Real production values must live in a host-local `.env.production`, vault, or platform secret manager and must never be committed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PLAYPULSE_INGEST_SLO_P95_MS` | `500` | Ingest p95 latency objective (ms). |
| `PLAYPULSE_INGEST_SLO_P99_MS` | `900` | Ingest p99 latency objective (ms). |
| `PLAYPULSE_ANALYTICS_SLO_P95_MS` | `300` | Analytics API p95 latency objective (ms). |
| `PLAYPULSE_ANALYTICS_SLO_P99_MS` | `600` | Analytics API p99 latency objective (ms). |
| `PLAYPULSE_INGEST_AVAILABILITY_TARGET` | `99.5` | Monthly availability target (%) for ingest. |
| `PLAYPULSE_ANALYTICS_AVAILABILITY_TARGET` | `99.9` | Monthly availability target (%) for analytics read APIs. |
| `PLAYPULSE_DATA_FRESHNESS_TARGET_MIN` | `15` | Maximum allowed data staleness (minutes). |
| `PLAYPULSE_RATE_LIMIT_PER_KEY` | `600` | Sustained requests/minute per API key. |
| `PLAYPULSE_RATE_LIMIT_PER_KEY_BURST` | `1200` | Burst requests/minute per API key. |
| `PLAYPULSE_RATE_LIMIT_PER_IP` | `120` | Sustained requests/minute per IP. |
| `PLAYPULSE_RATE_LIMIT_PER_IP_BURST` | `240` | Burst requests/minute per IP. |
| `PLAYPULSE_REPLAY_WINDOW_SECONDS` | `300` | Replay protection window (seconds). |
| `PLAYPULSE_STORAGE_RETENTION_DAYS` | `90` | Raw events retention horizon before archival. |
| `PLAYPULSE_DATABASE_URL` | `postgresql://playpulse:playpulse@localhost:5432/playpulse` | Default service database connection for local and hosted backend work. |
| `PLAYPULSE_INGEST_PORT` | `4001` | Bind port for the ingest service. |
| `PLAYPULSE_INGEST_HOST` | `0.0.0.0` | Bind host for the ingest service. |
| `PLAYPULSE_INGEST_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for ingest requests. |
| `PLAYPULSE_INGEST_TRUST_PROXY` | `false` | Whether ingest should trust proxy forwarding headers when resolving client IPs. |
| `PLAYPULSE_INGEST_API_KEYS_JSON` | `[]` | JSON array of enabled ingest credentials shaped as `{ "key_id", "signing_secret", "game_id", "enabled" }`. |
| `PLAYPULSE_INGEST_AUTH_MODES` | `hmac` | Comma-separated enabled ingest auth modes. Use `hmac,bearer_token` to enable public client tokens. |
| `PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET` | unset | Strong server-only secret used to sign short-lived public client tokens. Required when `bearer_token` is enabled. |
| `PLAYPULSE_INGEST_PUBLIC_CLIENTS_JSON` | `[]` | JSON array of public client configs with `client_id`, `game_id`, `platform_channel`, allowed builds/versions/origins, TTL, and optional rate limits. |
| `PLAYPULSE_ANALYTICS_PORT` | `4002` | Bind port for the analytics API service. |
| `PLAYPULSE_ANALYTICS_HOST` | `0.0.0.0` | Bind host for the analytics API service. |
| `PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for analytics requests. |
| `PLAYPULSE_ANALYTICS_TRUST_PROXY` | `false` | Whether analytics should trust proxy forwarding headers when resolving client IPs. |
| `PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN` | `playpulse-local-private-token` | Temporary bearer token used to protect private retention reads before a consumer-specific auth layer exists. |

## Smoke Check Variables

These variables are read by `pnpm smoke` and do not change service runtime behavior.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PLAYPULSE_SMOKE_INGEST_BASE_URL` | `http://localhost:4001` | Base URL for ingest health and metrics checks. |
| `PLAYPULSE_SMOKE_ANALYTICS_BASE_URL` | `http://localhost:4002` | Base URL for analytics health, metrics, and public analytics checks. |
| `PLAYPULSE_SMOKE_ANALYTICS_PRIVATE_BEARER_TOKEN` | unset | Optional token for private retention smoke checks; falls back to `PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN` when unset. |
| `PLAYPULSE_SMOKE_METABASE_BASE_URL` | unset | Optional Metabase base URL for companion BI reachability checks. |

Companion repos own additional configuration:
- BI and Metabase-specific variables now live in [alex-tavares/playpulse-bi](https://github.com/alex-tavares/playpulse-bi).
- Game-specific example and validation variables now live in [alex-tavares/playpulse-examples](https://github.com/alex-tavares/playpulse-examples).

> NOTE: update these values via infrastructure configuration; code should read from environment with documented defaults.

## Production Compose

`compose.prod.yaml` reads runtime values from `.env.production` and builds the three production services from repo Dockerfiles:

- `ingest` exposes `4001`.
- `analytics-api` exposes `4002`.
- `warehouse-worker` runs under the `jobs` profile for refresh and seed operations.

The production template expects an external Postgres-compatible database through `PLAYPULSE_DATABASE_URL`. It does not start a database container.

## Public Client Auth

Public web/native game builds must use `auth_mode = "public_client"` and fetch short-lived bearer tokens from
`POST /client-tokens`; they must not ship `api_key` or `signing_secret`. HMAC credentials remain for trusted/internal
builds only. Public client configs are kill-switchable by setting `enabled` to `false` for the affected `client_id`.
