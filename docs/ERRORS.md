# Error Handling

This document is the canonical source of truth for PlayPulse MVP API error responses and stable error codes.

## Standard Envelope

All error responses must use this shape:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request body did not match the expected schema",
    "details": {}
  },
  "request_id": "01J8YX3TKYAF9V0P7WBH54M2RB"
}
```

Rules:

- `code` is stable and machine-readable.
- `message` is human-readable and safe to expose externally.
- `details` is optional and must not leak secrets, raw payloads, or stack traces.
- `request_id` is always included at the top level.

## Canonical Error Codes

| Code | HTTP status | Used when |
| --- | --- | --- |
| `bad_request` | 400 | A request is malformed in a way that is not a schema-validation failure. |
| `validation_failed` | 400 | Request JSON is syntactically valid but does not match the contract schema. |
| `unauthorized` | 401 | Authentication is missing or invalid and no more specific auth code applies. |
| `signature_invalid` | 401 | HMAC validation fails for the signed ingest request. |
| `timestamp_out_of_window` | 401 | `X-Request-Timestamp` is outside the accepted replay window. |
| `replay_detected` | 409 | A previously seen `(api_key, nonce)` pair is replayed. |
| `payload_too_large` | 413 | Request body exceeds the 1 MB limit. |
| `rate_limited_ip` | 429 | The caller exceeds the IP-based rate limit. |
| `rate_limited_key` | 429 | The caller exceeds the API-key-based rate limit. |
| `unsupported_schema_version` | 400 | Event payload uses an unsupported major `schema_version`. |
| `not_found` | 404 | A requested resource or route does not exist. |
| `internal_error` | 500 | An unexpected server-side failure occurs. |

## Usage Rules

- Use lowercase `snake_case` error codes everywhere.
- Prefer the most specific code available over a generic fallback.
- Validation failures should use `validation_failed`, not `bad_request`.
- Signature and replay failures should use the specific security codes, not `unauthorized`.
- Do not expose stack traces, raw SQL errors, secret material, or raw request bodies in `message` or `details`.

## Minimum MVP Mappings

- Schema validation errors -> `400 validation_failed`
- Unsupported `schema_version` -> `400 unsupported_schema_version`
- Missing or invalid auth -> `401 unauthorized`
- Invalid HMAC -> `401 signature_invalid`
- Expired timestamp -> `401 timestamp_out_of_window`
- Nonce replay -> `409 replay_detected`
- Oversized body -> `413 payload_too_large`
- IP throttle -> `429 rate_limited_ip`
- API key throttle -> `429 rate_limited_key`
- Unknown route -> `404 not_found`
- Unhandled exception -> `500 internal_error`
