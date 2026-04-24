---
name: playpulse-review
description: Use for reviewing PlayPulse changes against contracts, privacy guarantees, security posture, tests, and documented architecture.
---

# PlayPulse Review

Use this skill when the user asks for a review of a branch, diff, PR, or local changes.

## Review Focus

Prioritize:

- contract drift
- privacy leaks
- auth, HMAC, replay, and rate-limit regressions
- missing consent, IP truncation, or k-anonymity behavior
- weak app/package boundaries
- missing regression, integration, or privacy/security tests
- undocumented env vars or operational assumptions
- branch names, commit messages, and PR titles that do not follow conventional branch prefixes or Conventional Commits

## Workflow

1. Read `AGENTS.md`.
2. Inspect the diff or changed files.
3. Read only the docs/RFCs that govern the changed behavior.
4. Review for correctness, security, privacy, and missing tests before style.
5. Lead with concrete findings ordered by severity.

## Output Expectations

Use a code-review stance:

- findings first, with file and line references
- open questions or assumptions
- brief summary only after findings
- if no issues are found, say so and mention residual test gaps
