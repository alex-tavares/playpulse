# Production Operations

This guide defines the initial production v1 operating model for PlayPulse. The core repo stays provider-agnostic; the internal production proof currently runs on an Oracle VM with external Neon Postgres and optional Metabase from the companion BI repo.

## Production Stack

- Build images from the repo Dockerfiles for `ingest`, `analytics-api`, and `warehouse-worker`.
- Use `compose.prod.yaml` with an external Postgres database supplied by `PLAYPULSE_DATABASE_URL`.
- Keep real secrets in a host-local `.env.production` file, vault, or platform secret manager. Use `.env.production.example` only as a template.
- Expose ingest on `4001` and analytics on `4002`; protect `/metrics` through firewall, reverse proxy, or private network policy.
- Keep custom events out of v1. Production v1 accepts only `session_start`, `session_end`, `match_start`, `match_end`, and `character_selected`.

## Manual Deploy Runbook

Run from the deployment host:

```bash
cd /opt/playpulse
git fetch --tags origin
git checkout <release-tag-or-commit>
git status --short
cp .env.production.example .env.production # first deploy only; replace placeholders before continuing
docker compose -f compose.prod.yaml build ingest analytics-api warehouse-worker
docker compose -f compose.prod.yaml run --rm ingest corepack pnpm exec prisma migrate deploy --schema prisma/schema.prisma
docker compose -f compose.prod.yaml up -d ingest analytics-api
docker compose -f compose.prod.yaml --profile jobs run --rm warehouse-worker
```

Capture the deployed commit and container state:

```bash
git rev-parse --short HEAD
docker compose -f compose.prod.yaml ps
```

Run smoke checks from a trusted workstation:

```bash
PLAYPULSE_SMOKE_INGEST_BASE_URL=http://YOUR_HOST:4001 \
PLAYPULSE_SMOKE_ANALYTICS_BASE_URL=http://YOUR_HOST:4002 \
PLAYPULSE_SMOKE_ANALYTICS_PRIVATE_BEARER_TOKEN=REDACTED \
pnpm smoke
```

If Metabase is part of the environment, also set `PLAYPULSE_SMOKE_METABASE_BASE_URL`.

## Rollback Runbook

Rollback is a redeploy of the last known good release. Do not roll database migrations backward manually.

```bash
cd /opt/playpulse
git fetch --tags origin
git checkout <last-known-good-tag-or-commit>
docker compose -f compose.prod.yaml build ingest analytics-api warehouse-worker
docker compose -f compose.prod.yaml up -d ingest analytics-api
docker compose -f compose.prod.yaml --profile jobs run --rm warehouse-worker
```

After rollback, rerun smoke checks and preserve the failing release commit, logs, and smoke output for the incident note.

## Logs And Metrics

Services write privacy-safe structured JSON logs to stdout. Inspect logs with Docker Compose:

```bash
docker compose -f compose.prod.yaml logs -f --tail=100 ingest analytics-api
docker compose -f compose.prod.yaml logs --since=1h ingest analytics-api | grep "REQUEST_ID"
```

Prometheus can scrape:

```yaml
scrape_configs:
  - job_name: playpulse-ingest
    metrics_path: /metrics
    static_configs:
      - targets: ['YOUR_HOST:4001']
  - job_name: playpulse-analytics
    metrics_path: /metrics
    static_configs:
      - targets: ['YOUR_HOST:4002']
```

Baseline alert conditions for v1:

- Ingest 5xx ratio above 1% for 5 minutes.
- Analytics 5xx ratio above 0.5% for 10 minutes.
- Ingest p95 latency above 750 ms for 10 minutes.
- Analytics p95 latency above 600 ms for 10 minutes.
- Rate-limit hits spike unexpectedly for one key or IP prefix.
- Warehouse refresh is older than `PLAYPULSE_DATA_FRESHNESS_TARGET_MIN`.

Loki/Grafana, OpenTelemetry tracing, public status pages, WAF/CDN, and automated deploys are post-v1 work.

## Secrets And Rotation

Required production secrets:

- `PLAYPULSE_DATABASE_URL`
- `PLAYPULSE_INGEST_API_KEYS_JSON`
- `PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN`
- Companion BI credentials when Metabase is deployed

Standard rotation cadence is 90 days for service secrets and 30 days for ingest signing keys. Emergency rotation target is 30 minutes from confirmed leak: revoke the impacted key, generate a replacement, update the secret source, restart affected services, and verify health plus smoke checks.

## Backup And Restore

Production requires encrypted Postgres snapshots or dumps with restore instructions before release approval. For provider-neutral deployments, keep at least 7 daily, 4 weekly, and 3 monthly backups.

Restore drill outline:

1. Restore the latest snapshot into a temporary database.
2. Run migrations with `prisma migrate deploy`.
3. Point a temporary PlayPulse stack at the restored database.
4. Run warehouse refresh and smoke checks.
5. Record restore duration, source backup, target database, and validation result.

For the internal Neon environment, use Neon branch/snapshot restore capabilities and record the branch or restore point used as production evidence.
