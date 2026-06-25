# Automation Orchestrator

Status: Sprint A3 foundation

The Automation Orchestrator is the first executable layer for the QuantTerminal Automation Layer. It is intentionally isolated from product runtime code and does not call Codex, ChatGPT, Telegram, browser tools, screenshot systems, or external APIs.

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
  artifacts
}
```

Additional warnings and errors are also returned for review and diagnostics.

## Sprint A3 Behavior

All stage executors are stubs.

- Planner validates the received task shape at a basic typed boundary.
- Codex records that execution is stubbed.
- QA records that validation is stubbed and does not run commands.
- Screenshot records skipped viewport captures.
- Review creates a stub review result from QA and screenshot artifacts.
- Telegram Approval records that no human approval was requested.

This sprint does not create autonomous execution.

## JSON Schema Usage

The orchestrator imports the Sprint A2 JSON schemas through `automationSchemas`. The schemas are contract references for future validation adapters.

Current A3 code does not perform full JSON Schema validation because no schema validation dependency is introduced in this sprint.

## Failure Handling

Each stage logs:

- start
- end
- failure

Each stage returns a typed `StageResult`.

The pipeline stops when a stage:

- returns `blocked`
- returns `failed`
- marks `blocking: true`
- throws an exception

Successful stage artifacts remain available in the returned pipeline result even when a later stage fails.

## Future Integration Points

Future sprints may replace stubs with adapters:

- Planner adapter: task decomposition and scope validation
- Codex adapter: controlled worker execution
- QA adapter: TypeScript, audit, and smoke-test execution
- Screenshot adapter: desktop, tablet, and mobile capture
- Review adapter: constitution, design, freeze, runtime, and screenshot review
- Telegram adapter: human approval request and response capture

Each adapter must preserve the same typed boundaries and failure behavior.

## Constraints

- No product runtime code is invoked.
- No Dashboard code is modified.
- No package dependencies are added.
- No external APIs are called.
- No screenshots are taken.
- No Telegram messages are sent.
- No autonomous merge or execution behavior exists.
