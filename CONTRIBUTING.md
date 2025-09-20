# Contributing

Thank you for helping build PlayPulse!

## Workflow Overview
- All day-to-day work happens on `develop`. PRs should target `develop`.
- Keep `main` release-ready; releases are cut from `release/<version>` branches.
- Read `docs/GUIDES/DEVELOPMENT_FLOW.md` for the full branching model and maintainer guidance.

## Pull Requests
- Follow the steps in `docs/GUIDES/DEVELOPMENT_FLOW.md#contributor-workflow`.
- Use **Conventional Commits** in branch names and PR titles.
- Include tests (`pnpm test`) and linting (`pnpm lint`) results in the PR description.
- Keep diffs small; prefer multiple focused PRs.

## Maintainers
- Responsibilities and release/hotfix procedures are documented in `docs/GUIDES/DEVELOPMENT_FLOW.md`.
- Enforce branch protection rules (`develop`, `main`) and require green CI before merging.

## Community
- Be kind and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Tag issues with `help wanted` or `good first issue` to grow the contributor base.
