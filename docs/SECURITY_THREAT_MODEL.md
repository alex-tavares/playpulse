# Threat Model (STRIDE-lite)

- **Spoofed client** -> API key + HMAC for trusted clients; short-lived public client bearer tokens, browser CORS/origin checks where available, rate limits, and kill switches for public builds.
- **Replay attack** -> Reject requests outside the timestamp window and duplicate `(credential, nonce)` pairs.
- **Schema abuse** -> Zod limits; body size limits; props length limits.
- **DoS** -> per-IP and per-key/client rate limiting; early rejects.
- **PII leakage** -> schemas forbid free-text PII; logs redact bodies; IP truncation at ingress.
- **Data exfiltration** -> public API only exposes aggregates; k-anonymity on small buckets.
