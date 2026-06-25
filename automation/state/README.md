# Automation State Store

Status: Sprint A7 foundation

The Automation State Store is the JSON-backed source of truth for automation execution state. It is local, file-based, and intentionally separate from product runtime code.

## Folder Structure

```text
automation/state/data/
  tasks/
  results/
  reviews/
  approvals/
  pipeline/
```

Each stored record is a JSON file keyed by task id.

## State Manager

The State Manager exposes:

```ts
createTask()
updateTask()
loadTask()
listTasks()
archiveTask()
```

Each task includes:

- `taskId`
- `sprint`
- `status`
- `createdAt`
- `updatedAt`
- `currentStage`

## Lifecycle

Primary lifecycle:

```text
NEW
↓
PLANNED
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
↓
APPROVED
↓
MERGED
↓
COMPLETED
```

Failure lifecycle:

```text
FAILED
CANCELLED
```

`FAILED` and `CANCELLED` are allowed from any active stage. Terminal statuses cannot transition forward.

## Pipeline State

Pipeline records track:

- `currentStage`
- `completedStages`
- `warnings`
- `failures`
- `artifacts`

This lets later review and approval systems inspect exactly what happened during execution.

## Persistence Strategy

The repository writes JSON files with a temporary file followed by rename. This keeps writes simple and reasonably safe without introducing a database.

The State Store does not:

- modify product runtime code
- create APIs
- add schedulers
- add external dependencies
- use SQLite

## SQLite Migration Path

SQLite should only be introduced when JSON files become limiting.

Migration criteria:

- large task volume
- frequent query by status/sprint/date
- concurrent automation workers
- need for transactional multi-record updates
- long-term audit retention requirements

The TypeScript interfaces in `types.ts` should remain the logical contract even if storage moves from JSON files to SQLite later.
