# Privacy & Data Ethics

- **No PII** captured or stored. Never accept names, emails, free text from players.
- **IP truncation** at ingest: store only /24 (IPv4) or /48 (IPv6).
- **Consent**: `consent_analytics` required to include data in public/private metrics.
- **K-anonymity**: public responses hide buckets with count < 10.
- **Data retention**: raw events kept; exports are anonymized; document retention window in README when defined.
