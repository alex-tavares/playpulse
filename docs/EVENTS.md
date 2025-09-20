# Event Dictionary — TBD

We will define the telemetry contract incrementally. For now, keep **principles**:

## Envelope (principles, not final)
- Each event includes: `event_id`, `event_name`, `ts`, `session_id`, `player_id_hash` (salted), `game_version`, `platform`, `consent_analytics`, optional locale/country.
- **No free-text PII**. Props are bounded and typed (numbers/ids/enums).

## Naming & Conventions
- `event_name` in `snake_case`.
- `props` are minimal; prefer enums/ids to strings.
- Additive changes bump **minor**; breaking changes bump **major** (`schema_version`).

## Initial candidate events (not final)
- `session_start`, `session_end`
- `match_start`, `match_end`
- `character_selected`
- (Performance/errors will be specified later)

A formal spec (Zod/OpenAPI) will be generated during the **Ingest MVP** milestone.
