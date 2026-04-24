# Agent Workflows

Use this guide to choose the right PlayPulse skill or subagent workflow. Keep root `AGENTS.md` short; reusable execution guidance belongs in `.agents/skills`.

## Session Bootstrap

For most tasks, start with the relevant skill instead of pasting long prompt templates. Codex should read `AGENTS.md`, then the docs and RFCs required by that file.

Use this shape:

```text
Use $playpulse-feature-slice.

Task:
<describe the feature or fix>
```

For complex research or review, ask for read-only subagents explicitly:

```text
Use $playpulse-review. Spawn playpulse_doc_mapper, playpulse_contract_reviewer, playpulse_privacy_reviewer, and playpulse_test_planner in parallel, then consolidate findings.
```

## Feature Or Scaffold Work

Use `$playpulse-feature-slice` for new endpoints, app/package slices, SDK work, and production-credible scaffolding.

Expected behavior:

- derive acceptance criteria from docs
- identify minimal files/apps/packages to change
- write tests first
- implement the smallest vertical slice
- run targeted tests, lint, and typecheck where practical

For unclear event/API/storage shapes, use `$playpulse-contract-design` before implementation.

## Bugfix Work

Use `$playpulse-bugfix-triage` for failing tests, logs, or bug reports.

Expected behavior:

- tie the root cause to a violated contract, RFC, or decision
- add or update a regression test first
- apply the smallest fix
- separate follow-up hardening from the bug fix

## Refactor Work

Use `$playpulse-refactor` for behavior-preserving cleanup.

Expected behavior:

- preserve API, schema, env, storage, and privacy behavior
- thin routes/controllers where needed
- extract pure functions or shared helpers only when useful
- add focused tests when touching shared or previously untested behavior

## Contract Design

Use `$playpulse-contract-design` before implementation when a task changes:

- telemetry events
- ingest request handling
- analytics responses
- schema validation
- warehouse or derived query shape
- privacy, consent, or suppression behavior

The output should define the contract and tests before code changes.

## Review Work

Use `$playpulse-review` for diffs, branches, or PRs.

For broad reviews, ask for these subagents:

- `playpulse_doc_mapper`
- `playpulse_contract_reviewer`
- `playpulse_privacy_reviewer`
- `playpulse_test_planner`

Findings should lead, ordered by severity, with file and line references.

## Branch And Commit Naming

When Codex creates a branch, commit, or PR title, require:

- Conventional Commits format for commits and PR titles: `type(scope): summary`.
- Conventional branch prefixes by change type: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`, or `chore/<slug>`.
- Day-to-day branches from `develop`; `main` is release-only.

## Hooks And Rules

PlayPulse does not configure project hooks or rules by default.

Add hooks only for deterministic lifecycle checks, such as:

- scanning prompts for pasted secrets
- verifying stop-time checklist output
- collecting non-sensitive local quality signals

Add rules only when the team needs shared command approval policy. Keep user-specific approvals, sandbox, model, provider, and credentials in user-level Codex configuration.
