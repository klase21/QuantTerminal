# D3 Phase 3 AggTrades Segment Storage Report

## 1. Executive Summary

The row-per-event PostgreSQL design was replaced for full-history execution by immutable Snappy-compressed Parquet Segments with additive D2 Segment-v2 manifests. The legacy XRPUSDT row Canary remains unchanged at 24,898 Facts. D2 migration `008` applied atomically and an immediate rerun skipped migrations `001` through `008` with stable checksums.

The real XRPUSDT 2020-01-06 Segment Canary committed one manifest, one source lineage edge, one publication decision, one Candidate, one outcome, one bounded Coverage decision, and one checkpoint. Its exact rebuild and D2 commit returned `DUPLICATE`. The capacity gate passed with a narrow Artifact margin, and the full snapshot started by completing BTCUSDT 2019-12-31. Execution stopped at a safe boundary with zero active leases.

## 2. Previous Row-Model Capacity Finding

- Frozen partitions: 13,813.
- Conservative events: 10,249,907,317.
- Compressed source: 136,714,059,201 bytes.
- Row-model PostgreSQL requirement: 133,299,958,629,815 bytes.
- Measured usable PostgreSQL capacity: 1,021,333,368,832 bytes.
- Legacy Canary: 24,898 immutable `canonical.agg_trades` Facts, preserved and excluded from Segment completion.

The amplification came from one Candidate, Fact, submission, outcome, lineage edge, publication row, Coverage payload entry, and associated indexes per event. Measured relation evidence included 232,882,176 bytes for Candidates, 191,340,544 for outcomes, 142,696,448 for lineage, 134,324,224 for submissions, 91,447,296 for publication, and 34,455,552 for typed Facts.

## 3. Canonical Stream Segment Contract

The stable logical identity contains dataset, provider, venue, market, canonical instrument, provider symbol, UTC partition window, and ordering policy. It excludes source checksum, Segment checksum, schema/normalizer version, worker, execution time, local path, and database IDs. Content, schema, normalizer, Raw source, validation bounds, and governance participate in the immutable version checksum.

The manifest retains exact source Raw ID/checksum, Segment object key/checksum/bytes, Parquet and Snappy identities, event count, first/last provider aggregate-trade IDs, min/max Event Time, schema and normalizer versions, validation state, publication state, and lineage.

## 4. Columnar Format Decision

Parquet was selected because the repository already used `hyparquet` for typed range reads. The focused `hyparquet-writer@0.16.1` dependency adds explicit schemas, Snappy compression, row groups, and incremental writes. Provider IDs, timestamps, prices, and quantities are lossless strings; source ordinals are `INT32`; buyer-maker is Boolean. Scientific decimals normalize through string arithmetic without floating-point conversion.

## 5. Migrations and Persistence

- Additive migration: `008_canonical_stream_segments.sql`.
- SHA-256: `ef932bb8bd17924e80554728b6707f9c196cf35202e3f39c7ee15a75d84923ba`.
- First run: `001`–`007` skipped, `008` applied.
- Second run: `001`–`008` skipped.
- Existing `canonical.stream_manifests`, Canonical Commit, record version, lineage, publication, conflict, and outbox lifecycles are reused.
- No per-event Segment execution tables were added.

## 6. Segment Build Pipeline

The daily ZIP is retained as the immutable Raw Artifact. CSV rows are inflated and parsed incrementally, validated for strict provider ID ordering and monotonic Event Time, normalized into batches capped at 100,000 rows, and written to a temporary Parquet object. The file is flushed, checksummed, and published to a content-addressed key. Failure injection confirmed temporary output removal and no authoritative partial object.

D3 completion is fenced and atomic across its authoritative outcome, one Coverage decision, canonical checkpoint, Unit completion event/state, and lease release. D2 and D3 remain separate transactions; duplicate D2 commit identity provides unknown-outcome reconciliation.

## 7. Segment Canary and Idempotency

- Source: Binance Vision USD-M daily AggTrades, XRPUSDT, 2020-01-06.
- Raw checksum: `2c9711006cdabb3efbc0e2eeca91abb532d22bd3f51e325d2860640449e95a8c`.
- Raw bytes: 364,309.
- Events: 24,898 accepted, 0 rejected, 0 duplicate source IDs.
- Segment checksum: `bd158464a3b2edfb5abc5dadbe063b91db881ebae6194502e874446630449f71`.
- Segment bytes: 999,669.
- Canonical Segment ID: `rec_9335ba32288c717f4a060d6070d2a4d40be7312e4993f07fd1ad0017f1167bf1`, version 1.
- Build elapsed: 1,463 ms; observed RSS delta: 131,661,824 bytes.
- Exact rerun: D2 `DUPLICATE`; authoritative manifest, lineage, Coverage, checkpoint, and Unit counts unchanged.

## 8. Segment Read-Port Validation

The manifest port uses governed dataset/provider/instrument/window dimensions, published-only default selection, deterministic keyset ordering, and a hard limit of 1,000. The Parquet port verifies the full object checksum, selects explicit columns, supports Event-Time and bigint-safe aggregate-ID filters, and returns pages capped at 1,000 events.

Beginning, middle, and final source rows matched the Segment for IDs, timestamps, canonical decimal values, buyer-maker, provider, and instrument. The tested ordinals were 0, 12,449, and 24,897.

## 9. Coverage Cardinality

The live Canary has exactly one Coverage decision, one outcome ID, and a 267-byte bounded-dimensions payload. Coverage records partition identity, row and ID/time bounds through the Segment manifest, completeness, validation, and checksum. No event-ID array is persisted for Segment execution.

