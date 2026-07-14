# MVP-0B Recent Market Corpus Report

## Result

The frozen six-instrument Recent Market Corpus is complete and reconciled. Population used only explicit instrument and date bounds; no full-history queue was resumed. Publication remains `PENDING`, corpus eligibility is recorded separately as `ELIGIBLE`, and no Consumer Projection was created.

- Corpus ID: `mvp-recent-market-corpus:7a65145af0f84522866cb9a6cc04d52d0b2f3aa243718f2f8720eed37cb2f2ce`
- Checksum: `7a65145af0f84522866cb9a6cc04d52d0b2f3aa243718f2f8720eed37cb2f2ce`
- Core window: `[2026-04-13T00:00:00.000Z, 2026-07-12T00:00:00.000Z)`
- AggTrades window: `[2026-06-28T00:00:00.000Z, 2026-07-12T00:00:00.000Z)`
- Instruments: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`, `XRPUSDT`, `DOGEUSDT`

## Persisted Results

| Dataset | Required partitions | Records/events | Raw bytes | Result |
| --- | ---: | ---: | ---: | --- |
| OHLCV | 540 | 155,520 | 7,010,077 | Complete |
| Funding | 24 source partitions | 1,620 | 37,366 | Complete |
| Open Interest | 540 | 155,514 | 6,123,516 | Complete |
| AggTrades Segment | 84 | 45,816,917 | 610,395,727 | Complete |

The 84 AggTrades Parquet Segments occupy 1,429,995,319 bytes. Every required cell has authoritative persistence, Raw lineage, eligible Coverage, a completed checkpoint, truthful pending publication state, and zero unresolved conflicts.

Open Interest preserves source-partition truth: each instrument has 89 normal 288-observation archives plus the 287-observation cutoff archive, for 25,919 observations per instrument. Event-Time day grouping is not used as a substitute for source-partition completion.

Funding preserves the source transition explicitly. Each instrument has a bounded 54-event April subset, 93 May archive events, 90 June archive events, and 33 existing official REST-tail events. No fixed-cadence rows were synthesized.

## Capacity

The preflight measured 669,870,407,680 free Artifact bytes and approximately 1.02 TB free on the PostgreSQL volume. The final manifest measured a 6,159,031,319-byte database and 667,886,473,216 free Artifact bytes. Each Segment batch passed a scoped capacity gate with the existing 20 percent margin, 301,508,633-byte Artifact reserve, and 51,163,508,815-byte PostgreSQL reserve.

## Runner Remediation

Three concrete bounded-execution defects were corrected:

- OHLCV completion reconciliation now uses a set-based Raw-lineage join instead of the known correlated scan.
- Open Interest completion reconciliation now uses bounded Unit, submission, and lineage-backed Fact sets instead of one query per observation.
- AggTrades capacity approval now evaluates the already-filtered bounded selection instead of the paused full-history snapshot.

Funding gained an explicit bounded event-window partition for April. It preserves the complete monthly Raw Object window and original source row ordinals while assigning a distinct Unit and Coverage identity to `[2026-04-13, 2026-05-01)`.

## Sufficiency Boundary

The corpus is data-sufficient for later Dashboard market direction and derivatives state, Markets summaries, Scanner comparable inputs, Trade market context, and shared Coverage display. Those features remain `NOT_YET_PROJECTED`. Full Replay, final Research Evidence, liquidation enrichment, and historical Order Book are not certified by MVP-0B.
