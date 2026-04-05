# Decision Log

- 2025-09-20: Adopt JSON-only + error envelope format (final).
- 2025-09-20: Defer event schemas and SQL until Ingest MVP.
- 2025-09-20: Ratified RFC-001 PRD covering problem statement, user targeting, scope, success metrics, and risks.
- 2025-09-20: Selected MythClash and MythTag (Capivarious) as pilot titles for demo data and workflow validation.
- 2025-09-21: Drafted RFC-002 telemetry event candidates for Ingest MVP (pending review).
- 2025-09-21: Ratified RFC-003 ingest security posture (auth headers, replay window, rate limits, logging).
- 2025-09-21: Ratified RFC-004 throughput assumptions, SLOs, and rate limit math for ingest MVP.
- 2025-09-21: Ratified RFC-005 observability metrics, alerts, and logging schema for ingest MVP.
- 2025-09-21: Ratified RFC-006 dashboard IA, initial charts, and k-anonymity UX for MVP.
- 2025-09-21: Ratified RFC-007 Godot SDK surface, queue strategy, and reliability guarantees for MVP.
- 2025-09-21: Ratified RFC-008 storage model plan (events_raw partitions, derived views, refresh cadence).
- 2025-09-21: Ratified RFC-009 environment definitions, release process, and incident runbooks for MVP.
- 2026-04-05: Finalized the MVP event contract to the five PRD events only (`session_start`, `session_end`, `match_start`, `match_end`, `character_selected`); `tutorial_step_completed` is deferred.
- 2026-04-05: Finalized the first analytics contracts to include a dedicated KPI summary endpoint plus sessions/day, character popularity, and retention cohorts.
- 2026-04-05: Locked MVP `schema_version` acceptance to major version `1` only, starting at `1.0`.
- 2026-04-05: Moved custom event registration and quarantine flow to post-MVP scope.
