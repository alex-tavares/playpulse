# Event Dictionary

This document defines the normative telemetry contract for PlayPulse. It is the source of truth for shared schemas and for the ingest request contract.

## Shared Envelope

All events emitted by the SDK and accepted by ingest must use the same envelope:

| Field | Type | Rules |
| --- | --- | --- |
| `event_id` | UUID v4 | Required. Generated client-side per event. |
| `event_name` | string | Required. `snake_case`, max 48 chars. |
| `schema_version` | string | Required. `major.minor`, starting at `1.0`. |
| `occurred_at` | ISO8601 string | Required. UTC timestamp. |
| `session_id` | UUID v4 | Required. Stable during a session. |
| `player_id_hash` | 64-char hex string | Required. Salted SHA-256 hash; never raw IDs. |
| `game_id` | enum | Required. `mythclash`, `mythtag`. |
| `game_version` | semver string | Required. Example: `0.6.2`. |
| `build_id` | string | Required. Max 16 chars. |
| `platform` | enum | Required. `pc`, `mac`, `linux`. |
| `locale` | string | Optional. IETF BCP 47 tag, max 8 chars. |
| `consent_analytics` | boolean | Required. Stored end-to-end. |
| `properties` | object | Required. Event-specific payload. |

## Global Limits

- Envelope plus `properties` must stay under 2 KB per event.
- `properties` must stay under 1.5 KB uncompressed.
- Core-event arrays may contain at most 10 elements unless a field-specific rule is stricter.
- Core-event strings are capped at 64 characters unless a field-specific rule is stricter.
- Numeric values are integers unless a field explicitly allows decimals.
- Payloads must not contain free-text PII such as names, emails, chat text, addresses, or raw identifiers.
- Event names and property keys use `snake_case`.

## Schema Version Policy

- MVP starts at `schema_version = 1.0`.
- Additive changes bump the minor version (`1.x`).
- Breaking changes bump the major version.
- Ingest accepts only major version `1` during v1.x.
- Unsupported major versions are rejected with `unsupported_schema_version` and logged.
- Core SDK events continue to emit `schema_version = 1.0`.
- Custom SDK events emit `schema_version = 1.1`.

## MVP Events

### `session_start`

Purpose: record when a player launches or resumes the game.

Required properties:

| Field | Type | Rules |
| --- | --- | --- |
| `launch_reason` | enum | `fresh_launch`, `resume`, `hot_reload` |
| `connection_mode` | enum | `online`, `offline` |
| `timezone_offset_min` | integer | Range `-720` to `840` |

Example:

```json
{
  "event_id": "7f4c9e4d-5f3c-4e51-9dc8-6e0a9f0c1234",
  "event_name": "session_start",
  "schema_version": "1.0",
  "occurred_at": "2025-09-20T18:22:31Z",
  "session_id": "bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9",
  "player_id_hash": "c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1",
  "game_id": "mythclash",
  "game_version": "0.6.2",
  "build_id": "mc-2025.09.18",
  "platform": "pc",
  "locale": "en-US",
  "consent_analytics": true,
  "properties": {
    "launch_reason": "fresh_launch",
    "connection_mode": "online",
    "timezone_offset_min": -240
  }
}
```

### `session_end`

Purpose: capture how and when a player exits.

Required properties:

| Field | Type | Rules |
| --- | --- | --- |
| `duration_s` | integer | Range `0` to `86400` |
| `exit_reason` | enum | `user_exit`, `disconnect`, `crash`, `idle_timeout` |
| `xp_earned` | integer | Range `0` to `1000` |

Example:

```json
{
  "event_id": "9af4ad3e-e71d-4a10-8ec4-0f65b0338d7c",
  "event_name": "session_end",
  "schema_version": "1.0",
  "occurred_at": "2025-09-20T18:57:31Z",
  "session_id": "bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9",
  "player_id_hash": "c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1",
  "game_id": "mythclash",
  "game_version": "0.6.2",
  "build_id": "mc-2025.09.18",
  "platform": "pc",
  "locale": "en-US",
  "consent_analytics": true,
  "properties": {
    "duration_s": 2100,
    "exit_reason": "user_exit",
    "xp_earned": 320
  }
}
```

### `match_start`

Purpose: mark the beginning of a discrete match or battle instance.

Required properties:

| Field | Type | Rules |
| --- | --- | --- |
| `match_id` | UUID v4 | Client-generated per match |
| `mode_id` | string | Max 32 chars |
| `map_id` | string | Max 32 chars |
| `team_size` | integer | Range `1` to `5` |
| `party_size` | integer | Range `1` to `4` |
| `mmr_bucket` | enum | `bronze`, `silver`, `gold`, `diamond` |

Example:

```json
{
  "event_id": "d5f6e7ea-d775-4f64-9eaf-432f3dcb4a73",
  "event_name": "match_start",
  "schema_version": "1.0",
  "occurred_at": "2025-09-20T18:30:05Z",
  "session_id": "ea0bc3d2-57f2-4da3-9881-431f2e2ad87f",
  "player_id_hash": "5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734",
  "game_id": "mythtag",
  "game_version": "0.3.0",
  "build_id": "mt-2025.09.19",
  "platform": "pc",
  "locale": "pt-BR",
  "consent_analytics": true,
  "properties": {
    "match_id": "2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1",
    "mode_id": "arena_ranked",
    "map_id": "obsidian_gate",
    "team_size": 3,
    "party_size": 2,
    "mmr_bucket": "gold"
  }
}
```

