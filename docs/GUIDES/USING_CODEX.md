# Using Codex Effectively (PlayPulse)

## Golden Rules
1. Always paste `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, `EVENTS.md`, `API_CONTRACT.md`, and `PRIVACY.md` in your first message.
2. For each task, use `PROMPTS/spec-plan-tests.md` and ask for tests only first.
3. After failures, ask for a minimal unified diff using `PROMPTS/diff-only.md`.

## Typical Sessions

### A) Implement `POST /events` (MVP)
- Paste the spec: Zod validation, HMAC, API key, 1 MB limit, 10 events per request, rate limit, JSON logging.
- Ask for Vitest + supertest tests in `apps/ingest` with fixtures.
- When tests are red, ask for minimal diffs to pass.

### B) Add the sessions-per-day endpoint
- Spec: query the Postgres view, zero-fill missing days, apply consent filter, and enforce k-anonymity on public responses.
- Ask for tests with synthetic data for 10 days and verification of zero-fill behavior.

### C) Add the retention cohorts view + endpoint
- Spec: derive cohorts, add `GET /metrics/retention/cohorts`, and test with a small seeded dataset.
