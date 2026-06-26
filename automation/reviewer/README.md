# Automation Review Package Generator

Status: Sprint A10 foundation

The Review Package Generator creates a single human-readable markdown file for manual or ChatGPT review. It is API-free and uses only local automation artifacts plus read-only Git inspection commands.

## Output

Review packages are written to:

```text
automation/state/data/reviews/<taskId>-review-package.md
```

Each package includes:

- task summary
- sprint, title, and goal
- declared files changed
- Git diff summary
- QA summary
- Screenshot summary
- warnings
- failures
- final pipeline status
- explicit review questions
- prompt for ChatGPT review

## Git Diff Collection

The generator runs only read-only Git commands:

```bash
git status --short
git diff --stat
git diff --name-only
```

It does not run:

- `git commit`
- `git push`
- `git merge`
- `git checkout`
- `git reset`
- `git clean`
- destructive Git commands

Full diffs are intentionally excluded by default to keep review packages concise.

## Runner Integration

The Local Runner writes:

```text
automation/state/data/results/<taskId>-summary.md
automation/state/data/reviews/<taskId>-review-package.md
```

The runner still invokes the orchestrator. The review package generator does not bypass QA, Screenshot, State Store, or Review.

## Manual Review Workflow

1. Run the local runner.
2. Open the generated review package.
3. Paste the `Prompt for ChatGPT Review` section and package content into ChatGPT or another manual review surface.
4. Record the review decision through the approval workflow in a later sprint.

## Future API/Telegram Integration

Future sprints may send this package to:

- ChatGPT API
- Telegram Approval Agent
- GitHub PR review comments

Those integrations must preserve this API-free package format as the human-readable audit artifact.
