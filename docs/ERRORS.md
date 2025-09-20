# Error Handling
- Always return JSON envelope:
  { "error": { "code": "BAD_REQUEST", "message": "…", "details": {} } }
- Map validation errors to 400; auth to 401; rate limit 429; internal 500 (no internals in `message`).
