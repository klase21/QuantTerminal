# Intelligence Production Run Reports

## Purpose

Intelligence Production Run Reports provide durable operational visibility for the manual Intelligence Production Orchestrator.

They answer:

- what stages executed;
- what outputs were produced;
- which stages failed;
- how long each stage and the full run took;
- when the latest successful run completed.

Reports describe production execution. They do not create intelligence, trigger retries, schedule work, or expose internal stack traces.

## Report Contract

Run reports use:

```text
INTELLIGENCE_PRODUCTION_RUN_SCHEMA_VERSION = 1
```

Each report contains:

- run id;
- start and completion timestamps;
- total duration in milliseconds;
- overall status;
- the four canonical production stages.

Canonical stages:

1. `historical_analog`
2. `event_impact`
3. `market_memory`
4. `artifact_publication`

Each stage records:

- status;
- start and completion timestamps;
- duration in milliseconds;
- generated outputs;
- warnings;
- errors.

During execution, overall status is `running`. Stage status moves through:

```text
pending -> running -> succeeded | partial | failed | skipped
```

Terminal overall statuses remain:

- `succeeded`
- `partial`
- `failed`
- `skipped`

## File Layout

Reports are stored under the Git-ignored runtime path:

```text
.data/intelligence/reports/
  run-<UTC timestamp>-<unique suffix>.json
```

Example:

```text
.data/intelligence/reports/run-20260620T120001Z-a1b2c3d4.json
```

Every run has one report file. The file is atomically replaced as the run advances.

## Report Lifecycle

The orchestrator performs the following report writes:

```text
Create report with all stages pending
  -> mark stage running
  -> execute stage
  -> persist terminal stage result
  -> repeat for remaining stages
  -> finalize overall status and completion time
```

The report is created before intelligence stages begin.

Successful earlier stages remain recorded if a later stage fails. Stage failures continue to use the orchestrator's existing isolation boundary.

## Durable Writer

`FileIntelligenceProductionRunReportStore` writes reports with a temporary file followed by rename.

Writes through one store instance are serialized. The implementation is designed for the existing manual single-process workflow and does not add cross-process locking.

The report store is independent from artifact persistence:

- artifacts may be published in memory or to the durable artifact store;
- run reports are durable in both modes.

The optional worker argument `--report-root` can select a different runtime report directory.

## Reader

The report reader supports:

```text
getLatestRun()
getRun(runId)
listRecentRuns(limit)
```

The file-backed implementation also provides `getLatestSuccessfulRun()` for operational status APIs.

Recent runs are ordered deterministically by:

1. descending start time;
2. descending run id as a stable tie breaker.

Limits are bounded between 1 and 100.

Corrupted or incompatible report files are skipped so one damaged run does not suppress valid reports.

## Production API

The read-only endpoint is:

```text
GET /api/intelligence/runs
```

Latest run and latest successful run:

```text
GET /api/intelligence/runs?mode=latest
```

Recent run list:

```text
GET /api/intelligence/runs?mode=recent&limit=10
```

One run:

```text
GET /api/intelligence/runs?runId=<run-id>
```

API responses contain report metadata only:

- statuses;
- timings;
- output counts;
- warning counts;
- error counts.

Stage warning and error messages, artifact payloads, internal paths, and stack traces are not returned.

## Failure Recording

Stage warnings and safe error messages remain in the durable report file for local operational diagnosis.

The public API exposes only counts. If report storage cannot be read, the API returns a generic unavailable reason.

There is no retry, rollback, or recovery behavior.

## Durability Guarantees

The current file model guarantees:

- report persistence across application process restarts on the same durable filesystem;
- atomic replacement of each individual run report;
- preservation of completed stage records during later stage failure;
- deterministic recent-run ordering.

It does not guarantee:

- durability on ephemeral serverless filesystems;
- transactional writes across reports and artifacts;
- cross-process writer coordination;
- automatic cleanup or retention.

## Dashboard Integration

No Dashboard section was added.

The production API is lightweight, but adding a Dashboard consumer would introduce a new initial request and product surface. This sprint keeps observability available without changing Dashboard load behavior.

## Future Scheduler Compatibility

A future scheduler can invoke the existing orchestrator and consume the durable report contract without changing stage implementations.

The report lifecycle already exposes the fields needed for:

- last successful execution;
- failed-stage identification;
- output counts;
- execution duration;
- future freshness checks.

Scheduling, alerts, monitoring services, and retention policies remain separate future concerns.
