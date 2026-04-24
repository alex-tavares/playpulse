---
name: playpulse-refactor
description: Use for PlayPulse refactors that should improve clarity, modularity, or testability without changing documented behavior.
---

# PlayPulse Refactor

Use this skill when the user asks to refactor existing PlayPulse code.

## Workflow

1. Read `AGENTS.md`.
2. Read the docs/RFCs that define the behavior being preserved.
3. Identify the current behavior and tests that protect it.
4. Keep public APIs, schemas, storage behavior, and env behavior unchanged unless the user explicitly requests a contract change.
5. Prefer thinner routes/controllers, extracted pure functions, and shared package utilities where duplication crosses app boundaries.
6. Add or improve focused tests when the refactor touches shared behavior or previously untested logic.
7. Run targeted tests plus lint/typecheck when practical.
8. If asked to create a branch, commit, or PR title, use `refactor/<slug>` unless a different Conventional Commit type is more accurate, and use Conventional Commits.

## Constraints

- Do not mix validation, SQL, privacy filtering, and response mapping in a single route file.
- Keep shared validation in `packages/schemas`.
- Do not introduce broad abstractions unless they remove real duplication or match an existing pattern.

## Output Expectations

Return:

- short refactor plan
- changed behavior: `none` unless explicitly changed
- tests added or updated
- validation run
- conventional branch or commit naming used, when applicable
