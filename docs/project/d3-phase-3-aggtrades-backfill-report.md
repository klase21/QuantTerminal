# D3 Phase 3 Aggregated Trades Full Historical Backfill Report

Generated: 2026-07-14T07:30:00.000Z

## 1. Executive Summary

The official Binance Vision USD-M daily Aggregated Trades inventory was discovered completely for all six governed instruments through the frozen 2026-07-12 cutoff. A typed per-record D2 contract, D3 candidate contract, exact string-safe parser, immutable execution snapshot, capacity gate, and resumable command surface were implemented. One real XRPUSDT daily Canary committed 24,898 immutable Aggregated Trade Facts with exact lineage and Coverage. Its exact rerun created no authoritative object.

The complete history was not launched. The immutable inventory contains 13,813 partitions and a conservative 10,249,907,317 records. Measured Canary growth supports a 13,000-byte per-record planning bound, requiring 133,299,958,629,815 PostgreSQL bytes including reserved remaining-dataset growth. Only 1,021,333,368,832 bytes were free. Status is BLOCKED_CAPACITY, not running or safely resumable full execution.

## 2. AggTrades Source and Availability

Source: official `data.binance.vision` Binance USD-M Futures daily `aggTrades` ZIP archives. Pattern: `data/futures/um/daily/aggTrades/{symbol}/{symbol}-aggTrades-{UTC day}.zip`. Archive format is one CSV with seven provider-native fields. Complete S3 prefix inventories proved contiguous availability with no hidden daily omissions.

| Instrument | Earliest | Final | Partitions | Compressed bytes |
|---|---:|---:|---:|---:|
| BTCUSDT | 2019-12-31 | 2026-07-11 | 2,385 | 43,712,717,072 |
| ETHUSDT | 2019-12-31 | 2026-07-11 | 2,385 | 41,246,789,849 |
| SOLUSDT | 2020-09-14 | 2026-07-11 | 2,127 | 14,100,500,644 |
| BNBUSDT | 2020-02-10 | 2026-07-11 | 2,344 | 11,594,748,594 |
| XRPUSDT | 2020-01-06 | 2026-07-11 | 2,379 | 11,467,303,580 |
| DOGEUSDT | 2020-07-10 | 2026-07-11 | 2,193 | 14,591,999,462 |

## 3. Field and Identity Semantics

The runtime preserves aggregate trade ID, first/last underlying trade IDs, price, quantity, millisecond source timestamp, UTC trade time, buyer-is-maker, instrument, venue, provider, Raw Object, checksum, and governance bindings. IDs remain decimal strings and never pass through JavaScript `number`. Provider scientific decimals such as `9.1257462E7` remain exact source strings and persist to PostgreSQL `numeric`. Identity binds provider, venue, symbol, and aggregate trade ID; ordering and execution metadata do not participate.

## 4. Canary and Idempotency

Canary: XRPUSDT, 2020-01-06, 364,309 downloaded bytes, SHA-256 `2c9711006cdabb3efbc0e2eeca91abb532d22bd3f51e325d2860640449e95a8c`. It parsed and accepted 24,898 rows, rejected 0, created 24,898 Facts, 24,898 submission outcomes, 24,898 lineage edges, one Raw Object, one Coverage decision, six durable checkpoints, and one completed Unit. Conflicts and retries were zero.

The terminal write completed before a slow read-only status query was cancelled. Persisted inspection proved the Unit, Coverage, checkpoints, Facts, and lineage complete. The exact Canary rerun returned `SKIPPED_ALREADY_COMPLETE`; all authoritative counts remained unchanged.

## 5. Execution Snapshot

