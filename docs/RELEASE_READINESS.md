# MVP Release Readiness

This note captures the MVP wrap-up state before final human release approval. The MVP tag has not been created.

## Completed

- Core telemetry loop is implemented: Godot SDK, ingest, Postgres warehouse, analytics API, and companion BI integration.
- Ingest and analytics expose privacy-safe Prometheus text metrics at `GET /metrics`.
- HTTP services accept sanitized `X-Request-Id`, return `X-Request-Id`, and log `trace_id` equal to `request_id` for MVP trace correlation.
- Warehouse refresh commands emit `duration_ms` and `refreshed_at` fields in their JSON output.
- `pnpm smoke` validates ingest health, analytics health, public analytics, service metrics, optional private retention, and optional Metabase reachability.
- Hosted Oracle/Neon demo data has been seeded and refreshed for MythClash and MythTag.
- Production Dockerfiles, a provider-neutral `compose.prod.yaml`, environment examples, and manual production runbooks are documented for the initial production version.
- v1.1 custom events are implemented with open event names, privacy-safe property guardrails, aggregate ingest metrics, SDK support, and private debug APIs.

## Verification Evidence

Last local verification: 2026-04-24.

- `pnpm lint` passed.
- `pnpm -r --if-present run typecheck` passed.
- `PLAYPULSE_DATABASE_URL=postgresql://playpulse:playpulse@localhost:5432/playpulse pnpm test` passed with 19 test files and 84 tests.
- Hosted smoke passed against `http://163.176.215.39:4001`, `http://163.176.215.39:4002`, and `http://163.176.215.39:3001`.
- Hosted private retention returned cohort data using the deployed private bearer token.
- Hosted warehouse worker `refresh:rolling` emitted `duration_ms` and `refreshed_at`.

## Final Approval Gates

- CI must be green for the release branch or final PR.
- Branch protection and required checks must be confirmed in GitHub before tagging.
- Secrets, backups, and retention operations must be confirmed against the deployment environment.
- The internal production host must run a tagged commit or approved release commit, with hosted smoke evidence recorded.

## Deferred Beyond MVP

- Custom event schema registration, allow-listing, quarantine tables, and public custom analytics remain deferred beyond the v1.1 raw/debug slice.
- Full OpenTelemetry tracing, Jaeger, alert routing, WAF/CDN, backup automation, public status pages, C# bindings, additional Godot export targets, and richer analytics remain post-v1.
