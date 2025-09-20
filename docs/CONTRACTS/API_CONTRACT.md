# API Contract — TBD

This document will be defined **per milestone** (ingest → analytics). Until then, these rules guide Codex:

## Style & Envelopes
- **JSON only.** Request/response bodies are JSON.
- **Keys:** `snake_case` for analytics/event payloads; headers in `Title-Case`.
- **Error envelope (final):**
  ```json
  { "error": { "code": "STRING", "message": "Human readable", "details": {} } }
  ```
  - `code` is stable (e.g., `BAD_REQUEST`, `UNAUTHORIZED`, `RATE_LIMITED`).
  - No stack traces in responses.

## Auth & Security (fixed)
- Requests include `X-Api-Key`. For ingest, also `X-Signature` (HMAC-SHA256 of raw body).
- Body size ≤ **1MB**. Rate limit applies per key and per IP.
- **No PII** accepted or stored. IPs truncated at ingress.

## Versioning
- `schema_version` carried by clients; server accepts a range and logs mismatches.

## Endpoints — **to be defined later**
- Ingest (write): `POST /events` (batch)
- Analytics (read): timeseries, popularity, retention cohorts
- Each endpoint will include: request schema, response schema, status codes, examples, and tests-first acceptance criteria.
