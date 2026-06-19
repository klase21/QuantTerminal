# Canonical Market Data Cache

## Purpose

The canonical market data cache provides one reusable real-data layer for historical intelligence consumers.

```text
External source
  -> raw download
  -> source-specific parsing
  -> canonical normalization
  -> versioned file cache
  -> historical intelligence consumers
```

Feature systems should not download and reinterpret the same source independently.

## Source Priority

Primary long-coverage sources:

1. Binance Vision
2. Binance historical APIs

Secondary derivatives sources:

1. Binance funding APIs
2. Binance open-interest APIs

Enrichment sources:

1. CryptoHFTData
2. Prediction markets
3. Narrative systems

CryptoHFTData enriches historical intelligence but is not the primary long-coverage OHLCV source.

Consumers must never silently substitute another exchange or symbol when a requested cache entry is unavailable.

## Cache Namespace

Canonical datasets use:

```text
namespace: market-data
```

Dataset ids:

- `ohlcv`
- `funding`
- `open-interest`
- `liquidations`
- `orderbook-snapshots`

Schema version:

```text
1
```

Examples:

```text
.data/cache/market-data/ohlcv/
  exchange=binance_futures/
  interval=1h/
  symbol=BTCUSDT/

.data/cache/market-data/funding/
  exchange=binance_futures/
  symbol=BTCUSDT/
```

The generic cache layer controls deterministic partition ordering and manifest publication.

## Canonical OHLCV

Fields:

- exchange
- symbol
- interval
- open time
- close time
- open
- high
- low
- close
- volume
- source
- downloaded timestamp

The manual OHLCV builder supports:

- local Binance Vision JSON stores
- Binance Vision CSV files
- Binance Vision ZIP files containing CSV

Example:

```powershell
npx.cmd tsx workers/market-data/buildCanonicalOhlcvCache.ts `
  --file C:\QuantTerminal\.data\historical\market_ohlcv.json `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --interval 1h
```

The builder:

1. Reads the local source file.
2. Filters the requested symbol and interval.
3. Validates finite OHLCV values and candle structure.
4. Rejects invalid or impossible candles.
5. Deduplicates by open time.
6. Sorts ascending.
7. Publishes through the existing atomic cache manifest.

No download or normalization happens in a request path.

## Funding Contract

Fields:

- exchange
- symbol
- funding time
- funding rate
- mark price
- source

The publisher accepts normalized real records. A source downloader is not implemented in V1.

## Open Interest Contract

Fields:

- exchange
- symbol
- timestamp
- open interest
- open-interest value
- source

The publisher accepts normalized real records. A source downloader is not implemented in V1.

## Liquidation Contract

Fields:

- exchange
- symbol
- timestamp
- side
- price
- quantity
- notional
- source

The publisher accepts normalized real records. No synthetic liquidation data is permitted.

## Orderbook Snapshot Contract

Fields:

- exchange
- symbol
- timestamp
- best bid
- best ask
- spread
- imbalance
- bid liquidity
- ask liquidity
- bid levels
- ask levels
- source

Only precomputed summaries are accepted. Raw event reconstruction must remain outside request paths.

## Shared Read Layer

Dataset-specific readers are provided for:

- OHLCV
- funding
- open interest
- liquidations
- orderbook snapshots

Readers:

1. Build the canonical cache identity.
2. Validate manifest and schema versions.
3. Reject missing, expired, partial, failed, or incompatible entries.
4. Validate the dataset payload shape.
5. Return canonical records without exposing source-specific formats.

Consumers do not need to know whether input originally came from Binance CSV, Binance APIs, or CryptoHFTData.

## Consumer Integration

Historical Analog V2:

- consumes canonical OHLCV
- may consume canonical funding and OI when available

Replay:

- consumes canonical OHLCV
- consumes canonical liquidations
- consumes precomputed canonical orderbook snapshots

Market Memory V3:

- consumes states and outcomes derived from canonical market data

Event Impact:

- aligns canonical OHLCV and derivatives data with event timestamps

This sprint creates integration points only. Existing consumers are not migrated automatically.

## Failure Handling

Missing cache:

- return `missing`

Expired cache:

- return `expired` unless a consumer explicitly adopts a stale-data policy

Corrupted payload or manifest:

- return `corrupted`

Schema mismatch:

- return `version_mismatch`

Partial or failed generation:

- return the corresponding unavailable state

No reader downloads, rebuilds, substitutes symbols, or fabricates records.

## Future Storage Migration

Phase 1 uses the existing JSON file cache.

Future migration:

```text
Canonical contracts
  -> DuckDB analytics storage
  -> SQLite application cache
```

The canonical record contracts and reader boundaries should remain stable. Future adapters can replace the file implementation without changing feature-level consumers.

No DuckDB or SQLite integration is implemented in V1.
