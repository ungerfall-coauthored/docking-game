# AGENTS.md

GenAI sandbox fork. Read [.agents/rules/coauthor-isolation.md](.agents/rules/coauthor-isolation.md) first (upstream isolation: never PR or push to `Ungerfall/*`).

## Repository

See README.md. GenAI sandbox fork under ungerfall-coauthored.

## Layout

Inspect repository root for source layout.

## Commands

Run engine tests with `node --test`.

## Workflow

- Work on branch `coauthor/<short-task-slug>`.
- Push only to `ungerfall-coauthored` remotes.
- Do not open PRs to upstream `Ungerfall`.

## Validation and release gates

- Before pushing, opening a PR, or merging external-service behavior changes,
  run relevant live integration tests against the intended service/deployment
  through the actual application client, including serialization,
  authentication, response parsing, and the configured timeout.
- Offline tests, mocks, green CI that excludes integration tests, and skipped
  tests are not substitutes. Missing credentials, provisioning, configuration,
  or service access block publication: keep work local and report the blocker.
  Never request secret values in chat.
- Record commands, executed/passed counts, and the tested commit or exact local
  diff. Reviewers must verify evidence for the final integration code and
  require affected tests to be rerun after behavior/configuration changes.
- Treat deployment-triggering pushes/merges as releases; verify hosted settings,
  not just local settings. A user publication/deployment hold blocks pushes,
  merges, release workflow runs, and re-enabling automatic deployment until
  explicit release approval. Passing tests or receiving credentials is not
  approval.
