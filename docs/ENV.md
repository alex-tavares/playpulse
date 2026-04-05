# Environment Configuration

Set these variables in deployment environments to align with RFC-003 and RFC-004 targets. Values shown are the current documented defaults used by the shared config package plus the ingest, analytics, warehouse, and dashboard app configs; adjust them only with the corresponding docs or RFC updates.

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
| `PLAYPULSE_DATABASE_URL` | `postgresql://playpulse:playpulse@localhost:5432/playpulse` | Local and default service database connection for future backend phases. |
| `PLAYPULSE_METABASE_PORT` | `3001` | Local HTTP port for the Metabase UI. |
| `PLAYPULSE_METABASE_BASE_URL` | `http://localhost:3001` | Local base URL used by the Metabase bootstrap script. |
| `PLAYPULSE_METABASE_SITE_NAME` | `PlayPulse Internal BI` | Site name applied during first-time Metabase setup. |
| `PLAYPULSE_METABASE_ADMIN_EMAIL` | `admin@playpulse.local` | Local Metabase admin email used by the bootstrap script. |
| `PLAYPULSE_METABASE_ADMIN_PASSWORD` | `playpulse-metabase-admin-2026!` | Local Metabase admin password used by the bootstrap script. |
| `PLAYPULSE_METABASE_POSTGRES_HOST` | `host.docker.internal` | Hostname Metabase uses to connect back to the local Postgres instance. |
| `PLAYPULSE_METABASE_POSTGRES_PORT` | `5432` | Postgres port used by Metabase database connections. |
| `PLAYPULSE_METABASE_POSTGRES_DB` | `playpulse` | Postgres database name used by Metabase database connections. |
| `PLAYPULSE_BI_READER_USER` | `playpulse_bi_reader` | Read-only Postgres user for the warehouse-first Metabase connection. |
| `PLAYPULSE_BI_READER_PASSWORD` | `playpulse_bi_reader` | Password for `PLAYPULSE_BI_READER_USER`. |
| `PLAYPULSE_BI_DEBUG_READER_USER` | `playpulse_bi_debug_reader` | Read-only Postgres user for the debug/raw-events Metabase connection. |
| `PLAYPULSE_BI_DEBUG_READER_PASSWORD` | `playpulse_bi_debug_reader` | Password for `PLAYPULSE_BI_DEBUG_READER_USER`. |
| `PLAYPULSE_INGEST_PORT` | `4001` | Bind port for the ingest service. |
| `PLAYPULSE_INGEST_HOST` | `0.0.0.0` | Bind host for the ingest service. |
| `PLAYPULSE_INGEST_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for ingest requests. |
| `PLAYPULSE_INGEST_TRUST_PROXY` | `false` | Whether ingest should trust proxy forwarding headers when resolving client IPs. |
| `PLAYPULSE_INGEST_API_KEYS_JSON` | `[]` | JSON array of enabled ingest credentials shaped as `{ "key_id", "signing_secret", "game_id", "enabled" }`. |
| `PLAYPULSE_ANALYTICS_PORT` | `4002` | Bind port for the analytics API service. |
| `PLAYPULSE_ANALYTICS_HOST` | `0.0.0.0` | Bind host for the analytics API service. |
| `PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for analytics requests. |
| `PLAYPULSE_ANALYTICS_TRUST_PROXY` | `false` | Whether analytics should trust proxy forwarding headers when resolving client IPs. |
| `PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN` | `playpulse-local-private-token` | Temporary bearer token used to protect private retention reads before dashboard auth exists. |
| `PLAYPULSE_DASHBOARD_ANALYTICS_BASE_URL` | `http://localhost:4002` | Server-only base URL the Next.js dashboard uses to query the analytics API. |
| `PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE` | `playpulse-demo-access` | Demo access code used by the dashboard sign-in form to mint an HttpOnly private-insights session. |
| `PLAYPULSE_DASHBOARD_PRIVATE_API_BEARER_TOKEN` | `playpulse-local-private-token` | Server-only bearer token the dashboard uses when calling the private retention endpoint. |
| `PLAYPULSE_GODOT_INGEST_BASE_URL` | `http://127.0.0.1:4001` | Base URL the Godot SDK uses for `POST /events` during local validation flows. Use `127.0.0.1` for Windows Godot against WSL-hosted ingest to avoid `localhost` resolution issues. |
| `PLAYPULSE_GODOT_API_KEY` | `mythtag-local-key` | Local validation API key used by the MythTag bridge and sample Godot startup flow. |
| `PLAYPULSE_GODOT_SIGNING_SECRET` | `mythtag-local-secret` | Local validation signing secret paired with `PLAYPULSE_GODOT_API_KEY`. |
| `PLAYPULSE_GODOT_PLAYER_SEED` | Derived from OS/device info | Optional explicit player seed override for Godot validation runs. |
| `PLAYPULSE_GODOT_BUILD_ID` | `mythtag-local` | Optional build identifier override for the local MythTag validation bridge. |
| `PLAYPULSE_MYTHTAG_SMOKE_TEST` | `0` | Enables the bridge's synthetic console smoke flow when set to `1`. |

> NOTE: update these values via infrastructure configuration; code should read from environment with documented defaults.
