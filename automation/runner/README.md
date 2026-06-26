# Automation Local Runner

Status: Sprint A10 foundation

The Local Runner is the command-line entry point for the QuantTerminal Automation Layer. It loads a task, optionally prints a dry-run execution plan, invokes the orchestrator, writes a human-readable execution summary, and generates a review package for manual or ChatGPT review.

## CLI Usage

```bash
npx tsx automation/runner/runAutomation.ts --task automation/state/data/examples/example-task.json
```

Supported flags:

```text
--task <path>      Required task JSON path.
--config <path>    Optional runner config JSON path.
--dry-run          Print the execution plan only. Does not run QA or Screenshot.
--verbose          Print additional local runner details.
```

## Task Lifecycle

The runner does not execute stages directly. It calls:

```ts
runPipeline(task)
```

The orchestrator owns lifecycle transitions and state persistence:

```text
NEW
↓
RUNNING
↓
QA
↓
SCREENSHOT
↓
REVIEW
↓
WAITING_APPROVAL
```

Blocking failures transition the task to `FAILED`.

## Output Artifacts

The orchestrator persists structured artifacts through the State Store:

- task state
- pipeline state
- QA report
- screenshot report
- review result
- approval result
- final result

The runner writes:

```text
automation/state/data/results/<taskId>-summary.md
automation/state/data/reviews/<taskId>-review-package.md
```

The summary includes:

- execution time
- completed stages
- failed stage
- QA summary
- Screenshot summary
- warnings
- failures
- final status

The review package adds:

- task scope and constraints
- read-only Git status/diff summary
- explicit review questions
- prompt for ChatGPT review

## Dry-Run Mode

Dry-run mode loads and validates the task, resolves runner configuration, and prints the execution plan.

It does not:

- call `runPipeline`
- execute QA
- execute Screenshot
- write state artifacts
- write summary files
- write review packages

## Optional Config

Config file shape:

```json
{
  "qaBlocking": true,
  "screenshotBlocking": false,
  "stateRoot": "automation/state/data",
  "summaryOutputDir": "automation/state/data/results"
}
```

All fields are optional.

## Future DevSpace Adapter Integration

Future Developer Agent work may add a DevSpace adapter behind the orchestrator's Codex stage.

The runner should remain unchanged:

```text
runner
↓
orchestrator
↓
developer-agent adapter
↓
QA
↓
Screenshot
↓
Review
↓
Approval
```

The runner must not bypass the orchestrator, State Store, QA Harness, Screenshot Harness, Review Agent, or Approval Agent.
