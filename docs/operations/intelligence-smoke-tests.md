# Intelligence Platform Smoke Tests

## Purpose

The Intelligence Platform smoke test verifies that the v1.0-rc1 production path and its durable operational stores are alive.

It is a lightweight operational test, not a correctness or performance benchmark.

## Run

From the repository root:

```powershell
npm run test:intelligence
```

The command exits with:

- `0` when every assertion passes;
- `1` when one or more assertions fail.

## Checks

The runner verifies:

1. The Scheduled Production Runner can execute or skip safely.
2. A durable latest production run exists.
3. The durable run-report store can list recent runs.
4. Scheduler state exists and is readable.
5. The durable artifact registry is readable.
6. The operations snapshot returns a latest run.
7. The operations snapshot returns a readable recent-runs array.
8. Artifact, run-report, and scheduler store health return recognized degraded or healthy states.

Recognized store states:

- `healthy`;
- `empty`;
- `unavailable`.

`empty` and `unavailable` are accepted as graceful degradation for the store-health assertions. Separate assertions still require a latest run and scheduler state, so an uninitialized production environment fails clearly.

## Scheduler Behavior

The smoke test invokes the existing:

```text
runScheduledProduction()
```

It does not bypass the scheduler or orchestrator.

Possible outcomes:

- production executes when due;
- production skips when disabled;
- production skips when not due;
- production skips when another run holds the lock;
- production skips safely when scheduler state is unavailable.

Afterward, the remaining assertions determine whether the durable platform state is valid.

## Data Safety

The smoke test:

- does not delete `.data` contents;
- does not reset scheduler state;
- does not clear locks;
- does not remove artifacts;
- does not remove run reports;
- does not fabricate intelligence.

If production is due, the existing scheduled runner may generate normal production caches, artifacts, reports, and scheduler state. These are the same side effects as a normal scheduled production invocation.

No fault injection is performed by this runner. Reliability fault tests should use isolated temporary roots.

## CLI Output

Example:

```text
INTELLIGENCE PLATFORM SMOKE TEST: PASS
Checks passed: 10
Checks failed: 0

[PASS] Scheduled production runner: Skipped safely: not_due.
[PASS] Latest production run exists: run-... (succeeded).
```

Failures include the check name and a concise reason.

## What It Does Not Check

The smoke test does not verify:

- Historical Analog scoring correctness;
- Event Impact statistical correctness;
- Market Memory semantic quality;
- artifact payload contents;
- Replay behavior;
- browser rendering;
- Operations Console layout;
- scheduler timing accuracy;
- production performance thresholds;
- network provider availability;
- distributed filesystem behavior.

## When To Run

Run the smoke test:

- before an RC deployment;
- after production pipeline changes;
- after scheduler or durable-store changes;
- after restoring `.data` from backup;
- after moving the application to a new host;
- when `/ops/intelligence` reports missing or unavailable state.

For source-level validation, also run:

```powershell
npx.cmd tsc --noEmit --pretty false --incremental false
```
