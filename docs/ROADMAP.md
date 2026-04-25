# Roadmap

## Production v1

Production v1 is a hardening release for the existing MVP telemetry loop. It is self-hostable and provider-agnostic, with the internal proof point running on the current Oracle VM, external Neon Postgres, Docker Compose, and optional Metabase companion.

Production v1 includes:

- Fixed MVP event catalog only: `session_start`, `session_end`, `match_start`, `match_end`, and `character_selected`.
- Production Dockerfiles and a portable Docker Compose template.
- Manual deploy and rollback runbooks.
- Documented secrets, backup, restore, logs, metrics, and release evidence.
- Final validation through CI, hosted smoke checks, private retention checks, and Metabase reachability when BI is deployed.

## v1.1 Custom Events

Custom events are explicitly deferred to v1.1. Do not relax ingest or SDK validation for arbitrary `event_name` in production v1.

The v1.1 custom event slice must define:

- Schema registration or allow-listing.
- Privacy-safe property validation and global limits.
- Rejection or quarantine behavior for invalid custom payloads.
- SDK ergonomics for game teams.
- Debug/query surfaces for stored custom events.
- Documentation explaining what users can and cannot send.

## Post-v1 Infrastructure

Post-v1 infrastructure work includes automated deploys, a Loki/Grafana bundle, OpenTelemetry tracing, WAF/CDN guidance, public status pages, and optional cloud infrastructure modules.
