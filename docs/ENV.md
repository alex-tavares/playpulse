# Environment Configuration (Placeholders)

Set these variables in deployment environments to align with RFC-003 and RFC-004 targets. Values shown are defaults derived from current assumptions; adjust only with corresponding RFC updates.

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

> NOTE: update these values via infrastructure configuration; code should read from environment with documented defaults.
