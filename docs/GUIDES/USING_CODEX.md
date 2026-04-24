# Using Codex Effectively (PlayPulse)

Codex loads root `AGENTS.md` automatically. Do not paste the core docs into every prompt; ask Codex to follow `AGENTS.md` and invoke the relevant repo skill when the task matches a repeatable workflow.

## Recommended Skills

- `$playpulse-feature-slice`: new feature, endpoint, app/package slice, or MVP capability.
- `$playpulse-bugfix-triage`: failing test, bug report, log, or regression.
- `$playpulse-refactor`: behavior-preserving cleanup for modularity and testability.
- `$playpulse-contract-design`: event, ingest, analytics, schema, storage, or API contract design.
- `$playpulse-review`: branch, diff, PR, or local-change review.

## Recommended Subagents

Ask for subagents explicitly when parallel read-only work would save time:

- `playpulse_doc_mapper`: maps relevant docs/RFCs and reports conflicts.
- `playpulse_contract_reviewer`: checks API, event, schema, storage, and response-contract drift.
- `playpulse_privacy_reviewer`: checks PII, consent, logging, IP truncation, and k-anonymity.
- `playpulse_test_planner`: derives focused unit, integration, and regression tests.

Example:

```text
Use $playpulse-feature-slice for this task. Spawn playpulse_doc_mapper and playpulse_test_planner in parallel first, then implement the smallest slice.

Task:
Add the sessions-per-day analytics endpoint described in the docs.
```

## Typical Sessions

### Implement `POST /events`

Use `$playpulse-feature-slice`. The agent should derive acceptance criteria from `docs/EVENTS.md`, `docs/CONTRACTS/API_CONTRACT.md`, `docs/PRIVACY.md`, RFC-003, RFC-004, and RFC-005, then write Vitest + supertest coverage before implementation.

### Add Sessions Per Day

Use `$playpulse-contract-design` first if the response shape or suppression behavior is unclear. Then use `$playpulse-feature-slice` for implementation and tests.

### Fix A Failing Ingest Test

Use `$playpulse-bugfix-triage`. Provide the failing test output or log and ask for the smallest regression test plus minimal fix.

### Review A Branch

Use `$playpulse-review`. For broad changes, explicitly ask Codex to spawn `playpulse_contract_reviewer`, `playpulse_privacy_reviewer`, and `playpulse_test_planner`, then consolidate findings.

## Configuration Notes

- Repo-level Codex config lives in `.codex/config.toml`.
- Custom read-only agents live in `.codex/agents/*.toml`.
- Repo skills live in `.agents/skills/*/SKILL.md`.
- Ask Codex to use Conventional Commits for commit messages and PR titles, and conventional branch prefixes such as `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`, or `chore/<slug>`.
- Hooks and rules are intentionally not configured by default. Add hooks only for deterministic checks such as prompt secret scanning or stop-time validation. Add rules only when command approval policy needs a shared allow/prompt/forbid rule.
