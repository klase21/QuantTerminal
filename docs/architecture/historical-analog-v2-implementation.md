# Historical Analog V2 Implementation

## Purpose

Historical Analog V2 answers:

> What happened when this market previously looked similar?

The implementation is deterministic, reproducible, and cache-backed.

```text
Historical OHLCV
  -> market state generation
  -> exact forward outcomes
  -> deterministic similarity search
  -> cache publication
  -> Dashboard / Research cache read
```

No historical search, outcome calculation, source download, enrichment, or cache generation occurs inside a request path.

## Primary Data Strategy

Historical Analog V2 is designed around long-coverage sources:

- Binance Vision
- Binance historical APIs

Optional secondary state features may come from:

- funding history
- open interest history

CryptoHFTData, prediction markets, and narrative systems are future enrichment sources. Historical Analog V2 does not depend on them.

## Market State Model

Each `HistoricalMarketStateV2` contains:

- source
- symbol
- interval
- timestamp
- close
- trend regime
- named feature vector

Version 1 features:

- 1h return
- 4h return
- 24h return
- 20-bar volume z-score
- 24h realized volatility
- distance from SMA20
- distance from SMA50
- funding rate, when supplied
- 24h open interest change, when supplied

Features are nullable. Missing source data stays missing and is never estimated.

Trend regime is deterministic:

- `uptrend`: close > SMA20 > SMA50
- `downtrend`: close < SMA20 < SMA50
- `sideways`: averages exist but are not ordered
- `unknown`: insufficient moving-average history

The feature vector uses named fields so later schema versions can add features without changing the fundamental state/search boundary.

## Reusable Historical State Dataset

Cache dataset:

```text
namespace: historical-intelligence
dataset: market-state-dataset-v2
partition:
  source
  symbol
  interval
```

Schema version:

```text
1
```

The payload contains:

- generated market states
- exact forward outcomes keyed by state id

This dataset can later support Historical Analog, Market Memory, Event Impact, and historical research without rebuilding feature states in request paths.

## Outcome Model

Forward outcomes are calculated from actual future OHLCV closes:

- 1h
- 4h
- 24h
- 7d

If an interval cannot represent a horizon, or the required future bar does not exist, the outcome is `null`.

No interpolation or extrapolation is used.

Aggregate statistics are calculated independently for each horizon:

- case count
- average return
- win rate
- best case
- worst case

Win rate is the percentage of usable cases with a positive forward return.

Dominant outcome uses the first available horizon in this order:

1. 24h
2. 7d
3. 4h
4. 1h

At least 60% positive cases produce `up`; at least 60% negative cases produce `down`; otherwise the result is `mixed`.

## Similarity Model

Historical Analog V2 uses a deterministic weighted normalized distance.

Each feature has a fixed:

- weight
- scale

Only features available in both states are compared. At least four comparable features are required.

Trend-regime disagreement adds a fixed distance penalty. Results are sorted by:

1. similarity descending
2. comparable feature count descending
3. timestamp descending
4. state id ascending

The default exclusion window is 30 days. A state cannot match itself or near-current observations.

The fixed model avoids dataset-dependent randomization and makes identical inputs produce identical rankings.

## Historical Analog Cache

Cache dataset:

```text
namespace: historical-intelligence
dataset: historical-analog-v2
partition:
  symbol
  interval
```

Schema version:

```text
1
```

Payload:

- source
- symbol
- interval
- current state
- ranked similar cases
- exact case outcomes
- aggregate horizon statistics
- search diagnostics

Manifest metadata:

- state dataset schema version
- current state id
- candidate count
- analog count

## Manual Generation

Generation is offline and manual:

```powershell
npx.cmd tsx workers/historical-intelligence/buildHistoricalAnalogCache.ts `
  --file C:\QuantTerminal\.data\historical\market_ohlcv.json `
  --symbol BTCUSDT `
  --interval 1h `
  --limit 25
```

Optional arguments:

```text
--as-of <timestamp-or-ISO-date>
--enrichment-file <funding-and-open-interest-json>
```

Without `--as-of`, the latest state in the input dataset is selected. This remains deterministic for an unchanged dataset.

The builder:

1. Filters real OHLCV rows for one symbol and interval.
2. Builds the reusable state dataset.
3. Builds exact forward outcomes.
4. Publishes the state dataset cache.
5. Selects the current state.
6. Runs deterministic analog search.
7. Aggregates outcome statistics.
8. Publishes the analog cache.

There is no scheduler, queue, cron job, or automatic request-time rebuild.

## Cache Consumption

These routes now read Historical Analog V2 cache only:

- `/api/historical-analog`
- `/api/dashboard/historical-analog`
- `/api/research/historical-analogs`

Dashboard UI remains unchanged and Historical Analog remains removed from its initial workflow. The Dashboard route exists as a future cache-backed evidence adapter.

Research retains manual loading. Its route adapts the cached V2 result to the existing Research response shape.

## Failure Handling

Cache states map to explicit unavailable responses:

- missing
- corrupted
- expired
- version mismatch
- partial generation
- generation failed

An empty but valid analog result is also explicit:

```text
No cached historical analog cases matched the current market state.
```

Routes never:

- backfill historical data
- generate states
- search historical records
- calculate outcomes
- substitute another symbol
- fabricate returns

## Diagnostics

API responses expose:

- cache status
- generated timestamp
- source
- schema version
- analog count

The payload also records candidate count and comparable-feature requirements.

## Limitations

- Manual generation reads the input JSON array into the builder process.
- V1 cache payload format is JSON.
- State generation currently expects one symbol and interval per build.
- Funding and open interest require an optional aligned enrichment file.
- No cross-symbol analog substitution is performed.
- The builder publishes the latest generated result for each symbol/interval identity.
- No migration tooling exists yet; incompatible schema versions are rejected.

## Future Expansion

Future systems can consume the reusable state dataset and analog cache:

- Dashboard evidence layer
- Research workflows
- Market Memory V3
- Event Impact Layer

A future scheduler can invoke the same builder and publish the same cache contracts without changing consumers.
