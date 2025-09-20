# Using Codex Effectively (PlayPulse)

## Golden Rules
1) Always paste **PROJECT_BRIEF.md**, **ARCHITECTURE.md**, **EVENTS.md**, **API_CONTRACT.md**, and **PRIVACY.md** in your first message.
2) For each task: use **PROMPTS/spec-plan-tests.md** → ask for **tests only** first.
3) After failures, ask for a **minimal unified diff** (PROMPTS/diff-only.md).

## Typical Sessions
### A) Implement POST /events (MVP)
- Paste the Spec: Zod validation, HMAC, API key, 1MB limit, 500 items, rate limit, JSON logging.
- Ask for Vitest + supertest tests in `apps/ingest` with fixtures.
- When tests red → ask for minimal diffs to pass.

### B) Add sessions-per-day endpoint
- Spec: query Postgres view; zero-fill missing days; apply consent filter; k-anonymity on public.
- Ask for tests: synthetic data for 10 days; verify zero-fill.

### C) Retention cohorts view + endpoint
- Spec: SQL from `docs/SQL/aggregations.sql`; add `GET /metrics/retention`; tests using a tiny dataset.
