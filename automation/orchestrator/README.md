# Automation Orchestrator

Status: Sprint A6 integration foundation

The Automation Orchestrator is the executable coordination layer for the QuantTerminal Automation Layer. It is intentionally isolated from product runtime code and does not call Codex, ChatGPT, Telegram, external APIs, or product routes directly beyond the Screenshot Harness readiness check.

## Current Execution Flow

The pipeline executes these stages in order:

```text
Planner
↓
Codex
↓
QA
↓
Screenshot
↓
Review
↓
Telegram Approval
```

The public entrypoint is:

```ts
runPipeline(task)
```

It returns:

```ts
{
  status,
  currentStage,
  completedStages,
  failedStage,
  artifacts,
  warnings,
  failures,
  persistedArtifacts
}
```

## Sprint A6 Behavior

Most stage executors remain controlled stubs, but QA, Screenshot, and State Store integration are now connected.

- Planner validates the received task shape at a basic typed boundary.
- Codex records that execution is stubbed.
- QA calls `runQaChecks()`.
- Screenshot calls `captureDashboardScreenshots()`.
- Review creates a deterministic stub review result from QA and screenshot artifacts.
- Telegram Approval records that no human approval was requested.
- State Store persists task, pipeline, QA, screenshot, review, approval, and result artifacts.

This sprint does not create autonomous execution.

## State Store Integration

The orchestrator uses the Automation State Store as the persisted execution record.

Persisted records:

- task state
- pipeline state
- QA report
- screenshot report
- review result
- approval result
- final pipeline result

Default storage:

```text
automation/state/data/
  tasks/
  pipeline/
  results/
  reviews/
  approvals/
```

The task lifecycle used by `runPipeline(task)` is:

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

If a blocking failure occurs, the task is transitioned to:

```text
FAILED
```

Pipeline state records include:

- `currentStage`
- `completedStages`
- `warnings`
- `failures`
- `artifacts`

The latest pipeline state is persisted before returning from blocking failure paths.

## QA Integration

The QA stage calls:

```ts
runQaChecks()
```

The structured QA report is preserved in:

```ts
artifacts.qa
artifacts.qaReport
```

Default behavior:

```ts
{
  qaBlocking: true
}
```

When QA returns a failed or blocked report and `qaBlocking` is `true`, the pipeline stops at `qa`, sets `failedStage` to `"qa"`, preserves completed artifacts, persists the QA report, and persists the latest pipeline state.

## Screenshot Integration

The Screenshot stage calls:

```ts
captureDashboardScreenshots()
```

The structured screenshot report is preserved in:

```ts
artifacts.screenshot
artifacts.screenshotReport
```

Default behavior:

```ts
{
  screenshotBlocking: false
}
```

When screenshots fail and `screenshotBlocking` is `false`, the pipeline records warnings, persists those warnings in pipeline state, and continues to Review. When `screenshotBlocking` is `true`, the pipeline stops at `screenshot`.

## Pipeline Configuration

`runPipeline(task, options)` accepts:

```ts
{
  config: {
    qaBlocking: true,
    screenshotBlocking: false
  }
}
```

Defaults:

- `qaBlocking: true`
- `screenshotBlocking: false`

## JSON Schema Usage

The orchestrator imports the Sprint A2 JSON schemas through `automationSchemas`. The schemas are contract references for future validation adapters.

Current code does not perform full JSON Schema validation because no schema validation dependency is introduced in this sprint.

## Failure Handling

Each stage logs:

- start
- end
- failure
- persistence events
- non-blocking warnings

Each stage returns a typed `StageResult`.

The pipeline stops when a stage:

- returns `blocked`
- marks `blocking: true`
- throws an exception

Non-blocking failed stages are recorded as warnings and the pipeline continues.

Successful stage artifacts remain available in the returned pipeline result even when a later stage fails.

## Current Limitations

- Codex execution remains stubbed.
- Review remains a deterministic stub based on QA and screenshot artifacts.
- Telegram approval remains stubbed and does not contact Telegram.
- Screenshot capture still uses the Screenshot Harness stub adapter; readiness may run, but no browser dependency is added.
- Full JSON Schema validation is not implemented yet.
- The State Store is JSON-backed only; no SQLite is introduced.

## Future Integration Points

Future sprints may replace stubs with adapters:

- Planner adapter: task decomposition and scope validation
- Codex adapter: controlled worker execution
- QA adapter: richer command selection and environment-aware validation
- Screenshot adapter: real desktop, laptop, tablet, and mobile capture
- Review adapter: constitution, design, freeze, runtime, and screenshot review
- Telegram adapter: human approval request and response capture
- State adapter: optional migration from JSON files to SQLite once justified

Each adapter must preserve the same typed boundaries and failure behavior.

## Constraints

- No product runtime code is invoked.
- No Dashboard code is modified.
- No package dependencies are added.
- No external APIs are called.
- No browser screenshots are taken by the stub adapter.
- No Telegram messages are sent.
- No autonomous merge or execution behavior exists.
