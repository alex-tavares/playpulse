# API Contract

This document defines the milestone-ready API contracts for the PlayPulse MVP.

## Global Rules

- JSON only for requests and responses.
- Event and analytics payload keys use `snake_case`.
- Headers use `Title-Case`.
- All responses include a top-level `request_id`.
- All error responses use the standard envelope from `docs/ERRORS.md`.
- No stack traces or internal implementation details appear in API responses.
- No raw identifiers or PII are ever returned.
- `schema_version` is required on event payloads and MVP ingest accepts only major version `1`.

## Visibility Model

- `POST /events` is write-only and requires signed client credentials.
- `GET /metrics/summary`, `GET /metrics/sessions/daily`, and `GET /metrics/characters/popularity` are public-capable contracts.
- `GET /metrics/retention/cohorts` is private-only and must require authenticated dashboard access.
- Public responses enforce k-anonymity and may null out suppressed numeric values while preserving structural placeholders.
- Private responses still apply consent filtering and never expose raw player identifiers.

## Ingest

### `POST /events`

Accepts a signed batch of telemetry events for durable storage.

#### Required headers

| Header | Rules |
| --- | --- |
| `X-Api-Key` | Required client key identifier |
| `X-Signature` | Required base64 HMAC-SHA256 signature |
| `X-Request-Timestamp` | Required Unix epoch seconds |
| `X-Nonce` | Required UUID v4 |
| `Content-Type` | Must be `application/json` |

HMAC signs the exact raw request body bytes using the canonical string `"{timestamp}\n{nonce}\n{raw_body}"`. The server must verify against the raw body, not re-encoded JSON.

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
- Request body size must be at most 1 MB.
- Events with unsupported major `schema_version` are rejected.

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

Returns dashboard KPI metrics for the requested game scope.

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

## Remaining Implementation Assumptions

- Private analytics authentication will be enforced through the future dashboard auth layer or equivalent protected server-side access. The endpoint contract stays the same regardless of the auth transport chosen later.
- Local single-instance development may use in-memory replay and rate-limit stores. Shared multi-instance backing stores are deferred to later infrastructure phases.
