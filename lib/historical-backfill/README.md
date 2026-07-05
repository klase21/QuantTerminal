# Historical Backfill Runtime

## Historical Open Interest

`openInterestBackfill.ts` ingests Binance Vision USD-M Futures daily metrics
archives as immutable `HISTORICAL_OPEN_INTEREST` facts. The provider-native
`sum_open_interest` value and `create_time` timestamp are preserved; the
runtime does not infer units or live freshness. Multi-symbol execution is
capability-gated, while Coinalyze remains an inactive, explicitly mapped
cross-check boundary in `openInterestSources.ts`.

## Historical Liquidations

`liquidationBackfill.ts` models the official Binance Vision USD-M
`liquidationSnapshot` archive as the canonical source and persists only through
Repository. Missing archives may reach the experimental Coinalyze Internal Web
datafeed only when an explicit symbol mapping, caller enablement, and ephemeral
visible-page request key are all present. No cookie, session, or token is stored.
COIN-M archives are not substituted for USD-M symbols.

## Historical AggTrades

`aggTradeBackfill.ts` ingests one explicitly requested Binance Vision USD-M
daily AggTrade archive as immutable `HISTORICAL_AGG_TRADE` facts. It validates
the complete source before persistence, iterates records without materializing
the full two-million-row day as objects, and uses Repository-only deterministic
identity from `sourceId + symbol + aggregateTradeId`.

This provider-neutral factual ingestion boundary validates and persists one
fixed Binance Vision pilot: BTCUSDT Futures 5-minute OHLCV from
2026-06-15T00:00:00Z through 2026-06-22T00:00:00Z (end exclusive).

The downloader reads exactly seven Binance Vision daily archives. It preserves
provider open/close timestamps and OHLCV fields, requires all 2,016 expected
candles in strict order, rejects duplicate timestamps, and reports missing
intervals. Invalid or incomplete weeks are not persisted.

Each candle has deterministic identity and checksum. Persistence uses only
`PersistenceRepository.saveHistoricalMarketRecord`; adapters remain hidden
behind Repository. A repeated run returns duplicate results without overwrite.

Coverage reconciliation may append immutable `HISTORICAL_PROVIDER_METADATA`
attestations for older historical facts whose identity and payload predate the
provider-tier contract. Attestations reference the original fact and never
rewrite its identity or payload. The bounded reconciliation runner also uses
the existing OHLCV parser and Repository persistence path for a single explicit
UTC day.

Dataset resolution is governed by one versioned
`HISTORICAL_DATASET_METADATA` attestation per dataset/source/symbol contract.
The contract distinguishes fixed five-minute time series, eight-hour funding
events, variable tick streams, and experimental time series. Existing facts
remain valid; new facts carry the same typed resolution fields directly.

`coverageEngine.ts` evaluates one symbol and strict UTC day through Repository
reads only. `repositoryHealth.ts` keeps repository coverage separate from
provider-history availability. Exact variable-stream counts can be expensive;
request-path consumers must use a future bounded aggregate or cached projection.

`coverageProjection.ts` persists immutable Repository-owned coverage aggregates
and reconstructs the same coverage report without scanning historical facts.
Projection identity includes a deterministic source-result watermark; unchanged
recomputation returns `DUPLICATE`, while changed source coverage appends a new
version.

`projectionLifecycle.ts` adds versioned lineage and a 24-hour read-time
freshness policy. Projection reads return `AVAILABLE`, `STALE`, or
`PROJECTION_MISSING`; they report recomputation need but never execute it.

This runtime does not create Signal Snapshot, Context Snapshot, Tracking,
Price Observation, Signal Evaluation, Signal Outcome, Outcome Event, or
Historical Memory records. It contains no funding, OI, freshness, inference,
fallback provider, API, page, Replay activation, or Knowledge execution.

## Full Backfill

`runFullBinanceVisionHistoricalBackfill()` discovers the latest published
complete UTC daily archive, starts at the verified earliest 5-minute archive
(`2019-12-31`), and uses monthly archives where available with daily archives
for uncovered boundaries. Each archive is validated and persisted before the
next begins. Restarting is safe: previously written candles return
`DUPLICATE`, while remaining archives continue normally.

Progress callbacks report archive coordinates and cumulative persisted,
duplicate, and missing-interval counts. No checkpoint can create or mutate a
market fact; Repository idempotency is the resume boundary.

## Funding Backfill

Funding facts use Binance Vision's actual
`futures/um/monthly/fundingRate` dataset. The requested `daily/metrics` files
were inspected and rejected for funding because their schema has no funding
rate or funding timestamp. Funding records preserve `calc_time`,
`funding_interval_hours`, and `last_funding_rate`; no metrics timestamp is
relabelled as funding time.

Funding backfill accepts any canonical Binance Futures symbol and discovers
that symbol's official contiguous monthly archive range. Existing BTCUSDT
identities remain unchanged. Binance Vision is the authoritative primary
provider. Coinalyze is an optional secondary cross-check requiring an explicit
provider instrument map; absent CAP-like mappings remain `UNAVAILABLE` and are
never guessed from Binance symbols.
