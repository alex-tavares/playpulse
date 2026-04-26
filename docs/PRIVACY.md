# Privacy & Data Ethics

- **No PII** captured or stored. Never accept names, emails, free text from players.
- **IP truncation** at ingest: store only /24 (IPv4) or /48 (IPv6).
- **Consent**: `consent_analytics` required to include data in public/private metrics.
- **K-anonymity**: public responses hide buckets with count < 10.
- **Data retention**: raw events kept; exports are anonymized; document retention window in README when defined.

## Custom Event Guardrails

v1.1 custom events are open by event name but closed by privacy rules. Ingest rejects invalid custom payloads rather than quarantining them.

- Custom event names must be non-core `snake_case` names, max 48 chars.
- Custom property keys must be `snake_case` and are capped at 25 keys per event.
- Custom values may only be flat strings, finite numbers, booleans, or arrays of those primitives.
- Objects, `null`, nested arrays, email-like strings, bearer/JWT-like tokens, and long free-text blobs are rejected.
- Envelope identifiers such as `session_id` and `player_id_hash` are allowed only in the controlled event envelope, not in custom `properties`.
- Identifier, auth, contact, and free-text property keys are rejected, including `session_id`, `player_id`, `player_id_hash`, `user_id`, `account_id`, `device_id`, `email`, `email_address`, `phone`, `player_name`, `chat`, `message`, `token`, `secret`, `password`, `api_key`, `auth_token`, `access_token`, `refresh_token`, `jwt`, and `cookie`.
- Private custom-event debug APIs expose only v1.1 custom events and must not return `player_id_hash`, raw session identifiers, raw auth data, or request headers.
