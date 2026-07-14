# D3 Phase 3 Funding Full Historical Backfill Report

## 1. Executive Summary

- Branch: `epic/d2-canonical-persistence`
- Baseline HEAD: `789a81764b28113541e3829069e6f8d14d0d6692`
- Initial task state: inherited mutable `d3-phase-3-ohlcv-progress.json` only; no Funding implementation or progress files existed.
- Status: safely resumable. The complete Funding scope was enumerated, a real Canary and deterministic rerun passed, and the full snapshot was started.
- Progress at the safe boundary: 19 of 459 partitions complete, 440 pending, 0 active, 0 failed, 0 gaps, and 0 conflicts.
- Persisted real data: 1,331 Funding Facts, 1,331 lineage links, 1,331 pending publication records, and 19 Coverage eligibility decisions.

## 2. Funding Source and Availability

The governed primary source is Binance Vision USD-M Futures monthly Funding archives. The explicit recent-tail source is Binance USD-M Futures `GET /fapi/v1/fundingRate`. Sources are never silently combined: every partition identity binds `BINANCE_VISION_MONTHLY` or `BINANCE_OFFICIAL_REST_TAIL` and its provider identity.

| Instrument | First archive | First eligible event | Final eligible event | Partitions |
| --- | --- | --- | --- | ---: |
| BNBUSDT | 2020-02 | 2020-02-10T16:00:00.009Z | 2026-07-11T16:00:00.000Z | 78 |
| BTCUSDT | 2020-01 | 2020-01-01T00:00:00.000Z | 2026-07-11T16:00:00.000Z | 79 |
| DOGEUSDT | 2020-07 | 2020-07-10T09:00:00.000Z activation floor | 2026-07-11T16:00:00.000Z | 73 |
| ETHUSDT | 2020-01 | 2020-01-01T00:00:00.000Z | 2026-07-11T16:00:00.000Z | 79 |
| SOLUSDT | 2020-09 | 2020-09-14T07:00:00.000Z activation floor | 2026-07-11T16:00:00.000Z | 71 |
| XRPUSDT | 2020-01 | 2020-01-06T08:20:00.000Z activation floor | 2026-07-11T16:00:00.000Z | 79 |

Discovery used the provider-native S3 prefix inventory and bounded REST queries. The inventory contains 453 monthly archives and six bounded REST-tail partitions. Monthly archives are ZIP/CSV with SHA-256 verification; REST-tail payloads are bounded JSON with SHA-256 verification. Funding remains event cadence (`event-8h`); no synthetic 5-minute rows, forward fill, or zero substitution is used.

## 3. Execution Snapshot

