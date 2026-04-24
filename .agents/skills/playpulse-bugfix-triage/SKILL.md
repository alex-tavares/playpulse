---
name: playpulse-bugfix-triage
description: Use for PlayPulse bug fixes, failing tests, production-like logs, or behavioral regressions. It ties the root cause to docs and requires a regression test.
---

# PlayPulse Bugfix Triage

Use this skill when the user provides a failing test, bug report, log, or suspected regression.

## Workflow

1. Read `AGENTS.md`.
2. Read the docs/RFCs that govern the failing behavior.
3. Reproduce or inspect the failure with the narrowest useful command.
4. State the root-cause hypothesis and the violated contract or decision.
5. Add or update the smallest regression test that should fail before the fix.
6. Apply the minimal code change.
7. Run the regression test and relevant targeted checks.
8. If asked to create a branch, commit, or PR title, use `fix/<slug>` unless a different Conventional Commit type is more accurate, and use Conventional Commits.

## Priorities

Prioritize privacy, security, data correctness, contract drift, and missing consent/suppression behavior over stylistic cleanup.

## Output Expectations

Return:

- root cause tied to the governing doc or RFC
- regression test added or updated
- minimal code patch summary
- targeted validation run
- follow-up hardening that should be a separate change
- conventional branch or commit naming used, when applicable
