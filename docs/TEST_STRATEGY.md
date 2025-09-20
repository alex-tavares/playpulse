# Test Strategy

## Unit
- Zod schemas: valid/invalid samples.
- Security utils: HMAC generation/verification; IP truncation.
- Repos: insert/select happy and failure paths (mock DB).

## Integration
- supertest against Express; real Postgres via docker service.
- `POST /events`: valid batch, invalid schema, bad signature, rate-limit, body-size.
- Analytics endpoints: zero-fill days; k-anonymity behavior.

## E2E Smoke
- Seed synthetic events → refresh MVs → query analytics API → verify charts receive expected shapes.

## CI
- Node 20, pnpm cache, Postgres service, Vitest/Jest.
- Artifacts: coverage & JUnit (optional).
