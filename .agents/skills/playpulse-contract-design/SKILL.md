---
name: playpulse-contract-design
description: Use before implementing telemetry, ingest, analytics, schema, storage, or API contract changes in PlayPulse.
---

# PlayPulse Contract Design

Use this skill when a task needs a coherent data, event, API, or analytics contract before implementation.

## Workflow

1. Read `AGENTS.md`.
2. Read `docs/EVENTS.md`, `docs/CONTRACTS/API_CONTRACT.md`, `docs/PRIVACY.md`, `docs/ARCHITECTURE.md`, and relevant RFCs.
3. Check `docs/DECISIONS.md` for ratified scope and deferred behavior.
4. Design the smallest contract that satisfies the task without expanding MVP scope.
5. Identify privacy, consent, suppression, logging, and env implications.
6. Define tests before implementation.
7. If asked to create a branch, commit, or PR title, use a conventional branch prefix matching the change type and use Conventional Commits.

## Contract Checklist

Cover only the pieces relevant to the task:

- request or event schema
- shared validation location
- storage shape
- derived/query shape
- response shape and error envelope
- valid and invalid payload examples
- privacy and k-anonymity rules
- observability requirements
- environment variables and docs updates

## Output Expectations

Return a contract proposal and test plan. Do not write implementation code until the contract is coherent.
