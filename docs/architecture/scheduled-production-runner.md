# Scheduled Production Runner

## Purpose

The Scheduled Production Runner adds a controlled schedule gate in front of the existing Intelligence Production Orchestrator.

It does not create a second production pipeline. Every executed run follows:

```text
Schedule due check
  -> file lock
  -> buildIntelligenceSuite()
  -> durable run report
  -> durable artifact publication
  -> scheduler state update
```

Historical Analog, Event Impact, Market Memory, and artifact publication remain owned by the orchestrator.

## Operating Model

The runner is intentionally one-shot.

```powershell
npx.cmd tsx workers/intelligence-scheduler/runScheduledProduction.ts
```

An external timer may invoke this command periodically. The runner determines whether production is due and exits after executing or skipping.

It is not:

- a resident daemon;
- a timer service;
- a cron implementation;
- a queue;
- a manual trigger API.

This boundary keeps scheduling policy separate from the production pipeline.

## Scheduler Contract

Scheduler contracts use:

```text
INTELLIGENCE_SCHEDULER_SCHEMA_VERSION = 1
```

State includes:

- job id;
- enabled flag;
- versioned interval schedule;
- last run reference;
- next run timestamp;
- scheduler status;
- update timestamp.

V1 supports one schedule shape:

```text
kind: interval
everyMinutes: positive integer
```

The default job is:

```text
jobId: intelligence-production-default
enabled: true
everyMinutes: 1440
```

The first invocation is due immediately. Subsequent `nextRun` values are calculated from the previous completion time.

## Durable File Layout

Scheduler files use:

```text
.data/intelligence/scheduler/
  scheduler-state.json
  production.lock
  last-skip.json
```

The existing `.data/` ignore rule keeps runtime state out of Git.

State and skip records are written atomically through temporary files followed by rename.

## Lifecycle

Each invocation:

1. Reads or initializes scheduler state.
2. Applies explicit CLI configuration overrides.
3. Skips if disabled.
4. Skips if `nextRun` is still in the future.
5. Attempts to acquire the production lock.
6. Marks the scheduler as running.
7. Generates a run id.
8. Calls the existing orchestrator.
9. Records the completed run and calculates `nextRun`.
10. Releases the lock in `finally`.

There are no retries.

## Locking

The lock file is created using exclusive file creation.

If the lock already exists and has not expired:

- the new invocation does not run production;
- it records `concurrent_run` in `last-skip.json`;
- it returns a skipped result.

The lock contains:

- job id;
- acquisition time;
- expiration time;
- unique owner id.

The default lock lifetime is six hours.

An expired lock is treated as abandoned and may be removed before one acquisition retry. Lock release checks the owner id before deleting the file.

The scheduler lock protects the complete orchestrator run, including artifact publication and report finalization.

## Skip Behavior

Durable skip reasons are:

- `disabled`;
- `not_due`;
- `concurrent_run`;
- `state_unavailable`.

Disabled and not-due decisions update scheduler state. Concurrent skips do not overwrite the active runner's scheduler state; they are recorded separately in `last-skip.json`.

If scheduler state is corrupted or unreadable, production is not started. The runner records `state_unavailable` and preserves the state file for operator diagnosis.

## Run Report Integration

The scheduler allocates a run id and passes it to `buildIntelligenceSuite()`.

The orchestrator remains responsible for:

- creating the durable run report;
- updating stage states;
- recording outputs, warnings, and errors;
- finalizing overall run status.

The scheduler stores only a compact reference to the last run.

## Artifact Store Integration

Scheduled runs always use:

```text
FileBackedIntelligenceArtifactRegistry
```

The scheduler does not publish artifacts itself. It injects the durable registry into the existing orchestrator publication stage.

No artifact schema or publication behavior is duplicated.

## Configuration

Optional worker arguments:

```text
--job-id <id>
--every-minutes <positive integer>
--enable
--disable
--scheduler-root <path>
--artifact-root <path>
--report-root <path>
```

Examples:

```powershell
npx.cmd tsx workers/intelligence-scheduler/runScheduledProduction.ts `
  --every-minutes 360
```

Disable future execution:

```powershell
npx.cmd tsx workers/intelligence-scheduler/runScheduledProduction.ts --disable
```

Re-enable and run when due:

```powershell
npx.cmd tsx workers/intelligence-scheduler/runScheduledProduction.ts --enable
```

There is no HTTP mutation endpoint.

## Status API

The read-only endpoint is:

```text
GET /api/intelligence/scheduler
```

It returns:

- configured state;
- job id;
- enabled state;
- schedule;
- current scheduler status;
- last run reference;
- next run timestamp;
- latest skip reason.

The endpoint never starts production.

## Failure Behavior

If the orchestrator returns a terminal report, the scheduler records that status and schedules the next interval.

If orchestration throws outside its normal stage isolation:

- scheduler status becomes `failed`;
- the run reference is completed as failed;
- the next interval is calculated;
- the lock is released;
- the original error is returned to the worker.

Successful stage data, durable artifacts, and run-report updates already written remain valid.

## Limitations

V1 intentionally has:

- one interval schedule per scheduler state;
- no calendar or cron expression parser;
- no catch-up execution for missed intervals;
- no retries;
- no alerting;
- no monitoring service;
- no manual trigger API;
- no cross-host distributed lock.

File locking coordinates processes sharing the same filesystem. It does not coordinate separate ephemeral or distributed hosts.

## Future Compatibility

A future hosting scheduler or platform timer can invoke the one-shot worker without changing:

- scheduler contracts;
- orchestrator contracts;
- run reports;
- artifact publication;
- production stages.

Monitoring and alerting can read the existing scheduler and run-report APIs later without entering the production path.
