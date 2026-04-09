# Environment Configuration

Set these variables in deployment environments to align with RFC-003 and RFC-004 targets. Values shown are the current documented defaults used by the shared config package plus the ingest, analytics, and warehouse flows in the core PlayPulse repo.

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
| `PLAYPULSE_ANALYTICS_PORT` | `4002` | Bind port for the analytics API service. |
| `PLAYPULSE_ANALYTICS_HOST` | `0.0.0.0` | Bind host for the analytics API service. |
| `PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list for analytics requests. |
| `PLAYPULSE_ANALYTICS_TRUST_PROXY` | `false` | Whether analytics should trust proxy forwarding headers when resolving client IPs. |
| `PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN` | `playpulse-local-private-token` | Temporary bearer token used to protect private retention reads before a consumer-specific auth layer exists. |

Companion repos own additional configuration:
- BI and Metabase-specific variables now live in [alex-tavares/playpulse-bi](https://github.com/alex-tavares/playpulse-bi).
- Game-specific example and validation variables now live in [alex-tavares/playpulse-examples](https://github.com/alex-tavares/playpulse-examples).

> NOTE: update these values via infrastructure configuration; code should read from environment with documented defaults.
