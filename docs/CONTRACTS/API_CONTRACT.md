# API Contract

This document defines the milestone-ready API contracts for PlayPulse v1.x.

## Global Rules

- JSON only for requests and responses.
- Event and analytics payload keys use `snake_case`.
- Headers use `Title-Case`.
- All responses include a top-level `request_id`.
- All error responses use the standard envelope from `docs/ERRORS.md`.
- No stack traces or internal implementation details appear in API responses.
- No raw identifiers or PII are ever returned.
- `schema_version` is required on event payloads and ingest accepts only major version `1`.

## Visibility Model

- `POST /events` is write-only and requires either trusted HMAC credentials or a short-lived public client bearer token.
- `GET /metrics/summary`, `GET /metrics/sessions/daily`, and `GET /metrics/characters/popularity` are public-capable contracts.
- `GET /metrics/retention/cohorts` is private-only and must require authenticated consumer access.
- `GET /debug/custom-events/*` endpoints are private-only and must require authenticated consumer access.
- Public responses enforce k-anonymity and may null out suppressed numeric values while preserving structural placeholders.
- Private responses still apply consent filtering and never expose raw player identifiers.

## Ingest

### `POST /events`

Accepts an authenticated batch of telemetry events for durable storage.

#### Trusted HMAC headers

| Header | Rules |
| --- | --- |
| `X-Api-Key` | Required client key identifier |
| `X-Signature` | Required base64 HMAC-SHA256 signature |
| `X-Request-Timestamp` | Required Unix epoch seconds |
| `X-Nonce` | Required UUID v4 |
| `Content-Type` | Must be `application/json` |

HMAC signs the exact raw request body bytes using the canonical string `"{timestamp}\n{nonce}\n{raw_body}"`. The server must verify against the raw body, not re-encoded JSON.

#### Public client bearer headers

| Header | Rules |
| --- | --- |
| `Authorization` | `Bearer <short_lived_token>` returned by `POST /client-tokens` |
| `X-Request-Timestamp` | Required Unix epoch seconds |
| `X-Nonce` | Required UUID v4 |
| `Content-Type` | Must be `application/json` |

Public bearer tokens are intended for browser and native builds that cannot keep secrets. They are short-lived,
memory-only client credentials with replay protection, per-client rate limits, and server-side kill switches.

### `POST /client-tokens`

Issues short-lived public client tokens for configured browser/native game builds. This endpoint is public but must be
rate-limited and served only over HTTPS in production.

#### Request body

```json
{
  "client_id": "mythtag-web-itch-060",
  "game_id": "mythtag",
  "game_version": "0.6.0",
  "build_id": "mt060webitch",
  "platform": "pc",
  "platform_channel": "web_itch"
}
```

#### Success response

