---
name: playpulse-feature-slice
description: Use for implementing a new PlayPulse feature or vertical slice. It derives acceptance criteria from docs, designs the smallest implementation, and keeps tests first.
---

# PlayPulse Feature Slice

Use this skill when the user asks to add a feature, endpoint, schema, app/package slice, or MVP capability in PlayPulse.

## Workflow

1. Read `AGENTS.md`.
2. Read the required docs listed in `AGENTS.md`.
3. Read only RFCs relevant to the feature.
4. Derive acceptance criteria from the docs before editing code.
5. Identify the minimal app/package surface to change.
6. Write or update tests first.
7. Implement the smallest diff that makes those tests pass.
8. Run targeted tests, then lint and typecheck when practical.
9. Update docs only if contracts, env behavior, or operational behavior changed.
10. If asked to create a branch, commit, or PR title, use conventional branch prefixes and Conventional Commits.

## Output Expectations

Before code changes, state:

- acceptance criteria with doc references
- minimal implementation plan
- interfaces/types to introduce or update
- unit, integration, and privacy/security tests
- risks, assumptions, and open questions

During implementation, preserve PlayPulse non-negotiables:

- TypeScript strict
- JSON-only contracts
- shared validation in `packages/schemas`
- no PII
- no body/header/identifier logging
- k-anonymity for public analytics
- minimal diffs
- conventional branches such as `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`, or `chore/<slug>`
- Conventional Commits for commit messages and PR titles