## 10. Measured Capacity

- Canary Segment bytes/event: 40.15057434332075.
- Conservative Segment estimate: 411,539,665,744 bytes.
- Source estimate: 136,714,059,201 bytes.
- Reserved other Artifact growth: 301,508,633 bytes.
- Required Artifact capacity with 20% margin: 658,265,843,123 bytes.
- Measured free Artifact capacity at gate: 667,785,846,784 bytes.
- Margin: 9,520,003,661 bytes.
- Required PostgreSQL capacity with 20% margin: 65,741,090,092 bytes.
- Measured free PostgreSQL capacity: 1,021,333,368,832 bytes.
- Current stream-manifest relation: 147,456 bytes total for two Segment manifests; current database size: 1,636,359,191 bytes.

Capacity passes, but the Artifact margin is narrow and must be recomputed before every resume.

## 11. Full Execution Snapshot

- Snapshot ID: `agg-trades-segment-execution:56c3568bcf7ad0716125f72be098f32861e35ca26a8944a45464b339a6aa4c98`.
- Parent Manifest: `bfm_ac1eae24383333dc00ee964ffa4e35e97c5b7829cec6b9dab34a5fcb75c48c24`.
- Parent row inventory: `agg-trades-execution:734d5a61150a7b89d2fdee7210950b37393f27dfc456c6d643fe46987e280a8d`.
- Instruments: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT.
- Final eligible day: 2026-07-11; partitions: 13,813.
- Concurrency: one Segment partition and one provider download.

## 12. Actual Progress

Two partitions are complete: the XRPUSDT Canary and BTCUSDT 2019-12-31. The first full partition retained 107,365 events in a 3,703,786-byte Segment from a 1,518,388-byte ZIP. Persisted totals are two manifests, two source lineage edges, two publication decisions, two Candidates, two outcomes, two Coverage decisions, and two checkpoints. Remaining partitions: 13,811. Active leases: zero. Reconciliation is consistent with no affected partitions.

Resume command:

```powershell
npx tsx workers/data-platform/runD3AggTradesSegmentBackfill.ts resume --postgres-free-bytes 1021333368832
```

Status, stop, failed retry, Gap retry, and reconciliation use the same runner with `status`, `stop`, `retry-failed`, `retry-gaps`, and `reconcile`.

## 13. Existing Backfill Safety

Funding reconciliation: consistent, 19 complete, 440 incomplete, zero active leases. Open Interest reconciliation: consistent, 7 complete, 10,553 incomplete, zero active leases. The legacy OHLCV reconciler remained operationally expensive; an independent read-only database probe found zero active OHLCV leases and zero completed OHLCV Units missing eligible Coverage or a canonical checkpoint. Existing snapshots and completed Units were not rewritten.

## 14. Remaining Blockers

- `D2_DEPENDENCY_INVENTORY_MISMATCH`: D4 remains pinned to an earlier D2 migration inventory. D4 was not invoked or changed. This is a separate D4-owned maintenance task.
- Artifact headroom is only 9.52 GB after the 20% capacity margin; resume must fail closed if current capacity drops below the requirement.
- Analytical rollups, CVD, imbalance, consumer integration, and final Phase V crash/performance certification remain deferred.
- Existing npm audit findings remain in `next`, `hono`, `undici`, and `postcss`; the new Parquet packages are not listed by the audit.

## 15. Tests

Passed: TypeScript; D1 contracts; D2 Phase 1; D2 Phase 2 unit; D2 durable boundary; D3 Phase 1; D3 Phase 2 unit; Phase 3 enablement; D3-to-D2 commit boundary; integrated topology; row AggTrades regression; Segment identity/checksum/duplicate/conflict; bigint and decimal handling; Parquet writer/reader; interrupted write; bounded read pagination; real Segment Canary; exact rerun; source comparison; capacity gate; live migration/rerun; live Segment reconciliation; Funding/OI reconciliation; OHLCV bounded persisted-state probe; protected-system and direct-write scans; credential scan; migration checksum; package/lock review; `git diff --check`.

Not run: isolated D2/D3 PostgreSQL suites, because this task permits mutation only in `quantterminal_backfill`. The broad OHLCV reconciler was stopped after it remained unbounded; the bounded database probe passed.

## 16. Files and Git State

Branch: `epic/d2-canonical-persistence`; starting HEAD: `344d9e0182d56a16d74978942f2d808fc36142b4`. No staging, commit, or tag was created. Package and lock files changed only for `hyparquet-writer@0.16.1` and its exact `hyparquet@1.26.1` dependency. Downloaded Raw and Segment objects remain outside the repository.

Inherited row-model AggTrades implementation and OHLCV operational progress changes remain distinguishable in the dirty worktree. No D4, consumer, page, API, WebSocket, Replay, Next.js, or Vercel file changed.

## 17. Exact Next Step

Resume the immutable Segment snapshot with the command above after recalculating current Artifact and PostgreSQL free capacity. Keep one active partition and stop automatically if the 20% margin no longer passes.

## 18. Gate Rationale

The full row-per-event path remains blocked and preserved only as legacy certification evidence. The Segment path is deterministic, lossless, immutable, idempotent, checksum-verifiable, bounded in PostgreSQL and Coverage cardinality, capacity-gated, reconciled, and already started at a safe boundary. Limitations are the narrow Artifact margin, deferred D4 inventory maintenance, and Phase V certification work.

SAFE TO START D3 AGGTRADES SEGMENT FULL HISTORICAL BACKFILL WITH LIMITATIONS
