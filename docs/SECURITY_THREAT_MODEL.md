# Threat Model (STRIDE-lite)

- **Spoofed client** → API key + HMAC per request; strict CORS; short body window (optional timestamp/nonce).
- **Replay attack** → (Optional) Reject signatures older than N minutes.
- **Schema abuse** → Zod limits; body size limits; props length limits.
- **DoS** → per-IP and per-key rate limiting; early rejects.
- **PII leakage** → schemas forbid free-text PII; logs redact bodies; IP truncation at ingress.
- **Data exfiltration** → public API only exposes aggregates; k-anonymity on small buckets.
