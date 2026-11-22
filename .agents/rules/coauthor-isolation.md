# Coauthor upstream isolation

This sandbox is GenAI-owned work on a **fork** under `ungerfall-coauthored`. The upstream account **`Ungerfall` must never receive AI-driven git changes**.

## Forbidden

- Opening pull requests into `Ungerfall/*`
- `git push` to any remote URL containing `github.com/Ungerfall/`
- Adding `Ungerfall/*` as a push remote
- `gh pr create` with base repo `Ungerfall/*`

## Allowed

- Push branches to `ungerfall-coauthored/<this-fork>`
- Commits on branches named `coauthor/*`

Human promotion to `Ungerfall` is manual and outside this pipeline.
