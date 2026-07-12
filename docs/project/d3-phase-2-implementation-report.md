# D3 V1 Phase 2 Implementation Report

## Baseline

- Branch: `epic/d2-canonical-persistence`
- HEAD: `1cb1c8d778033cfe89b4c23f51a7d70160b7d906`
- Baseline: dirty with approved uncommitted D3 Phase 0 and Phase 1 artifacts and bounded D2 report reconciliation
- Pre-existing changes were preserved

## Database Target Classification

`D3_ISOLATED_POSTGRES_URL` was absent. `DATABASE_URL` was absent. `D2_ISOLATED_POSTGRES_URL` was present but explicitly rejected as a D3 fallback. No URL or credential was logged, no PostgreSQL client was created, and no migration/reset operation ran.

## Changed Files

Phase 2 added isolated client/safety, migration/reset, adapter, unit expansion, test ports, D3 migration role/runtime additions, unit and integration harnesses, five architecture documents, this report, and a bounded ADR-009 clarification. Existing Phase 0/1 work remains present.

## Implemented Runtime Components

- D3-only target safety classification and bounded PostgreSQL client
- D3 migration discovery, ledger/checksum, dependency gate, and explicit reset
- Job deduplication and intentional rerun identity
- Run creation and deterministic Unit expansion
- fenced claim, heartbeat, checkpoint, Retrieval Attempt, and Candidate operations
- validation and quality history links
- one Candidate-to-submission uniqueness
- D2 result mapping and durable Population outcomes
- retry events, cancellation, aggregate state, watermark eligibility, resume reads, and reconciliation reads
- in-memory immutable object storage and fixture-only Normalizer/D2 ports

No executable provider, production object storage, production Worker loop, existing backfill connection, consumer migration, Coverage mutation, publication runtime, or canonical SQL write was introduced.

## Results

| Area | Result |
|---|---|
| Job and Unit identity | PASS - unit/static |
| Migration discovery and static SQL | PASS - static |
| D3 migrations applied | BLOCKED - D3 URL absent |
| Job deduplication live | BLOCKED |
| Run recovery live | BLOCKED |
| Lease/fencing live | BLOCKED |
| Checkpoints live | BLOCKED |
| Retrieval persistence live | BLOCKED |
| Object-storage test adapter | PASS - unit |
| Typed Candidate behavior | PASS - identity/unit; database behavior BLOCKED |
| D2 mapping | PASS - unit fake port; isolated integration BLOCKED |
| Retry and cancellation | PASS - contract mapping; live races BLOCKED |
| Partial aggregation | PASS - Phase 1 unit; live reconstruction BLOCKED |
| Watermark eligibility | PASS - unit mapping; persistence BLOCKED |
| Crash/recovery | BLOCKED |
| Real concurrency | BLOCKED |
| Privileges | BLOCKED |
| Reconciliation | BLOCKED |
| Query plans | BLOCKED |

## Tests Executed

- TypeScript: PASS
- D1 regression suite: PASS
- D2 Phase 1 suite: PASS
- D2 Phase 2 unit suite: PASS
- D3 Phase 1 suite: PASS, 30 checks
- D3 Phase 2 unit suite: PASS, 15 checks
- Isolated D3 integration entry point: BLOCKED before connection

Final scope validation also passed `git diff --check`, protected-path inspection, active runtime import inspection, and package/lockfile inspection. No production build was run because `AGENTS.md` prohibits it.

## Tests Blocked

All live migration, reset, PostgreSQL constraint, locking, concurrency, privilege, crash/recovery, reconciliation, and `EXPLAIN` checks are blocked by the missing dedicated target. The current integration suite also requires expansion to cover every specified live scenario before certification.

## Protected Systems

Existing Repository, SQLite, generic PostgreSQL, D2 contracts/migrations/runtime, historical backfills, providers, schedulers, workers, Coverage, Projection, Evidence, APIs, pages, UI, package files, lockfiles, environments, and deployment configuration remain unchanged.

## Limitations and Risks

- PostgreSQL DDL and adapter SQL have not executed.
- Role grants and denial boundaries are unverified.
- Event/state reconciliation is only implemented for Job and Unit initial paths.
- Crash injection and every required concurrency race are not yet implemented in the live suite.
- Fixture ports prove orchestration boundaries, not production provider or storage behavior.
- No production lease durations, retry numbers, quality thresholds, or SLAs are defined.

## Blockers

Phase 3 remains blocked until a dedicated safe D3 target is provided and the complete live verification suite passes, including stale-worker rejection, candidate/submission uniqueness, conflict/eligibility behavior, crash recovery, cancellation races, event reconciliation, privileges, and query plans.

## Exact Next Step

Provide a disposable database through `D3_ISOLATED_POSTGRES_URL`, distinct from `DATABASE_URL` and `D2_ISOLATED_POSTGRES_URL`. Then expand and execute the live suite, make only bounded corrections, and rerun all regressions.

## Final Gate

`NOT SAFE TO IMPLEMENT D3 PHASE 3`
