# Binance Futures Historical Backfill Pilot

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B2  
**Status:** COMPLETE

## Scope

| Field | Value |
| --- | --- |
| Source | Binance Vision (`binance-vision`) |
| Dataset | USD-M Futures daily klines |
| Symbol | `BTCUSDT` |
| Interval | `5m` |
| Range start | `2026-06-15T00:00:00.000Z` |
| Range end | `2026-06-22T00:00:00.000Z` (exclusive) |
| Daily archives downloaded | 7 |
| Expected candles | 2,016 |

The range was verified against the source during validation. No multi-symbol,
configurable range, funding, open-interest, Replay, API, or UI behavior was
introduced.

## Runtime

`lib/historical-backfill` provides strict daily archive parsing, raw provider
timestamp preservation, deterministic identities and SHA-256 checksums,
chronological and interval validation, and Repository-only persistence as
`HISTORICAL_MARKET`. An invalid or incomplete week is not persisted.

The adapters remain unchanged because they already implement the
provider-neutral `StorageRecord` contract.

## Measured Result

| Check | Result |
| --- | --- |
| Downloaded range | 2026-06-15 through 2026-06-21 UTC |
| Total source candles | 2,016 |
| Source duplicate candles | 0 |
| Missing 5-minute intervals | 0 |
| Chronological ordering | PASS |
| Provider open/close timestamps | Preserved, including raw source precision |
| First persistence run | `SUCCESS`; 2,016 records written |
| Identical second run | `DUPLICATE`; 0 records written, 2,016 duplicates |
| Records after both runs | 2,016 `HISTORICAL_MARKET` records |

## No-Fabrication Boundary

The pilot records only Binance Vision OHLCV facts. It creates no Signal,
Context, Tracking, Price Observation, Evaluation, Outcome, Outcome Event, or
Historical Memory records. It supplies no funding, OI, freshness, confidence,
interpolation, fallback metadata, or generated outcome. Missing or malformed
source data fails validation and is not persisted.

## Validation Summary

| Validation | Result |
| --- | --- |
| `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| Real Binance Vision seven-archive ingestion | PASS |
| Expected count and ordering | PASS |
| Duplicate source-candle rejection | PASS |
| Missing interval detection | PASS |
| Duplicate full run | PASS; no additional facts |
| Repository-only persistence | PASS |
| Prohibited record-kind scan | PASS |
| Package, API, page, Replay changes | NONE |

The disposable SQLite validation database was removed after the checks. No
production build was run, in accordance with repository instructions.
