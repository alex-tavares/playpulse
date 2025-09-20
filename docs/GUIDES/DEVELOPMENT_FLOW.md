# Development Flow

## Goals
- Keep `main` releasable at all times.
- Use `develop` as the shared integration branch for upcoming work.
- Make it easy for external contributors to collaborate via forks and focused pull requests.

## Branches
- `main`: Tagged for releases only. CI must be green and release notes prepared before merging.
- `develop`: Default branch for day-to-day work. All feature and bugfix PRs target `develop`.
- `feature/<topic>`: Short-lived branches cut from `develop` (contributors may create them within a fork).
- `release/<version>`: Created by maintainers when stabilising a release; merged into both `main` and `develop`.
- `hotfix/<topic>`: Emergency fixes branched from `main`, merged back into both `main` and `develop`.

## Contributor Workflow
1. Find or open an issue describing the change. Tag it with `good first issue`, `bug`, or `enhancement` where helpful.
2. Fork the repository (external contributors) or create a new branch from `develop` if you are part of the core team.
3. Create a branch named `feature/<topic>` or `bugfix/<topic>`; keep the scope small.
4. Run `pnpm lint` and `pnpm test` locally. Add or update docs and tests in the same PR.
5. Open a pull request into `develop` using Conventional Commits for your title (e.g. `feat: add ingestion events`). Link the issue.
6. Ensure the PR description states testing performed and any follow-up work.
7. Address review comments promptly; rebase onto `develop` when necessary to keep the branch up to date.
8. A maintainer will squash-merge once checks pass and at least one approval is in place.

## Release Workflow (Maintainers)
1. Cut `release/<version>` from `develop` when it is stable.
2. Bump version numbers across packages and update `CHANGELOG.md` (or create it if missing).
3. Run full CI, manual smoke tests, and ensure documentation is current.
4. Merge the release branch into `main` via a PR; tag the release (`vX.Y.Z`) once merged.
5. Merge back into `develop` (or rebase `develop` onto `main`) to capture release commits.

## Hotfix Workflow (Maintainers)
1. Branch `hotfix/<topic>` from `main`.
2. Implement and test the fix, bumping patch version if needed.
3. Open PRs into both `main` and `develop`; merge with approvals and green checks.
4. Tag a patch release after merging into `main`.

## Maintainer Duties
- Triage issues weekly, apply labels, and mark `help wanted` items.
- Ensure incoming PRs are scoped, follow the flow above, and target `develop`.
- Use squash merges to keep history clean; ensure titles follow Conventional Commits.
- Keep `main` protected (no direct pushes) and update branch protection rules when workflows change.
- Publish release notes for each tagged release and announce breaking changes.

## References
- See `CONTRIBUTING.md` for coding standards and PR expectations.
- Review `docs/TEST_STRATEGY.md` for required test coverage.
- Follow `docs/CODING_STANDARDS.md` and `docs/NAMING_CONVENTIONS.md` when writing code.
