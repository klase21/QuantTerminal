# Intelligence Operations Console

## Purpose

The Intelligence Operations Console is an internal operational surface for answering:

```text
Is the intelligence platform healthy?
```

It consolidates visibility from the existing:

- Intelligence Production Orchestrator;
- durable artifact store;
- production run reports;
- scheduled production runner.

The console does not generate intelligence, trigger production, modify schedules, or expose research artifacts.

## Route

```text
/ops/intelligence
```

The route uses the existing QuantTerminal terminal shell and design language. It is intentionally excluded from primary product navigation because it is an internal operations page rather than a user research destination.

## Data Flow

```text
Durable artifact index metadata
Production run report reader
Scheduler state reader
Scheduler lock metadata
  -> operations snapshot service
  -> GET /api/intelligence/operations
  -> operations console
```

The client performs one lightweight request. It never reads filesystem-backed stores directly.

## Production Status

The summary row displays:

- latest run timestamp;
- latest overall status;
- latest duration;
- last successful run timestamp;
- next scheduled run.

All values come from existing durable run reports and scheduler state. No production conclusions are recomputed.

## Scheduler Visibility

The scheduler panel displays:

- enabled state;
- lock state;
- scheduler status;
- last run;
- next run;
- latest skip reason;
- configured job id.

The console is read-only. There is no enable, disable, schedule-edit, or manual-trigger action.

## Recent Runs

The console displays the ten most recent durable production reports.

Columns:

- run id;
- completion or start timestamp;
- overall status;
- duration.

No pagination or stage-detail expansion is included.

## Artifact Inventory

Artifact counts are read from:

```text
.data/intelligence/registry/artifact-index.json
```

The operations snapshot reads index metadata only. It does not open artifact payload files.

Counts are grouped by existing artifact type:

- `historical_analog`;
- `event_impact`;
- `replay_intelligence`;
- `market_memory`.

The console does not inspect artifact evidence, summaries, confidence, or producer metadata.

## Store Health

Three health states are exposed:

- `healthy`: store metadata exists and contains records;
- `empty`: store is readable but contains no generated state;
- `unavailable`: store metadata is invalid or unreadable.

The displayed stores are:

- artifact store;
- run report store;
- scheduler state.

Each source degrades independently. An unavailable scheduler state does not suppress available run-report or artifact inventory data.

## Operations API

The metadata-only endpoint is:

```text
GET /api/intelligence/operations
```

It returns:

- production run summaries;
- scheduler state and lock visibility;
- artifact counts;
- store health;
- snapshot timestamp.

It does not return:

- artifact payloads;
- raw market data;
- internal stack traces;
- mutation controls;
- scheduling controls;
- production trigger actions.

## Client Behavior

The console loads once when mounted.

A manual refresh icon repeats the metadata request. The request has a six-second client timeout. If refresh fails after data was loaded, the console preserves the last successful snapshot and shows a compact warning.

There is no polling.

## Limitations

- Health checks validate operational metadata, not every artifact payload.
- Artifact inventory counts include indexed artifacts regardless of archival or expiration state.
- File-backed visibility depends on the application process sharing the same durable filesystem.
- There is no authentication or role model specific to the operations route yet.
- There are no alerts, charts, historical trends, or monitoring integrations.
- The console cannot repair stores or clear locks.

## Future Monitoring Compatibility

A future monitoring system can consume the existing operations, run-report, and scheduler APIs.

Possible later additions include:

- stale-run alerts;
- schedule-overdue detection;
- artifact freshness policies;
- external uptime checks;
- operator authentication.

These additions should remain outside intelligence generation and preserve the current read-only console boundary.
