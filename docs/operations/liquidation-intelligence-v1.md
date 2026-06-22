# Liquidation Intelligence Layer V1

## Purpose

Liquidation Intelligence V1 creates durable, versioned evidence for historical
Replay windows and future market-driver analysis.

It stores observed liquidation facts only:

- long-liquidation notional;
- short-liquidation notional;
- unknown-side notional;
- total liquidation notional;
- event count;
- first and last observed timestamps;
- source quality and provenance.

It does not infer liquidation zones, causal impact, recommendations, or Replay
Learning.

## Contract

The contract lives under:

```text
core/liquidation-intelligence/
```

Schema version:

```text
1
```

Cache identity:

```text
namespace: liquidation-intelligence
dataset: liquidation-evidence
partition:
  exchange
  scope
  symbol (symbol scope only)
  date
  hour
```

Supported scopes:

### Symbol Snapshot

One exchange, symbol, and UTC hour.

The snapshot contains one symbol summary and exact totals for that source
file.

### Market-Wide Snapshot

One exchange and UTC hour aggregated from an explicit list of prepared symbol
snapshots.

Market-wide snapshots remain `degraded` unless global symbol-universe
completeness can be established. V1 does not make that claim.

## Source Quality

| Quality | Meaning |
| --- | --- |
| `verified` | All decoded events have usable notional and recognized side. |
| `degraded` | Evidence is usable but includes incomplete rows or incomplete symbol-universe coverage. |
| `unavailable` | No source evidence exists. |
| `unknown` | Available metadata cannot establish quality. |

Zero liquidation on one side is valid evidence when real events exist only on
the other side.

## Source Semantics

Primary source:

```text
CryptoHFTData liquidation parquet
```

Observed Binance Futures fields:

- `received_time`;
- `event_time`;
- `symbol`;
- `side`;
- `quantity`;
- `price`;
- `average_price`;
- `last_filled_quantity`;
- `filled_quantity`;
- `trade_time`.

These rows describe forced orders.

Side mapping:

- forced-order `SELL` closes a long position and is a long liquidation;
- forced-order `BUY` closes a short position and is a short liquidation;
- explicit `position_side` or `direction` fields take precedence when present.

Notional uses:

```text
average_price * filled_quantity
```

with documented field fallbacks when those values are absent.

The evidence loader processes every decoded event. It does not use Replay UI's
latest-100-row display limit.

## Manual Builder

Per-symbol evidence:

```powershell
npx.cmd tsx workers/liquidation/buildLiquidationEvidence.ts `
  --scope symbol `
  --exchange binance_futures `
  --symbol BTCUSDT `
  --date 2026-02-22 `
  --hour 12
```

Market-wide evidence from an explicit universe:

```powershell
npx.cmd tsx workers/liquidation/buildLiquidationEvidence.ts `
  --scope market-wide `
  --exchange binance_futures `
  --symbols BTCUSDT,ETHUSDT `
  --date 2026-02-22 `
  --hour 12
```

The market-wide builder never downloads missing symbols automatically. It
reads prepared symbol evidence and reports incomplete coverage.

## Replay Compatibility

Flow Replay now checks:

1. canonical liquidation cache;
2. Liquidation Intelligence evidence cache.

This keeps request and UI paths cache-backed. Flow Replay receives compact
totals and does not load raw liquidation events.

No Replay UI or Replay loader was changed.

## Coverage Audit

Run:

```powershell
npm run audit:liquidation-coverage
```

The audit discovers replay-compatible Historical Analog cases and reads only
durable symbol evidence.

It reports:

- symbol;
- date and UTC hour;
- availability;
- long, short, and total liquidation;
- source quality;
- coverage matrix;
- deterministic failure categories.

Failure categories:

- `unavailable_source`;
- `unsupported_window`;
- `incomplete_data`;
- `unknown`.

## Current Coverage Matrix

| Symbol | Cases | Available | Missing | Coverage % |
| --- | ---: | ---: | ---: | ---: |
| BTCUSDT | 6 | 6 | 0 | 100% |
| ETHUSDT | 0 | 0 | 0 | 0% |

ETHUSDT has no replay-compatible Historical Analog cases in the current
cache. Its zero percent does not represent a failed evidence build.

## Per-Window Evidence

| Symbol | Date | UTC hour | Long liquidation | Short liquidation | Total liquidation | Quality |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| BTCUSDT | 2025-07-20 | 17 | $370,117.12 | $113,718.82 | $483,835.95 | verified |
| BTCUSDT | 2025-09-15 | 07 | $324,219.05 | $25,951.74 | $350,170.78 | verified |
| BTCUSDT | 2026-02-22 | 12 | $29,751.79 | $0.00 | $29,751.79 | verified |
| BTCUSDT | 2026-03-08 | 11 | $363,915.08 | $56,215.74 | $420,130.82 | verified |
| BTCUSDT | 2026-03-29 | 17 | $385,871.64 | $15,791.00 | $401,662.64 | verified |
| BTCUSDT | 2026-04-05 | 12 | $264,578.59 | $8,086.77 | $272,665.37 | verified |

Aggregate evidence:

- 309 events;
- $1,738,453.27 long-liquidation notional;
- $219,764.07 short-liquidation notional;
- $1,958,217.34 total liquidation notional.

## Market-Wide Proof

One market-wide snapshot was generated for:

```text
binance_futures
2026-02-22
12 UTC
```

It contains BTCUSDT only and is intentionally classified:

```text
degraded
```

Reason:

```text
Global market completeness is not established.
```

## Failure Results

Current replay-compatible coverage:

| Category | Count |
| --- | ---: |
| unavailable_source | 0 |
| unsupported_window | 0 |
| incomplete_data | 0 |
| unknown | 0 |

## Limitations

- Coverage currently represents BTCUSDT-compatible analog windows only.
- Market-wide V1 requires an explicit symbol list.
- No automatic symbol-universe discovery is implemented.
- CryptoHFTData remains an enrichment source.
- CMC-compatible ingestion is a future adapter boundary only.
- No liquidation event artifact is published to Market Memory or Replay
  Learning.

## Recommended Next Sprint

Implement a canonical trade-evidence layer for the same six Replay windows,
then rerun Flow Replay multi-window validation.

That will test whether `COMPREHENSIVE` coverage is achievable without changing
orderbook quality claims.
