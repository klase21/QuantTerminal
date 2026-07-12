# D3 V1 Phase 2 PostgreSQL Certification Report

## Certification Scope

This report records live PostgreSQL verification of the isolated D3 Population Orchestration Runtime at baseline commit `4bf6f5d` and tag `d3-population-runtime-v1`. It does not certify providers, production object storage, existing backfills, consumers, or deployment cutover.

## Target Safety

| Check | Result |
|---|---|
| Host is `localhost` | PASS |
| Port is `55432` | PASS |
| Database is `quantterminal_d3_isolated` | PASS |
| D3 isolated-target policy | PASS |
| Explicit reset opt-in | PASS |
| D2 URL is not reused | PASS |
| Application database URL is not reused | PASS |
| Credentials redacted | PASS |

PostgreSQL server version: `16.13 (Debian 16.13-1.pgdg13+1)`.

## Previously Verified

Before live certification, TypeScript, D1, D2 Phase 1, D2 Phase 2 unit, D3 Phase 1, and D3 Phase 2 unit suites passed. Protected systems, package files, lockfiles, and active runtime imports were clean.

## Live PostgreSQL Matrix

| # | Verification | Result |
|---:|---|---|
| 1 | Fresh D3 migrations and rerun skip | PASS |
| 2 | Applied migration checksum enforcement | PASS |
| 3 | D3 reset preserves D2 dependency boundary | PASS |
| 4 | D3 reset followed by clean reapplication | PASS |
| 5 | Job logical deduplication and intentional rerun identity | PASS |
| 6 | Run creation and deterministic Unit expansion | PASS |
| 7 | Parallel Workers claim distinct eligible Units | PASS |
| 8 | Exactly one Worker owns one Unit fencing boundary | PASS |
| 9 | Fencing token increases after release/expiration and reclaim | PASS |
| 10 | Stale Worker heartbeat, checkpoint, and completion rejected | PASS |
| 11 | Lease release and reclaim are durable | PASS |
| 12 | Retrieval outcomes and retry classification persist | PASS |
| 13 | Raw-persisted, candidates-ready, and canonical-outcome checkpoints persist | PASS |
| 14 | Durable state survives controlled crash boundaries | PASS |
| 15 | OHLCV Candidate identity and idempotency | PASS |
| 16 | Funding Candidate identity and idempotency | PASS |
| 17 | Open Interest Candidate identity and idempotency | PASS |
| 18 | Liquidation Candidate identity and idempotency | PASS |
| 19 | Stream-manifest Candidate identity and idempotency | PASS |
| 20 | Incompatible immutable Candidate content creates durable conflict | PASS |
| 21 | Validation and Data Quality links persist | PASS |
| 22 | One logical Candidate-to-D2 submission | PASS |
| 23 | D2 SUCCESS, DUPLICATE, CONFLICT, REJECTED, RETRYABLE_FAILURE mapping | PASS |
| 24 | D2 CONFLICT cannot complete Unit and blocks Watermark eligibility | PASS |
| 25 | Failed or unresolved D2 submission blocks Watermark eligibility | PASS |
| 26 | Retry scheduling reuses durable Candidate and Manifest identity | PASS |
| 27 | Cancellation race prevents new work and stale mutation | PASS |
| 28 | Partial Job aggregation | PASS |
| 29 | D2 success before Population outcome is deterministically reconcilable | PASS |
| 30 | Job, Run, and Unit event/materialized-state reconciliation | PASS |
| 31 | Actual role privilege denials | PASS |
| 32 | Eight bounded `EXPLAIN` paths execute and are reviewable | PASS |

## Concurrency Outcomes

- Same Unit claim: one owner acquired the lease; the competing claim did not acquire the same fencing boundary.
- Distinct Units: parallel Workers acquired distinct eligible Units.
- Reclaim: the replacement lease received a strictly higher fencing token.
- Stale owner: heartbeat, checkpoint, and completion mutations failed closed.
- Candidate identity: identical persistence was idempotent; incompatible immutable content was recorded as conflict.
- Cancellation: cancellation prevented subsequent eligible claim and rejected stale active-worker mutation.

## D2 Outcome and Watermark Rules

All five closed D2 result variants were persisted and mapped. `CONFLICT` could not complete a Unit successfully. `CONFLICT`, failed submission, and unresolved submission each blocked Watermark eligibility. A committed D2 success with a missing Population outcome was recovered through deterministic submission identity rather than resubmission.

## Privileges

Live denial checks confirmed:

- read-only role cannot mutate Population records;
- Worker role cannot arbitrarily update Unit materialized state;
- Scheduler role cannot delete Candidate history;
- Coordinator role cannot delete event history.

The migration owner remains the schema/migration authority. Runtime roles do not receive arbitrary history deletion or schema ownership.

## Reconciliation

The suite reconstructed Job, Run, and Unit state from append-only events and compared it with materialized state. It also verified durable relationships among leases, checkpoints, attempts, candidates, submissions, D2 outcomes, conflicts, and Watermark eligibility. Inconsistencies fail closed; the certification suite does not silently repair them.

## Query Plan Review

`EXPLAIN` was executed for:

- eligible Unit claim;
- active lease heartbeat;
- resumable Units;
- Job status;
- Unit event reconstruction;
- retry-ready lookup;
- Candidate identity;
- unresolved D2 outcome reconciliation.

The review is fixture-scale only. It demonstrates bounded executable paths and inspectable plans, not production throughput or latency.

## Bounded Corrections

Corrections were limited to D3 PostgreSQL migrations, adapter/reset/schema code, deterministic fixtures, the isolated harness, and this certification suite. They addressed migration dependencies, reset ownership, Job/Run scoping, lease fencing, durable conflict storage, checkpoint prerequisites, cancellation/event reconciliation, and bounded role grants.

## Final Regression

| Suite | Result |
|---|---|
| TypeScript | PASS |
| D1 | PASS |
| D2 Phase 1 | PASS |
| D2 Phase 2 unit | PASS |
| D3 Phase 1 | PASS |
| D3 Phase 2 unit | PASS |
| D3 live integration | PASS |
| D3 live certification | PASS |
| Protected-system scan | PASS |
| Active-runtime import scan | PASS |
| Package and lockfile review | PASS |

## Limitations

- Production-scale performance is not certified.
- Live providers and production object storage were intentionally not contacted.
- Existing backfills and consumers remain disconnected.
- A final read-only identity probe confirmed `quantterminal_d2_isolated` remained separate and had no D3 `population` schema.

## Certification Decision

`SAFE TO IMPLEMENT D3 PHASE 3 WITH LIMITATIONS`
