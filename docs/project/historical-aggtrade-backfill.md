# Historical AggTrade Backfill

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B7  
**Status:** COMPLETE

## Source and Scope

| Field | Value |
| --- | --- |
| Provider | Binance Vision USD-M Futures |
| Source ID | `binance-vision` |
| Dataset | `aggTrades` daily archive |
| Symbol | `BTCUSDT` |
| UTC day | `2026-07-01` |
| Record kind | `HISTORICAL_AGG_TRADE` |

The engine downloads only:

```text
data/futures/um/daily/aggTrades/BTCUSDT/
  BTCUSDT-aggTrades-2026-07-01.zip
```

No Binance REST endpoint, Coinalyze provider, fallback, UI, Replay, or product
runtime is involved.

## Record Contract

Every immutable fact preserves:

* `symbol`
* `exchange`
* `provider`
* `providerTier`
* `canonical`
* `verified`
* `confidence`
* `observedAt`
* `aggregateTradeId`
* `price`
* `quantity`
* `firstTradeId`
* `lastTradeId`
* `tradeTime`
* `isBuyerMaker`
* `sourceId`
* `sourceTimestamp`
* `freshness`

Provider metadata is:

```text
providerTier: CANONICAL
canonical: true
verified: true
confidence: 1.0
```

`sourceTimestamp` is the unmodified provider `transact_time`. `observedAt` and
`tradeTime` are its lossless ISO representation. Historical freshness remains
`UNAVAILABLE`; retrieval time is never substituted as source freshness.

## Identity and Persistence

Identity is deterministic:

```text
historical-agg-trade-v1 + binance-vision + symbol + aggregateTradeId
```

Repository idempotency uses the same source, symbol, and provider aggregate
trade ID. Persistence occurs only through
`PersistenceRepository.saveHistoricalAggTradeRecord()`. Existing records are
never updated or overwritten.

The 1,994,155-row source is processed with a two-pass line iterator. The first
pass validates schema, values, strict aggregate-trade ID ordering, timestamps,
and duplicates before any write. The second pass persists one immutable fact
at a time without retaining the full record set in memory.

## Execution Result

| Item | Result |
| --- | --- |
| First timestamp | `2026-07-01T00:00:00.058Z` |
| Last timestamp | `2026-07-01T23:59:59.987Z` |
| Source records | 1,994,155 |
| Source duplicates | 0 |
| Initial records written | 1,994,155 |
| Identical rerun writes | 0 |
| Identical rerun duplicates | 1,994,155 |
| Repository count | 1,994,155 |

Repository count was verified through the paginated Repository read contract,
not by direct SQLite access.

## Capability Boundary

B7 explicitly approves only `BTCUSDT`. `CAPUSDT` returns `UNAVAILABLE` before
the fetch boundary. No unsupported archive URL is requested and no provider
symbol is inferred.

## No-Fabrication Boundary

B7 records Binance Vision aggregate trades only. It creates no Signal, Context
Snapshot, Tracking, Evaluation, Outcome, Historical Memory, Pattern, Learning,
Calibration, Playbook, recommendation, UI state, or AI reasoning. It does not
interpolate trades, infer missing values, query live Binance REST, or use an
experimental provider.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Official archive schema | PASS |
| Chronological timestamps | PASS |
| Strict aggregate-trade ID ordering | PASS |
| Source duplicate detection | PASS; 0 |
| Repository persistence | PASS; 1,994,155 writes |
| Duplicate-safe rerun | PASS; 1,994,155 duplicates, 0 writes |
| Repository count | PASS; 1,994,155 |
| Provider metadata | PASS; `CANONICAL / true / true / 1.0` |
| Unsupported symbol | PASS; `UNAVAILABLE`, no fetch |
| Prohibited behavior scan | PASS |
| Package, API, page, Replay changes | NONE |

No production build was run, in accordance with repository instructions.
