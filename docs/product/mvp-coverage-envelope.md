# QuantTerminal MVP Coverage Envelope

Status: defined, not yet populated or approved for UI cutover

Contract version: `mvp-coverage-envelope/v1`
Frozen reference cutoff: `2026-07-12T00:00:00.000Z`

## Product Boundary

The Working MVP is horizontally complete across Dashboard, Replay, Research, Markets, Scanner, and Trade. It is deliberately bounded in time and instrument scope. A feature is MVP-complete only when its visible value follows:

```text
Provider Source
-> Raw Artifact
-> Canonical Fact or Canonical Stream Segment
-> Consistency Result when required
-> Evidence Packet when required
-> Consumer Projection
-> Page
```

Current live and legacy paths may remain useful during migration, but they do not satisfy a governed MVP feature when the matrix requires a Consumer Projection.

The envelope uses these status values only: `AVAILABLE`, `BACKFILL_PENDING`, `SOURCE_UNAVAILABLE`, `SOURCE_BLOCKED`, `UNSUPPORTED`, `NOT_APPLICABLE`, `GAP`, `STALE`, `EXPERIMENTAL`, and `LOWER_BOUND`.

## Supported Instruments

All six governed Binance USD-M perpetual instruments remain in the MVP. No source blocker justifies silently narrowing the universe.

| Instrument | OHLCV | Funding | Open Interest | AggTrades | Liquidation | Historical Order Book | Projection readiness |
|---|---|---|---|---|---|---|---|
| BTCUSDT | Source and runner certified | Source and runner certified | Verified from 2020-09-01 | Source inventory and Segment model certified | Coinalyze 5m bars are `EXPERIMENTAL`, `LOWER_BOUND`, D3 migration pending | 2026-02-22 update flow verified; snapshot absent | Required projections not implemented |
| ETHUSDT | Source and runner certified | Source and runner certified | Verified from 2021-12-01 | Source inventory and Segment model certified | Mapping `UNSUPPORTED` | Snapshot-capable corpus not certified | Required projections not implemented |
| SOLUSDT | Source and runner certified | Source and runner certified | Verified from 2021-12-01 | Source inventory and Segment model certified | Mapping `UNSUPPORTED` | Snapshot-capable corpus not certified | Required projections not implemented |
| BNBUSDT | Source and runner certified | Source and runner certified | Verified from 2021-12-01 | Source inventory and Segment model certified | Mapping `UNSUPPORTED` | Snapshot-capable corpus not certified | Required projections not implemented |
| XRPUSDT | Source and runner certified | Source and runner certified | Verified from 2021-12-01 | Real Segment Canary certified | Mapping `UNSUPPORTED` | Snapshot-capable corpus not certified | Required projections not implemented |
| DOGEUSDT | Source and runner certified | Source and runner certified | Verified from 2021-12-01 | Source inventory and Segment model certified | Mapping `UNSUPPORTED` | Snapshot-capable corpus not certified | Required projections not implemented |

Page lists, filters, and ranking eligibility must disclose any per-instrument exception. An unsupported supplemental dataset does not remove an instrument from the core OHLCV/OI/Funding market universe.

## Deterministic Temporal Envelope

| Dataset | Frozen MVP window | Native resolution | Retention and rolling rule | Current gate |
|---|---|---|---|---|
| OHLCV | `[2026-04-13T00:00:00Z, 2026-07-12T00:00:00Z)` | 5 minutes | Keep the latest 90 complete UTC days; immutable builds bind an explicit cutoff | `BACKFILL_PENDING` |
| Open Interest | same 90-day window | 5 minutes | Same complete-day rule | `BACKFILL_PENDING` |
| Funding | same 90-day window | provider events, normally 8 hours | Retain finalized events in the 90-day interval; never synthesize 5m rows | `BACKFILL_PENDING` |
| Aggregated Trades | `[2026-06-28T00:00:00Z, 2026-07-12T00:00:00Z)` | provider events in daily Parquet Segments | Keep the latest 14 complete UTC days; live intensity remains a distinct realtime source | `CAPACITY_PENDING` |
| Coinalyze aggregated liquidation bars | `[2026-07-01T00:00:00Z, 2026-07-02T00:00:00Z)` for initial MVP evidence | 5-minute long/short bars | No rolling promise until D3 migration, mapping certification, and Canary | `EXPERIMENTAL`, `LOWER_BOUND` |
| Historical Order Book | approved event windows only | provider-native updates plus required snapshot | No broad retention. Build immutable event-window caches only | `SOURCE_BLOCKED` for full book; verified update flow is limited evidence |
| Current realtime market state | moving present | provider-native | Protected sockets remain responsive; stale limits apply per source | real but not yet governed by projections |