```json
{
  "data": {
    "token": "opaque-short-lived-token",
    "expires_at": "2026-04-25T13:00:00.000Z",
    "refresh_after_s": 3000
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

Token requests are rejected when the client is disabled, the build/version/channel is not allowed, the request is
malformed, or a browser origin is not allowed.

#### Request body

```json
{
  "events": [
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
  ]
}
```

#### Request rules

- `events` is required and must contain 1 to 10 events per request.
- Every event must follow the rules in `docs/EVENTS.md`.
- Core events use their strict event-specific property schemas.
- v1.1 custom events may use any non-core `snake_case` event name, max 48 chars, with flat privacy-safe custom properties.
- Request body size must be at most 1 MB.
- Events with unsupported major `schema_version` are rejected.

Custom event example:

```json
{
  "events": [
    {
      "event_id": "3cf3d980-fd78-42f5-8f09-58f1af8c184d",
      "event_name": "level_end",
      "schema_version": "1.1",
      "occurred_at": "2025-09-20T19:05:31Z",
      "session_id": "bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9",
      "player_id_hash": "c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1",
      "game_id": "mythclash",
      "game_version": "0.6.2",
      "build_id": "mc-2025.09.18",
      "platform": "pc",
      "consent_analytics": true,
      "properties": {
        "level_id": "forest_01",
        "completed": true,
        "duration_s": 180
      }
    }
  ]
}
```

#### Success response

Status: `202 Accepted`

```json
{
  "data": {
    "accepted_count": 1,
    "received_at": "2025-09-20T18:22:32Z"
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

#### Error statuses

- `400 Bad Request`
- `401 Unauthorized`
- `409 Conflict`
- `413 Payload Too Large`
- `429 Too Many Requests`
- `500 Internal Server Error`

Example:

```json
{
  "error": {
    "code": "signature_invalid",
    "message": "HMAC validation failed"
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

## Analytics

All analytics endpoints accept `game_id` with values `mythclash`, `mythtag`, or `all`. Default is `all`.

### `GET /metrics/summary`

Returns summary KPI metrics for the requested game scope.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |

#### Metric definitions

- `active_players`: unique consented `player_id_hash` values over the trailing 24 hours
- `matches_today`: consented `match_end` count for the current UTC date
- `avg_session_length_s`: arithmetic mean of consented `session_end.duration_s` over the trailing 24 hours

#### Response schema

```json
{
  "data": {
    "game_id": "all",
    "last_updated": "2025-09-20T18:25:00Z",
    "metrics": {
      "active_players": {
        "value": 184,
        "suppressed": false
      },
      "matches_today": {
        "value": 92,
        "suppressed": false
      },
      "avg_session_length_s": {
        "value": 1338,
        "suppressed": false
      }
    }
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

#### Visibility rules

- Public: any metric with fewer than 10 players behind it must set `suppressed: true` and `value: null`.
- Private: values may be returned unsuppressed for aggregate KPIs, but consent filtering still applies.

### `GET /metrics/sessions/daily`

Returns a zero-filled daily time series for sessions and supporting session metrics.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `days` | Optional. `7`, `14`, `30`. Default `14`. |

#### Response schema

```json
{
  "data": {
    "game_id": "all",
    "days": 14,
    "last_updated": "2025-09-20T18:25:00Z",
    "points": [
      {
        "metric_date": "2025-09-07",
        "session_count": 86,
        "active_players": 54,
        "avg_session_length_s": 1275,
        "suppressed": false
      },
      {
        "metric_date": "2025-09-08",
        "session_count": null,
        "active_players": null,
        "avg_session_length_s": null,
        "suppressed": true
      }
    ]
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

#### Visibility rules

- Public: zero-fill missing days; suppressed days retain their date but null out numeric values.
- Private: zero-fill missing days and return unsuppressed aggregate values.

### `GET /metrics/characters/popularity`

Returns aggregated character popularity for the requested lookback window.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `days` | Optional. `7`, `14`. Default `7`. |

#### Response schema

```json
{
  "data": {
    "game_id": "all",
    "days": 7,
    "last_updated": "2025-09-20T18:25:00Z",
    "characters": [
      {
        "character_id": "berserker",
        "pick_count": 144,
        "pick_ratio": 0.32,
        "suppressed": false
      },
      {
        "character_id": "other",
        "pick_count": null,
        "pick_ratio": 0.08,
        "suppressed": true
      }
    ]
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

#### Visibility rules

- Public: suppressed categories must be merged into `character_id = "other"`; `pick_count` is null when suppressed.
- Private: consent filtering still applies, but unsuppressed aggregate category counts may be returned.

### `GET /metrics/retention/cohorts`

Returns private retention cohorts for D1 and D7 analysis.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `weeks` | Optional. Integer `1` to `8`. Default `8`. |

#### Response schema

```json
{
  "data": {
    "game_id": "all",
    "weeks": 8,
    "last_updated": "2025-09-20T18:25:00Z",
    "cohorts": [
      {
        "cohort_date": "2025-08-04",
        "cohort_size": 42,
        "d1_retention_pct": 0.45,
        "d7_retention_pct": 0.21,
        "d1_retained": 19,
        "d7_retained": null,
        "d1_suppressed": false,
        "d7_suppressed": true
      }
    ]
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

#### Visibility rules

- This endpoint is private-only.
- Percentages may always be returned.
- If a retained count is below 10, the raw count must be null and the corresponding suppression flag must be `true`.

## Private Debug

Private debug endpoints require `Authorization: Bearer <PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN>`. They are intended for operators and BI verification, not public product dashboards. Custom debug endpoints expose only `schema_version = "1.1"` custom events. All responses exclude `player_id_hash`, raw session identifiers, raw auth data, and headers.

### `GET /debug/custom-events/names`

Returns custom event names observed over a lookback window.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `days` | Optional. Integer `1` to `30`. Default `7`. |

#### Response schema

```json
{
  "data": {
    "game_id": "all",
    "days": 7,
    "last_updated": "2025-09-20T19:25:00Z",
    "events": [
      {
        "event_name": "level_end",
        "event_count": 12,
        "first_seen": "2025-09-20T18:25:00Z",
        "last_seen": "2025-09-20T19:25:00Z"
      }
    ]
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

### `GET /debug/custom-events/counts`

Returns zero-filled daily counts for one custom event.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `event_name` | Required. Valid custom event name; core event names are rejected. |
| `days` | Optional. Integer `1` to `30`. Default `14`. |

### `GET /debug/custom-events/recent`

Returns recent custom events for private debugging.

#### Query parameters

| Parameter | Rules |
| --- | --- |
| `game_id` | Optional. `mythclash`, `mythtag`, `all`. Default `all`. |
| `event_name` | Required. Valid custom event name; core event names are rejected. |
| `limit` | Optional. Integer `1` to `100`. Default `25`. |

Recent-event responses may include `event_id`, `event_name`, `schema_version`, timestamps, game/build/platform fields, `consent_analytics`, and validated custom properties. They must not include raw player or session identifiers.

## Remaining Implementation Assumptions

- Local single-instance development may use in-memory replay and rate-limit stores. Shared multi-instance backing stores are deferred to later infrastructure phases.
