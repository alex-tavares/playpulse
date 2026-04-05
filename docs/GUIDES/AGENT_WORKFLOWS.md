# Agent Workflows

Use this guide for prompt recipes and repeatable agent workflows. Keep root `AGENTS.md` short; put longer prompt material here.

## Session Bootstrap

```text
Act as a senior engineer working in the PlayPulse monorepo.

First read:
- docs/PROJECT_BRIEF.md
- docs/ARCHITECTURE.md
- docs/EVENTS.md
- docs/CONTRACTS/API_CONTRACT.md
- docs/PRIVACY.md
- docs/CODING_STANDARDS.md
- docs/TEST_STRATEGY.md
- docs/ENV.md
- docs/DECISIONS.md

Then read only the RFCs relevant to this task.

Before writing code:
1. Summarize the constraints that matter for this task.
2. List the files, apps, and packages that should change.
3. Identify any doc conflicts or missing decisions.
4. Propose the smallest vertical slice worth implementing.

Do not invent architecture beyond the ratified docs.
```

## Feature Prompt

```text
Act as my senior PlayPulse engineer.

Read AGENTS.md and the relevant docs/RFCs for this scope.

Task:
<PASTE FEATURE SCOPE>

Return exactly:
1. Acceptance criteria with doc references.
2. Minimal implementation plan.
3. Interfaces/types to introduce or update.
4. Tests only first:
   - unit tests
   - integration tests
   - privacy/security edge cases
5. Risks, assumptions, and open questions.

Important constraints:
- TypeScript strict
- JSON-only contracts
- shared validation in packages/schemas
- no PII
- no body logging
- k-anonymity for public analytics
- keep diffs minimal

After I confirm, return only the minimal unified diff needed to make the tests pass.
```

## Scaffold Prompt

```text
Scaffold the smallest production-credible starting point for this PlayPulse workspace:
<PASTE app or package name>

Read AGENTS.md plus the relevant docs first.

Requirements:
- match the documented monorepo architecture
- use src/{routes,controllers,services,repos,lib,config} for services
- keep shared contracts in packages, not duplicated in apps
- add minimal scripts, TypeScript config, and test wiring
- include at least one smoke test or contract test
- do not over-scaffold features that are not yet specified in docs

Return:
1. files to create
2. rationale for each file
3. tests first
4. then a minimal unified diff only
```

## Bugfix Prompt

```text
You are debugging PlayPulse.

Read AGENTS.md and the docs/RFCs that govern the failing behavior.

Given this failure:
<PASTE failing test, log, or bug report>

Return:
1. Root-cause hypothesis tied to the violated contract or RFC.
2. The smallest regression test that should fail first.
3. The minimal unified diff to fix it.
4. Any follow-up hardening that should be a separate change.

Prioritize privacy, security, and data correctness regressions over stylistic cleanup.
```

## Refactor Prompt

```text
Refactor this PlayPulse code for modularity and testability without changing behavior.

Read AGENTS.md and the relevant docs first.

Goals:
- thinner routes/controllers
- extract pure functions
- reduce duplication across apps
- preserve API and schema contracts
- add or improve focused unit tests

Return only:
1. short refactor plan
2. minimal unified diff
3. tests added or updated
```

## Data Contract Prompt

```text
Design the data contract for this PlayPulse change before implementation:
<PASTE telemetry or analytics scope>

Read AGENTS.md, docs/EVENTS.md, docs/CONTRACTS/API_CONTRACT.md, docs/PRIVACY.md, and the relevant RFCs first.

Return:
1. proposed request/event schema
2. storage shape
3. derived/query shape
4. sample valid and invalid payloads
5. privacy and suppression rules
6. observability requirements
7. tests that should be written first

Do not write implementation code until the contract is coherent.
```

## Review Prompt

```text
Review this PlayPulse change against AGENTS.md and the repo docs.

Focus on:
- contract drift
- privacy leaks
- auth/signature/rate-limit regressions
- missing suppression or consent handling
- weak modular boundaries
- missing tests
- undocumented env vars or ops assumptions

Return findings first, ordered by severity, with file/line references.
Keep the summary brief.
```