The rolling definition uses the latest governed complete UTC day, not wall-clock “today.” Reproducing a release always uses its frozen cutoff and corpus ID.

## Measured Scope

- OHLCV: 540 daily partitions, 155,520 expected observations, about 7,025,400 estimated compressed source bytes based on the certified Canary.
- Open Interest: 540 daily partitions, 155,514 expected observations, 6,123,516 measured source bytes from the frozen inventory. The six final-day archives contain 287 observations each.
- Funding: 24 acquisition objects cover April through the July REST tail and filter to about 1,620 expected events in the 90-day analytical window. Exact source and PostgreSQL bytes remain unknown until the bounded population dry run.
- AggTrades: 84 daily partitions, 610,395,727 measured compressed source bytes, approximately 43,648,785 estimated events, and 1,674,934,427 estimated Segment bytes using the measured Canary ratio.

Measured, estimated, and unknown values remain separate in `mvp-recent-market-corpus.json`. Population requires a fresh capacity gate; full historical backfill remains deferred.

## Current-Page Policy

Dashboard, Markets, Scanner, and Trade consume current data plus the frozen or rolling corpus through projections. Current-price and live-structure panels may use the protected realtime path, but every displayed value must carry source status and Event Time. The historical corpus provides comparison baselines and reproducibility; it does not replace the realtime stream.

Proposed freshness limits for the MVP contract are:

- realtime market state: stale after 30 seconds without a provider update;
- OHLCV and OI: stale after 15 minutes;
- Funding: stale after 9 hours;
- daily AggTrades Segment: stale after 36 hours for archive-backed comparisons;
- current projections: stale after 10 minutes unless their source status becomes stale first.

These are proposed MVP product freshness policies, not approved D1 quality thresholds or claims about provider completeness. They must be governed, versioned, and tested before cutover.

## Evidence Corpus

The candidate corpus contains six windows:

1. BTCUSDT around the verified 2024-01-31 FOMC statement.
2. ETHUSDT around the verified 2024-03-20 FOMC statement.
3. BTCUSDT 2024-03-04 through 2024-03-07 as a neutral market-stress data probe whose classification requires a future threshold.
4. BTCUSDT 2024-08-04 through 2024-08-07 as a neutral cross-dataset data probe whose event identity requires authoritative evidence.
5. BTCUSDT 2026-02-22 09:00 through 13:00 UTC for verified order-book update-flow study.
6. BTCUSDT 2026-07-01 for experimental Coinalyze aggregated-liquidation evidence.

Only the two FOMC entries are currently verified events in the repository catalog. The order-flow and Coinalyze windows have repository evidence at their stated limitation level. The two neutral market windows have source inventory only and are not accepted narratives. A final four-to-six-event Demo Evidence Corpus is frozen only after source-byte probes, cross-dataset overlap checks, event verification, and Evidence tests.

## Unsupported Truth

- Complete provider-native individual liquidation-event history is `SOURCE_BLOCKED`.
- Coinalyze bars are supplemental aggregated evidence and cannot support a “complete liquidation” conclusion.
- Historical CryptoHFTData updates without a snapshot cannot support a reconstructed depth claim.
- A missing mandatory Evidence component suppresses the conclusion or Confidence output; it does not become zero.
- Full-history capacity expansion and Phase V certification are post-MVP work.

## Population Gate

Functional UI cutover may begin only after:

1. the bounded corpus has explicit terminal states and reconciled lineage;
2. all six instruments have a common usable OHLCV/OI/Funding window;
3. the AggTrades 14-day capacity check passes and selected partitions are populated;
4. Coverage can distinguish gaps, stale values, unsupported scope, and pending work;
5. minimum D4 Evidence rules and required Consumer Projections are active;
6. primary page features no longer use legacy values where a governed projection is required.

The detailed requirements are in `mvp-page-data-requirements.md`; the release assertions are in `mvp-completion-gate.md`.
