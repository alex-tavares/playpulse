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

v1.1 adds GA-style custom event support without pre-registration. Game teams can call `track("level_end", {...})` with any non-core `snake_case` event name while PlayPulse enforces global privacy-safe guardrails.

v1.1 includes:

- Shared schema validation for core events plus open custom events.
- Rejection, not quarantine, for invalid custom payloads.
- Godot SDK support through the existing `track(event_name, props)` method.
- Raw custom-event persistence in `events_raw.props_jsonb`.
- Aggregate ingest custom-event accepted/rejected metrics without event-name labels.
- Private analytics debug endpoints for names, daily counts, and recent events.

v1.1 intentionally does not include public custom analytics, a schema registry, event allow-listing, or quarantine tables.

## Post-v1 Infrastructure

Post-v1 infrastructure work includes automated deploys, a Loki/Grafana bundle, OpenTelemetry tracing, WAF/CDN guidance, public status pages, and optional cloud infrastructure modules.
