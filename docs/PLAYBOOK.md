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
- [ ] Verify staging deploy (ingest health, analytics health, warehouse refresh)
- [ ] Tag release (`vYY.MM.DD`) and confirm prod deploy
- [ ] Monitor alerts for 30 minutes post-release

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