- Snapshot ID: `funding-execution:c401daca56886a847ade538e7a1c41b1de61f48d63cd086a9ed920f86e527bd5`
- Snapshot checksum: `c401daca56886a847ade538e7a1c41b1de61f48d63cd086a9ed920f86e527bd5`
- Parent Manifest ID: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Parent Manifest checksum: `ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
- Frozen cutoff: `2026-07-12T00:00:00.000Z`
- Partitions: 459 (453 archive, 6 REST tail)
- Estimated events: 41,541
- Estimated source bytes: 404,011; measured provider inventory bytes are estimates, not execution totals.
- Available Artifact capacity at launch: 667,802,411,008 bytes.

Changing source scope, eligibility boundary, cadence, governed instruments, parent Manifest, or cutoff changes the snapshot identity. Mutable progress is stored separately.

## 4. Canary and Idempotency

The real Canary was `BTCUSDT-fundingRate-2020-01.zip` from Binance Vision.

- Downloaded bytes: 825
- SHA-256: `7f81b2f3694d13779e7e896b69d60cd61e9444d7b9f9e90df761935e1c1b76e2`
- Parsed and accepted events: 93
- Rejected events: 0
- Canonical Facts created: 93
- Lineage links: 93
- Coverage decisions: 1
- Conflicts: 0

Deterministic source/Canonical samples matched exactly:

| Position | Funding event time | Funding rate | Interval | Canonical version |
| --- | --- | ---: | ---: | ---: |
| Beginning | 2020-01-01T00:00:00Z | -0.00012359 | 8 hours | 1 |
| Middle | 2020-01-16T08:00:00Z | 0.00041191 | 8 hours | 1 |
| End | 2020-01-31T16:00:00Z | 0.00039858 | 8 hours | 1 |

The exact rerun reconciled the deterministic partition as already complete. Before and after remained: one authoritative Raw Object, 93 Candidates, 93 Canonical Facts, 93 lineage links, and one Coverage decision. Authoritative count increase was zero.

## 5. Launch Configuration

- PostgreSQL: `localhost:55432/quantterminal_backfill` (credentials redacted)
- Artifact root: `D:\QuantTerminalData\raw-artifacts`
- Funding active partitions: 1
- Funding provider downloads: 1
- Unit: one source month or one bounded REST-tail interval
- Lease/fencing, checkpoints, Candidate persistence, D2 commit, Coverage, and terminal state use the certified D3 runtime.

An additive D2 migration, `005_funding_event_metadata.sql`, was required because the existing Funding table could not retain the governed canonical instrument ID, market type, or provider Funding interval. It was applied only after zero active OHLCV leases were verified. Migrations 001-004 skipped, 005 applied with checksum `9919d859b5912df8472a510d9a42262e4b3553130f226973588eea5772c836df`, and an immediate rerun skipped 001-005.

## 6. Actual Progress

- Total: 459
- Complete: 19
- Pending: 440
- Active: 0
- Gaps/unavailable/failed/conflicts: 0/0/0/0
- Source retrieval records: 20 (one pre-commit development attempt plus 19 authoritative completed partitions)
- Downloaded retrieval bytes: 32,011
- Stored authoritative Artifacts: 19, totaling 31,186 bytes
- Throughput at report boundary: 74.98 partitions/hour
- Estimated remaining duration at that bounded measured rate: 21,125,928 ms (estimate only)

## 7. Persisted Funding Data

- Parsed/accepted Candidates: 1,331
- Rejected Candidates: 0
- Canonical Facts: 1,331
- Canonical submissions/outcomes: 1,331/1,331
- Canonical reuse during full launch: 0; the Canary rerun was skipped by authoritative partition reconciliation
- Lineage/publication: 1,331/1,331
- Coverage/checkpoints: 19/58
- Retry records: 1, for the bounded Canary implementation remediation
- Conflicts: 0

## 8. Per-Instrument Results

| Instrument | Complete | Remaining | Canonical Facts | Persisted range |
| --- | ---: | ---: | ---: | --- |
| BNBUSDT | 4 | 74 | 274 | 2020-02-10T16:00:00.009Z to 2026-07-11T16:00:00Z |
| BTCUSDT | 5 | 74 | 396 | 2020-01-01T00:00:00Z to 2026-07-11T16:00:00Z |
| DOGEUSDT | 1 | 72 | 33 | 2026-07-01T00:00:00Z to 2026-07-11T16:00:00Z |
| ETHUSDT | 4 | 75 | 306 | 2020-01-01T00:00:00Z to 2026-07-11T16:00:00Z |
| SOLUSDT | 1 | 70 | 33 | 2026-07-01T00:00:00Z to 2026-07-11T16:00:00Z |
| XRPUSDT | 4 | 75 | 289 | 2020-01-06T16:00:00Z to 2026-07-11T16:00:00Z |

## 9. Resume Commands

```powershell
npx tsx workers/data-platform/runD3FundingBackfill.ts run --max-partitions 1
npx tsx workers/data-platform/runD3FundingBackfill.ts status
npx tsx workers/data-platform/runD3FundingBackfill.ts stop
npx tsx workers/data-platform/runD3FundingBackfill.ts resume --max-partitions 1
npx tsx workers/data-platform/runD3FundingBackfill.ts retry-failed --max-partitions 1
npx tsx workers/data-platform/runD3FundingBackfill.ts retry-gaps --max-partitions 1
npx tsx workers/data-platform/runD3FundingBackfill.ts reconcile
```

`--instrument`, `--from`, and `--to` provide bounded scope. Commands use environment configuration and print no credentials.

## 10. Reconciliation

Result: consistent for all launched partitions.

- 1,331 Candidates = 1,331 resolved submissions = 1,331 committed/duplicate outcomes = 1,331 Facts = 1,331 lineage links = 1,331 publication records.
- 19 completed Units = 19 eligible Coverage decisions.
- Duplicate Candidate identities: 0.
- Completed Units missing Canonical checkpoint or Coverage: 0.
- Active Funding leases: 0.
- Snapshot remainder is exact: 440 partitions.
- Real source validation: 57 of 57 beginning/middle/end samples matched across 19 completed partitions and all six instruments.

## 11. OHLCV Parallel-Safety Check

Before Funding launch, the live database showed zero active OHLCV leases, zero completed OHLCV Units missing Coverage or Canonical checkpoints, and zero Funding/OHLCV Unit identity collisions. Funding uses dataset- and cadence-bound identities and dataset-specific checkpoints. The OHLCV snapshot and runner were not modified. The inherited OHLCV progress-file modification remains separate and unstaged.

## 12. Bounded Corrections and Remaining Work

Bounded corrections:

- Added exact Funding event metadata to D2 persistence because the approved canonical contract could not retain required truth fields.
- Accepted provider scientific-notation rates and canonicalized them as exact decimal strings.
- Made Funding retry event/checkpoint identities fencing-token-aware while keeping Candidate and Canonical identities stable.
- Resumed the same deterministic Unit after a failed development attempt; no second logical Unit was created.
- Corrected sample validation to apply governed activation and cutoff eligibility before selecting samples.

The historical execution remains incomplete. There are 440 known partitions to resume. No Funding source, identity, persistence, lineage, checkpoint, or reconciliation blocker remains at this boundary.

## 13. Validation

Passed:

- `npx tsc --noEmit --incremental false`
- D2 Phase 2 unit suite
- D2 durable-boundary suite
- D3 Phase 2 unit suite
- D3 Phase 3 enablement suite
- D3-to-D2 commit-boundary suite
- integrated-topology suite
- Funding identity/enumeration/source suite (11 checks)
- real Funding Canary and deterministic rerun
- live Funding reconciliation
- 57/57 multi-instrument real source-to-Canonical samples
- `git diff --check`

The legacy OHLCV CLI reconciliation command hung without output; the two read-only process trees started by this task were terminated. Equivalent live read-only invariants passed directly against PostgreSQL. No OHLCV execution process was stopped.

## 14. Exact Next Step

Resume the immutable Funding snapshot with one active partition while OHLCV shares the target:

`npx tsx workers/data-platform/runD3FundingBackfill.ts resume --max-partitions 1`

Final status: `D3 FUNDING FULL HISTORICAL BACKFILL SAFE TO RESUME`.