### `match_end`

Purpose: close out match analytics and tie outcomes back to the started match.

Required properties:

| Field | Type | Rules |
| --- | --- | --- |
| `match_id` | UUID v4 | Must match the corresponding `match_start` |
| `duration_s` | integer | Range `0` to `7200` |
| `result` | enum | `win`, `loss`, `draw`, `abandon` |
| `character_id` | string | Max 32 chars |
| `score` | integer | Range `0` to `100000` |
| `damage_dealt` | integer | Range `0` to `500000` |

Example:

```json
{
  "event_id": "1490f7d1-7772-4b51-a5f2-0e03ee9d83ce",
  "event_name": "match_end",
  "schema_version": "1.0",
  "occurred_at": "2025-09-20T18:47:05Z",
  "session_id": "ea0bc3d2-57f2-4da3-9881-431f2e2ad87f",
  "player_id_hash": "5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734",
  "game_id": "mythtag",
  "game_version": "0.3.0",
  "build_id": "mt-2025.09.19",
  "platform": "pc",
  "locale": "pt-BR",
  "consent_analytics": true,
  "properties": {
    "match_id": "2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1",
    "duration_s": 815,
    "result": "win",
    "character_id": "berserker",
    "score": 3420,
    "damage_dealt": 18750
  }
}
```

### `character_selected`

Purpose: understand roster balance and loadout preferences.

Required properties:

| Field | Type | Rules |
| --- | --- | --- |
| `selection_context` | enum | `match_lobby`, `armory`, `tutorial` |
| `character_id` | string | Max 32 chars |
| `is_random` | boolean | Required |

Optional properties:

| Field | Type | Rules |
| --- | --- | --- |
| `loadout_id` | string | Optional, max 32 chars |
| `perk_ids` | array<string> | Optional, max 5 entries, each max 32 chars |

Example:

```json
{
  "event_id": "58c06d48-d11b-4ab4-bf57-76f19855d85e",
  "event_name": "character_selected",
  "schema_version": "1.0",
  "occurred_at": "2025-09-20T18:28:15Z",
  "session_id": "ea0bc3d2-57f2-4da3-9881-431f2e2ad87f",
  "player_id_hash": "5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734",
  "game_id": "mythtag",
  "game_version": "0.3.0",
  "build_id": "mt-2025.09.19",
  "platform": "pc",
  "locale": "pt-BR",
  "consent_analytics": true,
  "properties": {
    "selection_context": "match_lobby",
    "character_id": "berserker",
    "loadout_id": "starter_burst",
    "perk_ids": ["quick_step", "iron_will"],
    "is_random": false
  }
}
```

## Custom Events v1.1

Game teams may send custom events without pre-registration by calling `track("level_end", {...})`. Custom events are stored in `events_raw.props_jsonb`, are visible through private debug APIs, and are available to BI/raw SQL consumers. Public analytics endpoints do not expose custom-event reporting in v1.1.

### Event name rules

- Must be `snake_case`, max 48 characters.
- Must not use a reserved core event name: `session_start`, `session_end`, `match_start`, `match_end`, or `character_selected`.
- Recommended examples: `level_end`, `item_crafted`, `quest_started`.

### Property rules

- Properties must be a flat object with at most 25 keys.
- Property keys must be `snake_case`.
- Values may be strings, finite numbers, booleans, or arrays of those primitives.
- Objects, `null`, nested arrays, and unsupported JSON values are rejected.
- String values must be privacy-safe and at most 128 characters; email-like strings, bearer/JWT-like tokens, and long free-text blobs are rejected.
- The existing byte caps still apply: 2 KB per event and 1.5 KB for `properties`.
- Envelope identifiers such as `session_id` and `player_id_hash` are allowed only in the controlled event envelope, not in custom `properties`.
- Identifier, auth, contact, and free-text property keys are rejected, including `session_id`, `player_id`, `player_id_hash`, `user_id`, `account_id`, `device_id`, `email`, `email_address`, `phone`, `player_name`, `chat`, `message`, `token`, `secret`, `password`, `api_key`, `auth_token`, `access_token`, `refresh_token`, `jwt`, and `cookie`.
- Gameplay identifiers remain valid, including `level_id`, `item_id`, `quest_id`, `match_id`, `map_id`, `mode_id`, `character_id`, `build_id`, and `loadout_id`.

Nested gameplay state must be flattened before sending:

```json
{
  "event_name": "level_end",
  "schema_version": "1.1",
  "properties": {
    "level_id": "forest_01",
    "completed": true,
    "duration_s": 180,
    "reward_ids": ["coin", "gem"]
  }
}
```

Do not send:

```json
{
  "event_name": "level_end",
  "schema_version": "1.1",
  "properties": {
    "level": {
      "id": "forest_01"
    },
    "email": "player@example.com"
  }
}
```

## Non-MVP / Deferred

These event families are explicitly out of the v1.1 contract and must not be treated as required by implementation work:

- `tutorial_step_completed`
- performance sampling events
- structured error events
- monetization or store events
- public custom-event analytics
- schema registry, event allow-listing, or quarantine tables
