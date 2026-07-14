# MVP Certification Slice Report

## Scope

- UTC window: `[2026-07-11T00:00:00.000Z, 2026-07-12T00:00:00.000Z)`
- Instruments: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, DOGEUSDT
- Required datasets: OHLCV, Funding, Open Interest, AggTrades Canonical Stream Segment
- Target: redacted integrated backfill profile on localhost

## Persisted Result

| Dataset | Per instrument | Total | Lineage | Coverage | Publication |
|---|---:|---:|---:|---|---|
| OHLCV | 288 bars | 1,728 | 1,728 | ELIGIBLE | PENDING |
| Funding | 3 events | 18 | 18 | ELIGIBLE | PENDING |
| Open Interest | 287 observations | 1,722 | 1,722 | ELIGIBLE | PENDING |
| AggTrades | 1 Segment | 6 Segments / 1,562,227 events | 6 | ELIGIBLE | PENDING |

All 24 dataset/instrument cells passed authoritative persistence, governed identity, timestamps, Raw lineage, Coverage, validation, checkpoint, and conflict checks. Conflict count is zero. Consumer publication remains `NOT_PUBLISHED`.

## Bounded Population

Persisted inspection found all OHLCV and Funding cells, BTC OI, and no July 11 AggTrades Segments. Population was limited to five missing OI partitions and six missing AggTrades partitions. Every invocation used one explicit instrument, the exact slice, `--max-partitions 1`, and concurrency one. No full-history queue was resumed.

The five OI partitions each produced 287 accepted observations and no rejection or conflict. Segment event counts were BTC 494,149; ETH 583,399; SOL 152,963; BNB 130,260; XRP 104,094; DOGE 97,362. Segment byte lengths total 51,433,284 bytes.

The bounded invocation forms are:

```powershell
npx tsx workers/data-platform/runD3OpenInterestBackfill.ts run --instrument <SYMBOL> --from 2026-07-11T00:00:00.000Z --to 2026-07-12T00:00:00.000Z --max-partitions 1
npx tsx workers/data-platform/runD3AggTradesSegmentBackfill.ts run --instrument <SYMBOL> --from 2026-07-11 --to 2026-07-11 --max-partitions 1 --postgres-free-bytes <MEASURED_FREE_BYTES>
```

`<SYMBOL>` is selected from the six governed values. The next corpus sprint must freeze its own exact dates from the existing MVP Coverage Envelope and retain one-instrument, bounded-partition invocations.

## OHLCV Reconciliation

Database truth is 89,468 OHLCV Facts, 312 completed Units, 89,468 Candidates, 89,468 outcomes, 312 Coverage decisions, and zero active leases. The current mutable OHLCV progress file matches those counts. Older readiness and backfill reports retain earlier checkpoints (21 completed partitions) and are historical reports, not current operational truth.

## Certification Record

- ID: `mvp-certification:2858e13dfb200f2d22fbd2e448bd3422174e97855ecb4acf531e0eee1efbdd26`
- Checksum: `2858e13dfb200f2d22fbd2e448bd3422174e97855ecb4acf531e0eee1efbdd26`
- Machine-readable record: `docs/project/mvp-certification-slice-2026-07-11.json`
- Recompute: `npx tsx workers/data-platform/verifyMvpCertificationSlice.ts verify`

The checksum covers the deterministic `mvp-certification-slice-basis/v1` truth inputs; certification time and report metadata are excluded from identity. The record stores bounded Raw and canonical-reference digests, Segment checksums, counts, migration inventory references, and that recomputable basis. It does not embed events, credentials, local object paths, or mutable progress state.

## Readiness

Identity and granularity blockers are closed for the bounded MVP profile. MVP-0B may populate the governed recent corpus using explicit instrument/date bounds. Publication certification, Consumer Projections, Liquidation enrichment, Order Book history, and final D4 Evidence remain separate later work.
