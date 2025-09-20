# Privacy & Data Ethics

- No PII stored (no names, emails, free text).
- IPs truncated (/24) at ingest; logs redact bodies.
- Public endpoints enforce k-anonymity (min bucket size 10).
- `consent_analytics` flag respected end-to-end.