Snapshot ID: `agg-trades-execution:734d5a61150a7b89d2fdee7210950b37393f27dfc456c6d643fe46987e280a8d`
Checksum: `734d5a61150a7b89d2fdee7210950b37393f27dfc456c6d643fe46987e280a8d`
Parent Manifest: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24` / `ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`
Partitions: 13,813; estimated records: 9,744,688,442; conservative records: 10,249,907,317; measured compressed source: 136,714,059,201 bytes.

## 6. Capacity Assessment

Measured before Canary: database 1,326,414,871 bytes; PostgreSQL filesystem free 1,022,096,220,160 bytes; Artifact free 667,802,218,496 bytes. Measured after Canary: database 1,636,080,663 bytes and PostgreSQL free 1,021,333,368,832 bytes. The 309,665,792-byte database increase over 24,898 records is approximately 12,437 bytes per record.

The snapshot reserves 133,248,795,121,000 bytes for conservative AggTrades storage plus 51,163,508,815 bytes for remaining existing dataset growth. Required total is 133,299,958,629,815 bytes. PostgreSQL capacity is short by 132,278,625,260,983 bytes. Artifact capacity is sufficient for the 136,714,059,201 measured compressed bytes, but PostgreSQL capacity is not. Expected duration is UNKNOWN because no safe full-scale throughput benchmark can be run before capacity remediation.

## 7. Launch Configuration

Target is redacted as `localhost:55432/quantterminal_backfill`; Artifact root is `D:\QuantTerminalData\raw-artifacts`. Global AggTrades partition concurrency and provider-download concurrency are both fixed at 1. Checkpoints are RAW, bounded CANDIDATE, and CANONICAL boundaries. Full `run` and `resume` fail closed with `BLOCKED_CAPACITY`; no full partition was launched.

The capacity-approved path uses the same governed per-partition engine sequentially, checks a durable stop marker between partitions, skips identity-reconciled completions, and supports instrument/date/max-partition filters. Graceful stop/resume is implemented but could not be live-executed past the capacity gate.

## 8. Actual Progress

Total 13,813; complete 1; pending 13,812; active 0; unavailable 0; gaps 0; failed 0; conflicts 0. Provider requests used for execution: 2 full Canary downloads (initial and field validation); inventory discovery and 18 bounded measurement downloads were separate preflight requests. Full-history throughput and ETA are not applicable because launch was blocked.

## 9. Persisted AggTrades Data

Raw Artifacts/Raw Objects 1 (364,309 bytes), Retrievals 1, parsed/accepted Candidates 24,898, rejected 0, Canonical Facts 24,898, submission outcomes 24,898, lineage 24,898, publication decisions 24,898 in `PENDING` (no publication performed), Coverage decisions 1, checkpoints 6, completed Units 1, retries 0, conflicts 0.

## 10. Per-Instrument Results

| Instrument | Complete | Remaining | Conservative records | Full execution |
|---|---:|---:|---:|---|
| BTCUSDT | 0 | 2,385 | 3,490,125,387 | capacity blocked |
| ETHUSDT | 0 | 2,385 | 2,923,522,571 | capacity blocked |
| SOLUSDT | 0 | 2,127 | 1,062,693,906 | capacity blocked |
| BNBUSDT | 0 | 2,344 | 863,116,865 | capacity blocked |
| XRPUSDT | 1 | 2,378 | 783,710,873 | Canary only |
| DOGEUSDT | 0 | 2,193 | 1,126,737,715 | capacity blocked |

## 11. Resume Commands

These commands contain no credentials. They remain capacity-gated:

```powershell
npx tsx workers/data-platform/runD3AggTradesBackfill.ts run --postgres-free-bytes <measured-free-bytes>
npx tsx workers/data-platform/runD3AggTradesBackfill.ts resume --postgres-free-bytes <measured-free-bytes>
npx tsx workers/data-platform/runD3AggTradesBackfill.ts status --postgres-free-bytes <measured-free-bytes>
npx tsx workers/data-platform/runD3AggTradesBackfill.ts stop
npx tsx workers/data-platform/runD3AggTradesBackfill.ts retry-failed --postgres-free-bytes <measured-free-bytes>
npx tsx workers/data-platform/runD3AggTradesBackfill.ts retry-gaps --postgres-free-bytes <measured-free-bytes>
npx tsx workers/data-platform/runD3AggTradesBackfill.ts reconcile
npx tsx workers/data-platform/runD3AggTradesBackfill.ts validate-samples
```

## 12. Reconciliation

AggTrades reconciliation is consistent with no affected partitions: one complete, 13,812 incomplete, zero active leases. Beginning/middle/end source-to-Canonical comparisons all passed. Funding reconciliation passed (19 complete), and OI reconciliation passed (7 complete). The existing OHLCV reconciler's correlated lineage query did not finish within several minutes and was cancelled read-only; bounded database checks showed no active lease or write interruption. This pre-existing query-plan limitation is not an AggTrades correctness defect but remains operational work.

## 13. Parallel-Safety Check

No OHLCV, Funding, or OI runner process was active during schema mutation or Canary execution. Dataset-specific IDs, Units, snapshots, and checkpoints are distinct. Existing immutable snapshots were untouched. The inherited unstaged OHLCV progress file was not edited by this task. D2 and D3 migrations applied only to `quantterminal_backfill` and re-ran idempotently.

## 14. Remaining Blockers

- `D3P3-AGG-B01`: PostgreSQL capacity is insufficient by 132,278,625,260,983 bytes under the conservative governed estimate. Full launch is blocked.
- `D3P3-AGG-L01`: The parent Manifest retains its historical stream-boundary normalizer binding. The immutable child execution snapshot explicitly binds the new per-record normalizer without changing the parent identity used by active dataset snapshots.
- `D3P3-AGG-L02`: Existing OHLCV read-only reconciliation has an unbounded correlated lineage query and was not certified in this run.
- `D3P3-AGG-L03`: AggTrades graceful stop/resume and failed/Gap-only retry commands are implemented but were not live-certified because the capacity gate correctly prevented full execution.
- `D3P3-AGG-L04`: The protected D4 D2-dependency bootstrap is pinned to migrations 001-004 and rejects the current D2 migration directory. This defect pre-existed this task with migrations 005/006; migration 007 remains outside that pinned inventory. D4 was not modified.
- `D3P3-AGG-L05`: Coverage stores per-record outcome IDs in one array. The 24,898-record Canary is verified, but million-record daily partitions are not live-certified at this boundary. Capacity remediation must include a bounded Coverage-cardinality proof before unattended launch.
- Retry policy remains explicitly `UNRESOLVED`; no invented policy version was introduced.

## 15. Tests

Passed: TypeScript; D1 contract regression; D2 Phase 1, Phase 2 unit, durable target, live migrations/checksums/idempotent rerun; D3 Phase 1, Phase 2 unit, enablement, commit boundary, integrated topology, live migration/checksum rerun; OHLCV/Funding/OI runner unit regressions; AggTrades parser, source identity, bigint/string identity, enumeration, snapshot checksum, capacity tests; real Canary; exact rerun; field samples; AggTrades/Funding/OI reconciliation.

The live insufficient-capacity launch probe returned `BLOCKED_CAPACITY` with zero attempted partitions. The OHLCV read-only reconciliation command was run but cancelled after its read-only correlated lineage query exceeded several minutes. AggTrades full stop/resume and retry paths were not live-run past the capacity gate. The D4 Phase 2C dependency unit suite passed, while the protected D4 foundation-bootstrap unit suite failed immediately with the inherited `D2_DEPENDENCY_INVENTORY_MISMATCH`. Broad topology certification was intentionally not repeated.

## 16. Files and Git State

Runtime: bounded D2 AggTrade contract, identity, typed writer, migration 007, D3 candidate/normalizer/source/snapshot/runtime, migration 003, and CLI runner. Tests: D2 fixtures/unit/integration bindings, D3 SQL inventory, and AggTrades suite. Reports: immutable snapshot, mutable progress, this report, readiness, blockers, and volume summary.

Branch `epic/d2-canonical-persistence`; initial and current HEAD `344d9e0182d56a16d74978942f2d808fc36142b4`. No files were staged, committed, tagged, or pushed. Package files and lockfiles did not change. `docs/project/d3-phase-3-ohlcv-progress.json` remains an inherited unstaged operational change.

## 17. Exact Next Step

`CAPACITY_EXPANSION_REQUIRED`: provision and certify at least 133,299,958,629,815 bytes of usable PostgreSQL capacity for the frozen scope (or approve a new persistent representation through a separate architecture decision). Re-run the measured capacity gate before `run`; do not reduce the immutable scope silently.

## 18. Final Status Rationale

Source, identities, field semantics, complete partition scope, real per-record persistence, exact lineage, Coverage, and idempotency are certified. Full execution cannot safely start because the measured and conservative database requirement exceeds available capacity by more than 132 TB. No full-history work was launched, and the status is therefore BLOCKED rather than SAFE TO RESUME.
