# Repository Replay Mode

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B10.7  
**Status:** IMPLEMENTED

## Purpose

Replay now offers an optional Repository source mode alongside the unchanged
provider mode. Provider mode remains the default. Repository mode reads only
bounded, same-origin Repository datasets after the coverage projection gate
reports `AVAILABLE`.

## Mode Behavior

| Mode | Gate behavior | Data path |
| --- | --- | --- |
| Provider | Gate runs as readiness metadata only | Existing CryptoHFTData, Binance chart, and positioning fallback path |
| Repository | Gate must return `AVAILABLE` before any dataset request | `/api/repository/replay` bounded hourly reads |

Repository mode is disabled after `STALE`, `PROJECTION_MISSING`, or coverage
API failure. A symbol or UTC-day change clears the prior gate decision and
returns Replay to Provider mode so the new identity can be checked explicitly.
The page never silently switches a failed Repository load into provider data.

## Repository Datasets

The primary Repository load requests these four bounded datasets for the
selected symbol, UTC day, and UTC hour:

- `market` -> Replay candles and chart;
- `open_interest` -> positioning points;
- `liquidation` -> liquidation bars/events;
- `funding` -> the event in the hour or the bounded latest-prior event supplied
  by the B10.5 API.

The B10.6 adapter performs every transformation. Empty, unavailable, or
malformed datasets remain explicit in Replay diagnostics; no values are
inferred or generated.

## AggTrade Boundary

AggTrade is not loaded with the primary Repository request. The Event Timeline
button requests one page manually with a limit of 1,000 records. Pagination
uses the API cursor and requests no continuation page automatically. When the
response is no longer truncated, the Repository trade control is disabled.

## Failure Behavior

| Condition | Behavior |
| --- | --- |
| `AVAILABLE` | Repository mode may issue bounded hourly reads |
| `STALE` | Mode closes with `STALE_PROJECTION` |
| `PROJECTION_MISSING` | Mode closes with `PROJECTION_MISSING` |
| Coverage API error | Mode closes with `COVERAGE_API_ERROR` |
| Dataset unavailable | Available datasets render; failed dataset remains unavailable with reason |
| Invalid adapted dataset | Dataset is rejected and remains unavailable |
| AggTrade page unavailable | Existing Replay data remains unchanged and error is shown |

No failure path calls the exact Coverage Engine, scans a full repository day,
queries an external provider, writes to Repository, or automatically invokes
the provider Replay mode.

## Initial Dataset Contract

For `BTCUSDT`, `2026-07-01`, hour `08`, the validated bounded Repository source
contains:

| Dataset | Expected bounded result |
| --- | ---: |
| Market | 12 candles |
| Open Interest | 12 points |
| Liquidation | 13 records |
| Funding | 1 latest-prior event |
| AggTrade | 1,000 records per manually requested page; truncated while more exist |

These are repository validation counts from B10.5/B10.6, not generated UI
values.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Existing Provider mode | PRESERVED and remains default |
| Repository gate enforcement | PASS; checked before bounded reads |
| `STALE` handling | PASS; Repository mode disabled |
| `PROJECTION_MISSING` handling | PASS; Repository mode disabled |
| Repository datasets | Market, OI, liquidation, and Funding only on primary load |
| AggTrade | Manual, 1,000-record cursor page only |
| Exact coverage scan | NONE |
| External provider added | NONE |
| Repository write | NONE |
| Historical backfill change | NONE |

## B11 Recommendation

**B11 Research Repository Migration is safe to start with limitations.**

Research must use the same projection gate, bounded Repository API contracts,
explicit unavailable states, and manual-load posture. It must not reuse the
Replay provider fallbacks as implicit Repository fallback, trigger exact
coverage scans, or automatically load event-stream datasets.
