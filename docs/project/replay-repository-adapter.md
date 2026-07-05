# Replay Repository Adapter

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B10.6  
**Status:** IMPLEMENTED

## Purpose

The Replay Repository Adapter converts successful bounded Repository API
responses into Replay-compatible internal datasets. It is a pure adapter layer
and is not connected to `ReplayV1Page` in this sprint.

The adapter performs no Repository query, provider request, exact coverage
scan, fallback, write, UI mutation, AI work, Signal generation, Context
Snapshot creation, or Historical Memory write.

## Input

The adapter accepts a validated `ReplayRepositoryDatasetResponse` from the
B10.5 client:

```text
source: repository
bounded: true
dataset: market | open_interest | liquidation | funding | agg_trade
records: [{ recordId, observedAt, payload }]
pagination: truncated + nextCursor + limit
```

The client remains coverage-gated. It issues no request unless
`repositoryReady` is true and projection status is `AVAILABLE`.

## Output

One `ReplayRepositoryAdapterResult` contains separate arrays matching Replay's
existing concepts:

- `candles`;
- `positioning`;
- `liquidations`;
- `trades`;
- AggTrade pagination metadata.

Statuses are:

- `SUCCESS`: every source record mapped safely;
- `EMPTY`: source response contained no records;
- `INVALID_RESPONSE`: at least one source record was malformed.

Malformed or absent fields are never replaced with generated values.

## Dataset Mapping

| Repository dataset | Replay output | Mapping |
| --- | --- | --- |
| Market | Candles | `openTime`, OHLC, volume → timestamp, OHLC, volume |
| Open Interest | Positioning | `observedAt`, `openInterest`; Funding fields remain null |
| Funding | Positioning | `fundingTime`, `fundingRate`; OI fields remain null |
| Liquidation | Liquidations | `observedAt`, side, price, quantity → size, notional |
| AggTrade | Trades | `tradeTime`, price, quantity → size, `isBuyerMaker` → aggressor side |

The AggTrade side mapping is deterministic exchange semantics:
`isBuyerMaker: true` maps to sell aggression; false maps to buy aggression.
Pagination is passed through unchanged and no additional page is requested.

## Real Repository Validation

Target: `BTCUSDT`, `2026-07-01`, hour 08.

| Input dataset | Input records | Adapted output | Result |
| --- | ---: | --- | --- |
| Market | 12 | 12 candles | PASS |
| Open Interest | 12 | 12 positioning points | PASS |
| Liquidation | 13 | 13 liquidation rows | PASS |
| Funding | 1 | 1 positioning point | PASS |
| AggTrade | 1,000 | 1,000 trades | PASS |

Experimental liquidation values retain source nulls for price and notional.
Funding retains null OI fields. OI retains null Funding fields. The AggTrade
result retains `truncated: true` and cursor `1340139`.

## Compatibility Boundary

`ReplayV1Page`, its existing provider fetches, chart behavior, positioning
fallbacks, liquidations, orderbook, controls, and rendering hierarchy were not
modified. B10.6 creates no automatic Repository mode.

## B10.7 Recommendation

**YES: B10.7 Repository Replay Mode is safe to start with limitations.**

B10.7 must remain opt-in or coverage-gated, preserve the existing provider path
as an independent mode, merge only successfully adapted bounded datasets, and
show `EMPTY`/`INVALID_RESPONSE` as explicit unavailable states. AggTrade must
remain manual and paginated; it must not auto-fetch continuation pages.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Market transformation | PASS |
| OI transformation | PASS |
| Liquidation transformation | PASS |
| Funding transformation | PASS |
| AggTrade transformation | PASS |
| Empty response handling | PASS |
| Malformed response handling | PASS |
| AggTrade pagination preservation | PASS |
| Replay page behavior | UNCHANGED |
| Exact coverage calls | NONE |
| External provider calls | NONE |
| Repository full scans | NONE |
| Prohibited behavior | PASS |

