---
name: cattower-main-workflow
description: Complete Cattower repository implementation and documentation work through direct commits to main and git push without pull requests. Use for every Cattower code, configuration, design, deployment, or documentation change that must be finished, documented, committed at an appropriate granularity, and pushed while removing obsolete documentation.
---

# Cattower Main Workflow

Finish each requested change as a complete repository update. Do not create or manage pull requests.

## Required workflow

1. Read `AGENTS.md` and every source-of-truth document relevant to the change.
2. Inspect `git status -sb`, the current branch, recent commits, and the intended diff before editing.
3. Work directly on `main`. If the current branch is not `main`, stop and return to `main` without discarding user changes.
4. Implement the smallest complete vertical slice that satisfies the request.
5. Validate in proportion to risk. Run the available typecheck, tests, builds, and Cloudflare dry-run when affected.
6. Update documentation after implementation and before the final push.
7. Remove obsolete documents instead of retaining stale alternatives, duplicate specifications, superseded prototypes, or misleading status text. Preserve historical material only when a current source of truth explicitly requires it.
8. Review `git diff --check`, `git status`, and the full scoped diff.
9. Split commits by meaningful implementation unit. Keep code and the documentation that explains that code in the same commit unless the documentation is an independent repository-wide operation.
10. Commit directly to `main` with terse imperative messages and push with `git push origin main`.
11. Verify that `HEAD`, `main`, and `origin/main` point to the pushed commit and that the working tree is clean.

## Documentation completion gate

Before every implementation push, inspect and update all affected sources of truth:

- `README.md` for current status, setup, and operator-facing entry points
- `docs/product-spec.md` for product behavior
- `docs/technical-architecture.md` for architecture, deployment, security, and operations
- `docs/data-model.md` for persistence and lifecycle changes
- `docs/design-guidelines.md` for UI decisions
- `docs/frontend-implementation-spec.md` for routes and frontend boundaries
- `docs/task-plan.md` for completion state and next work
- `docs/README.md` when documents are added, renamed, or deleted

Do not mark a task complete when only a mock, prototype, or partial UI exists. State the implemented boundary precisely.

## Commit rules

- Do not create a feature branch or pull request.
- Do not use `gh pr create` or any PR workflow.
- Do not squash unrelated work into one commit.
- Do not stage unrelated user changes.
- Use ordinary `git` commands for commits and push; GitHub CLI is not required.
- Never force-push, rewrite published history, or bypass failed validation.
- Never commit secrets, local environment files, build outputs, or tool-installed skill caches unrelated to Cattower.

## Obsolete document cleanup

Treat a document as obsolete when it duplicates a newer source of truth, describes a removed workflow, advertises an unimplemented repository state as current, or exists only as a superseded draft.

Before deletion, move any still-valid decisions into the active source of truth and update inbound links. Delete the obsolete file in the same commit as its replacement.

## Final report

Report:

- completed implementation and documentation scope
- validation commands and results
- commit hashes and messages
- push target and synchronization state
- any deliberately deferred work that remains unchecked in `docs/task-plan.md`
