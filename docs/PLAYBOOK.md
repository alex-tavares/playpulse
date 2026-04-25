# Dev Playbook

## Branches & commits
- Default: `main`. Feature branches: `feat/<area>-<slug>`.
- Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`).

## PR checklist
- Tests, typecheck, lint, docs, screenshots (if relevant to an optional consumer UI).

## Local dev
- `docker compose up -d` for Postgres
- `pnpm dev` to start apps

## Deployment Checklist
- [ ] Merge PR with 2 approvals and green CI
- [ ] Confirm production `.env.production` exists on the host and contains no placeholder secrets
- [ ] Build production images with `docker compose -f compose.prod.yaml build ingest analytics-api warehouse-worker`
- [ ] Run `prisma migrate deploy` from the production image
- [ ] Start `ingest` and `analytics-api`, then run the `warehouse-worker` job profile
- [ ] Verify staging deploy (ingest health, analytics health, warehouse refresh)
- [ ] Run `pnpm smoke` against staging with ingest, analytics, private retention, and optional Metabase URLs configured
- [ ] Confirm `/metrics` responds for ingest and analytics through the intended protected network path
- [ ] Capture deployed commit SHA, smoke output, and container status as release evidence
- [ ] Tag release (`vYY.MM.DD`) and confirm prod deploy
- [ ] Monitor alerts for 30 minutes post-release

## Staging Smoke Checklist
- [ ] `pnpm db:migrate` reports no pending migrations or applies the expected migration set
- [ ] `pnpm db:seed-demo` and `pnpm db:refresh` complete successfully for sanitized demo data
- [ ] Ingest `/health` returns `status=ok`
- [ ] Analytics `/health` returns `status=ok`
- [ ] Public analytics summary, sessions, and character popularity return non-empty MVP-shaped responses
- [ ] Private retention returns cohorts only when the bearer token is supplied
- [ ] Ingest and analytics `/metrics` include request counters and duration histograms without raw identifiers
- [ ] Metabase companion setup can reach the warehouse when included in the environment

## Incident: Ingest Degradation
- [ ] Acknowledge alert within 5 minutes
- [ ] Check rate-limit hits, queue backlog, DB metrics
- [ ] Scale ingest pods or throttle custom events if needed
- [ ] Update #ops channel every 15 minutes
- [ ] File RCA + follow-up tasks after resolution

## Incident: Security Breach / Key Leak
- [ ] Revoke impacted API keys immediately
- [ ] Rotate signing/secret keys within 30 minutes
- [ ] Notify stakeholders (internal + pilot studios)
- [ ] Review access logs, preserve evidence
- [ ] Complete RCA within 24 hours

## Incident: Database Outage / Restore
- [ ] Attempt failover to replica if available
- [ ] Restore latest snapshot and apply WAL
- [ ] Run smoke tests (ingest, analytics queries)
- [ ] Re-enable ingest and monitor backlog
- [ ] Document incident + remediation

## Production Rollback Checklist
- [ ] Identify the last known good release tag or commit
- [ ] Redeploy that revision with `compose.prod.yaml`
- [ ] Do not manually reverse database migrations
- [ ] Run warehouse refresh and hosted smoke checks
- [ ] Preserve failing release logs and validation output for the incident note

## Secrets Rotation Checklist
- [ ] Schedule rotation window and notify team
- [ ] Update secret in vault/manager
- [ ] Redeploy services consuming secret
- [ ] Verify health checks/logs
- [ ] Record rotation in ops log

## Backup Verification Checklist
- [ ] Quarterly restore from snapshot to temp instance
- [ ] Validate key queries on restored DB
- [ ] Document results and adjust runbook if needed
