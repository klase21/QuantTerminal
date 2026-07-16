# MVP Refresh Run Report

PostgreSQL certification time: 2026-07-16T00:39:34.756Z

## Outcome

`NOOP`

After the two-hour finalization delay, no UTC day beyond the active `2026-07-15T00:00:00.000Z` boundary was eligible at audit time. The planner returned `NO_CLOSED_WINDOW_AVAILABLE`. The next candidate interval is `[2026-07-15T00:00:00.000Z, 2026-07-16T00:00:00.000Z)` and cannot become eligible before `2026-07-16T02:00:00.000Z`. No acquisition, canonical commit, Evidence generation, Projection generation, Replay materialization, candidate build, publication, exposure, or Production activation occurred.

Two data-path blockers remain even though PostgreSQL integration is now certified and the initial cycle itself was a timing `NOOP`:

1. `FUNDING_REFRESH_PATH_UNAVAILABLE`: the repository has provider request/parser logic only behind the deferred compatibility runner and related gap helper, not a separate bounded canonical refresh command. The protected Funding commands were not invoked.
2. OHLCV, OI, AggTrades, Evidence, and Projection paths still require bounded commit/generation entry points before an eligible candidate cycle can run without broad progress-file or corpus behavior.

## Reproducible commands

```powershell
npx tsc --noEmit
npx tsx tests/data-platform/mvp-refresh/runUnitSuite.ts
npx tsx workers/data-platform/runMvpRefresh.ts plan
npx tsx workers/data-platform/runMvpRefresh.ts availability
npx tsx workers/data-platform/runMvpRefresh.ts migrate
npx tsx workers/data-platform/runMvpRefresh.ts run
```

Only the first four commands are environment-independent. `migrate` and `run` require the isolated URL to be present in the worker environment. No command prints it.

## Results

- TypeScript: PASS.
- Pure refresh suite: PASS, 58 assertions.
- Migration artifact checksum: `894968a8b5540af3a396a6cb2860f0850d553b126ff66cd7795a6059519abf7f`.
- PostgreSQL driver: `postgres` 3.4.9.
- Static client trace: the original environment string is passed directly to the driver; safety parsing is separate; no username, password, database, or environment object is overridden; no decoded or redacted URL is used for connection.
- Environment inheritance: PASS in root shell and Node child.
- Prior authentication SQLSTATE: `28P01`, resolved before certification.
- Current same-factory preflight: PASS with expected database, role, and PostgreSQL 16.
- Migration application/reapplication: APPLIED / SKIPPED with identical checksum.
- Relations/indexes/constraints: 15 / 30 / 77.
- PostgreSQL lease/fencing, expired recovery, stale-worker rejection: PASS.
- Persisted checkpoint recovery: PASS at ACQUIRED, NORMALIZED, and COMMITTED.
- Candidate-build crash recovery: PASS, lifecycle remained BUILDING and inactive.
- Secret-bearing persisted rows: 0.
- Database/control-plane bytes: 8,657,943 / 573,440.
- Planned units for the next eligible day: 24 (six instruments x four mandatory datasets).
- Funding units that will block without a new safe path: 6.
- Raw Artifact bytes: 0.
- New canonical/D4/serving/Replay bytes: 0.
- Candidate release: not generated.
- Production mutation: none.
