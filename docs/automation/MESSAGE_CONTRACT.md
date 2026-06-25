# Agent Message Contract

Status: A2 foundation

This document defines the first message contract for the QuantTerminal Automation Layer. It describes how automation agents hand structured information to each other without adding autonomous execution, APIs, runtime services, or package changes.

The contract flow is:

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
Telegram
```

Every message must be deterministic, auditable, and scoped to the approved task. Agents must not invent data, fabricate validation results, or silently expand scope.

## Contract Files

Schemas live under:

```text
automation/contracts/
```

Current schemas:

- `task.schema.json`: Planner to Codex
- `qa.schema.json`: QA to Review
- `screenshot.schema.json`: Screenshot to Review
- `review.schema.json`: Review to Telegram
- `approval.schema.json`: Telegram to Pipeline

## Planner To Codex

The Planner Agent converts a human sprint request into a bounded task message. Codex must treat this message as the execution boundary.

Required support:

- `task_id`
- `sprint`
- `title`
- `goal`
- `scope`
- `constraints`
- `files`
- `validation`
- `expected_output`

Example:

```json
{
  "task_id": "project-alpha-a2",
  "sprint": "A2",
  "title": "Agent Message Contract",
  "goal": "Create the first version of the Agent Message Contract.",
  "scope": [
    "Create documentation",
    "Create JSON schemas"
  ],
  "constraints": [
    "No runtime code",
    "No APIs",
    "No package.json changes"
  ],
  "files": [
    "docs/automation/MESSAGE_CONTRACT.md",
    "automation/contracts/task.schema.json"
  ],
  "validation": [
    "Confirm files exist",
    "Confirm schemas are valid JSON",
    "Confirm no runtime files changed"
  ],
  "expected_output": [
    "files created",
    "contract summary",
    "validation summary"
  ]
}
```

## Codex To QA

Codex executes the approved task and provides changed-file context plus validation evidence to QA. The current A2 deliverable defines the QA output schema, not a dedicated Codex output schema.

Codex handoff must include:

- task identifier
- files changed
- validation commands run or intentionally skipped
- known limitations
- any scope decisions made during implementation

## QA To Review

The QA Agent summarizes validation results for the Review Agent.

Required support:

- `tsc`
- `tests`
- `audits`
- `warnings`
- `failures`

Example:

```json
{
  "task_id": "project-alpha-a2",
  "tsc": {
    "status": "skipped",
    "command": null,
    "reason": "Documentation and JSON schema only"
  },
  "tests": [],
  "audits": [
    {
      "name": "file existence",
      "status": "passed",
      "summary": "All required files exist."
    }
  ],
  "warnings": [],
  "failures": []
}
```

## Screenshot To Review

The Screenshot Agent provides viewport evidence for visual work. Documentation-only or non-visual tasks may mark screenshots as skipped.

Required support:

- `desktop`
- `tablet`
- `mobile`
- `timestamp`
- `viewport`
- `status`

Example:

```json
{
  "task_id": "dashboard-visual-review",
  "timestamp": "2026-06-25T00:00:00.000Z",
  "status": "passed",
  "viewport": {
    "desktop": "1440x1024",
    "tablet": "1024x768",
    "mobile": "390x844"
  },
  "desktop": {
    "status": "passed",
    "path": "artifacts/screenshots/dashboard-desktop.png"
  },
  "tablet": {
    "status": "passed",
    "path": "artifacts/screenshots/dashboard-tablet.png"
  },
  "mobile": {
    "status": "passed",
    "path": "artifacts/screenshots/dashboard-mobile.png"
  }
}
```

## Review To Telegram

The Review Agent determines whether the task can proceed to human approval.

Required support:

- `architecture`
- `design`
- `runtime`
- `screenshots`
- `verdict`
- `blockingIssues`
- `recommendations`

Example:

```json
{
  "review_id": "review-project-alpha-a2",
  "task_id": "project-alpha-a2",
  "architecture": {
    "status": "passed",
    "summary": "Documentation-only automation contracts do not alter runtime architecture."
  },
  "design": {
    "status": "not_applicable",
    "summary": "No UI or visual design changes."
  },
  "runtime": {
    "status": "passed",
    "summary": "No runtime files, APIs, or package files changed."
  },
  "screenshots": {
    "status": "skipped",
    "summary": "No visual surface changed."
  },
  "verdict": "PASS",
  "blockingIssues": [],
  "recommendations": [
    "Use these schemas as the input contract for A3 and later agents."
  ]
}
```

## Telegram To Pipeline

The Telegram Approval Agent records a human approval decision. Approval does not imply autonomous merge in A2.

Required support:

- `review_id`
- `approved`
- `reviewer`
- `timestamp`

Example:

```json
{
  "review_id": "review-project-alpha-a2",
  "approved": true,
  "reviewer": "human-operator",
  "timestamp": "2026-06-25T00:00:00.000Z"
}
```

## Versioning Rules

- Schema changes must be additive whenever possible.
- Removing fields requires a new schema version.
- Runtime automation must reject messages with unknown required schema versions.
- Optional metadata may be added only when it does not alter the required handoff semantics.

## Non-Goals

A2 does not implement:

- autonomous execution
- message transport
- APIs
- package scripts
- Telegram integration
- CI integration
- runtime workers
- merge automation
