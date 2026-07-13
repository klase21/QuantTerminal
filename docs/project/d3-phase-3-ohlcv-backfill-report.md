# D3 Phase 3 OHLCV Full Historical Backfill Report

## Status

`SAFE TO RESUME`

The complete certified OHLCV scope was enumerated and execution began against the integrated durable target. The current interactive session stopped at a safe partition boundary after 21 of 13,813 partitions were reconciled complete. Exactly 13,792 partitions remain pending; there are no active leases, gaps, failures, conflicts, or hidden exclusions.

## Baseline

- Branch: `epic/d2-canonical-persistence`
- Initial HEAD: `ca906cf0535ad92c53a835589b1f4dc52a09bf70`
- Initial worktree: clean
- Parent Manifest: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Parent checksum: `ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Initial Canonical Facts / Raw Objects / Coverage decisions: `288 / 1 / 1`
- Initial Jobs / Runs / Units: `1 / 1 / 1`
- D2 and D3 migrations: checksum-stable skips
- D3-to-D2 foreign keys: `16/16` validated

## Execution Snapshot

- Snapshot ID: `ohlcv-execution:40697e4c234c6c087999e02e024d367f7aa2aa4f90471d7c67179cae589769ee`
- Snapshot checksum: `40697e4c234c6c087999e02e024d367f7aa2aa4f90471d7c67179cae589769ee`
- Dataset/provider: Binance Vision USD-M Futures OHLCV
- Resolution: `5m`
- Frozen cutoff: `2026-07-12T00:00:00.000Z`
- Final eligible partition: `2026-07-11`
- Partitions: `13,813`
- Initial already-complete partitions: `1`
- Initial pending partitions: `13,812`
- Estimated rows/Facts: `3,978,144`
- Measured Canary archive: `13,010` bytes
- Estimated compressed source: `179,707,130` bytes
- Conservative measured-relation PostgreSQL estimate: `51,163,508,815` bytes at the latest checkpoint

The immutable snapshot is separate from operational progress. The parent Manifest identity did not change when progress changed.

## Availability Boundaries

| Instrument | Earliest verified day | Discovery evidence | Final day | Partitions |
|---|---|---|---|---:|
| BNBUSDT | 2020-02-10 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,344 |
| BTCUSDT | 2019-12-31 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,385 |
| DOGEUSDT | 2020-07-10 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,193 |
| ETHUSDT | 2019-12-31 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,385 |
| SOLUSDT | 2020-09-14 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,127 |
| XRPUSDT | 2020-01-06 | Binance Vision prefix index plus HEAD 200 | 2026-07-11 | 2,379 |

Dates before these source boundaries are excluded as unavailable before verified provider availability, not classified as gaps.

## Launch Configuration

- Global active-partition policy: `4`
- Binance Vision download concurrency: `2`
- Unit boundary: one instrument and one UTC day
- Checkpoints: Raw, Candidate, Canonical
- Lease duration: two hours with fencing
- Retry policy reference: `UNRESOLVED`; no numeric retry policy was invented
- Artifact root: `D:\QuantTerminalData\raw-artifacts`
- Redacted database: `localhost:55432/quantterminal_backfill`

Available capacity at launch was `667,807,346,688` Artifact bytes and approximately `1,023,675,822,080` PostgreSQL-filesystem bytes. Capacity was sufficient for the estimates.

## Actual Progress

| State | Count |
|---|---:|
| Total | 13,813 |
| Complete | 21 |
| Already complete at snapshot creation | 1 |
| Populated by full-history runner | 20 |
| Pending | 13,792 |
| Active | 0 |
| Gaps | 0 |
| Unavailable / not applicable | 0 / 0 |
| Retryable / exhausted failures | 0 / 0 |
| Conflicts / blocked | 0 / 0 |

The final observed throughput was approximately `108.4` partitions/hour over interactive elapsed time, including validation and review pauses. The resulting remaining-duration estimate was approximately 127 hours. This is an operational estimate, not a completion claim.

## Persisted Data

| Measure | Current total | Added after Canary baseline |
|---|---:|---:|
| Raw Artifacts / Raw Objects | 21 | 20 |
| Downloaded / stored bytes | 242,873 | 229,863 |
| Retrievals | 21 | 20 |
| Parsed and accepted rows | 5,660 | 5,372 |
| Rejected Candidates | 0 | 0 |
| Canonical Facts | 5,660 | 5,372 |
| Submission links / outcomes | 5,660 / 5,660 | 5,372 / 5,372 |
| Lineage edges | 5,660 | 5,372 |
| PENDING publication decisions | 5,660 | 5,372 |
| Coverage decisions | 21 | 20 |
| Checkpoints | 63 | 60 |
| Retries / conflicts | 0 / 0 | 0 / 0 |

## Per-Instrument Progress

| Instrument | Expected | Complete | Remaining | Gaps | Failures | Current Facts |
|---|---:|---:|---:|---:|---:|---:|
| BNBUSDT | 2,344 | 3 | 2,341 | 0 | 0 | 768 |
| BTCUSDT | 2,385 | 5 | 2,380 | 0 | 0 | 1,440 |
| DOGEUSDT | 2,193 | 3 | 2,190 | 0 | 0 | 756 |
| ETHUSDT | 2,385 | 4 | 2,381 | 0 | 0 | 1,152 |
| SOLUSDT | 2,127 | 3 | 2,124 | 0 | 0 | 780 |
| XRPUSDT | 2,379 | 3 | 2,376 | 0 | 0 | 764 |

First-day partitions for BNB, DOGE, SOL, and XRP are partial activation-day archives with 192, 180, 204, and 188 real rows respectively. They are populated partitions, not gaps and not padded to 288 rows.

## Stop And Resume

A ten-partition tranche was interrupted using the stop command. Two in-flight partitions completed, no third partition began, active leases returned to zero, and no false Job or Run completion was written. Resume then populated only the next two incomplete partition identities.

```powershell
npx tsx workers/data-platform/runD3OhlcvBackfill.ts run --max-partitions 4
npx tsx workers/data-platform/runD3OhlcvBackfill.ts status
npx tsx workers/data-platform/runD3OhlcvBackfill.ts stop
npx tsx workers/data-platform/runD3OhlcvBackfill.ts resume --max-partitions 4
npx tsx workers/data-platform/runD3OhlcvBackfill.ts retry-failed --max-partitions 4
npx tsx workers/data-platform/runD3OhlcvBackfill.ts retry-gaps --max-partitions 4
npx tsx workers/data-platform/runD3OhlcvBackfill.ts reconcile
```

No command contains credentials. Successful Units are excluded through persisted identity reconciliation and are not repeated as new logical work.

## Reconciliation

- Consistent: `true`
- Reason codes: none
- Affected partitions: none
- Complete/incomplete: `21 / 13,792`
- Active leases: `0`
- Facts equal Candidates, submissions, outcomes, lineage, and publication decisions: PASS
- Complete partitions equal Raw Objects, Retrievals, Coverage decisions, and one three-checkpoint chain per partition: PASS

No repair was performed.

## Real Data Validation

Read-only validation downloaded earliest, midpoint, and latest source partitions for every governed instrument. Three deterministic source rows per partition were compared against Canonical values, exact Artifact checksum, Candidate identity, Fact identity/version, and lineage.

- Partitions checked: `18`
- Deterministic rows checked: `54`
- Exact matches: `54`
- Rejections or mismatches: `0`

## Bounded Corrections

The first enumeration reached the completion query and failed before snapshot creation because PostgreSQL parsed the alias `day` as syntax. The alias was changed to `utc_day`; no provider boundary, database object, or Manifest identity was altered. A later capacity query initially crossed D3 schema privileges from the D2 connection and was split into D2-owned and D3-owned relation-size queries. Both corrections were bounded runtime defects.

## Validation

- TypeScript: PASS
- D1 regression: PASS
- D2 Phase 1: PASS
- D2 Phase 2 unit: PASS
- D2 durable boundary: PASS
- D3 Phase 1: PASS
- D3 Phase 2 unit: PASS
- D3 Phase 3 enablement: PASS
- D3-to-D2 commit boundary: PASS
- Integrated topology: PASS
- OHLCV execution identity/enumeration/concurrency suite: PASS
- Graceful stop and resume with real partitions: PASS
- Failed-only and Gap-only empty-selection probes: PASS
- Snapshot checksum validation: PASS
- Live persisted reconciliation: PASS
- Six-instrument earliest/middle/latest source comparison: PASS
- `git diff --check`: PASS (line-ending notices only)
- Credential-pattern scan over changed runtime, tests, and reports: PASS
- Protected D4, consumer, and existing persistence scope scan: PASS
- Package, lockfile, environment, Next.js, and Vercel change scan: PASS

## Repository State

- Branch: `epic/d2-canonical-persistence`
- HEAD: `ca906cf0535ad92c53a835589b1f4dc52a09bf70`
- Staged files: none
- Automatic commit or tag: none
- Parent Backfill Manifest: unchanged
- D4 and protected consumer files: unchanged
- Package and lockfiles: unchanged
- Active backfill process: none

## Remaining Work

The OHLCV execution is incomplete but safely resumable. Non-OHLCV provider certification, approved numeric retry policy, final Gap Repair, exhaustive crash timing, and final Coverage certification remain assigned to their existing later boundaries.
