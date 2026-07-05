# Dataset Resolution Metadata Contract

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B7.7  
**Status:** IMPLEMENTED

## Purpose

This contract standardizes the temporal meaning of each historical dataset
before B8 Coverage Engine. Archive packaging is not treated as data resolution:
monthly Funding archives contain eight-hour events, and daily OI archives
contain five-minute observations.

Existing immutable B3-B7 facts are not rewritten. Resolution contracts are
persisted as versioned `HISTORICAL_DATASET_METADATA` attestations keyed by:

```text
dataset kind + sourceId + symbol + contract version
```

New historical facts carry the same typed resolution metadata directly.

## Canonical Contract

| Dataset kind | Resolution | Coverage mode | Cadence minutes | Cadence hours | Expected/day | Variable/day | Provider tier |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `HISTORICAL_MARKET` | `5m` | `time_series` | 5 | null | 288 | false | `CANONICAL` |
| `HISTORICAL_OPEN_INTEREST` | `5m` | `time_series` | 5 | null | 288 | false | `CANONICAL` |
| `HISTORICAL_LIQUIDATION` | `5m` | `time_series_experimental` | 5 | null | 288 | false | `EXPERIMENTAL` |
| `HISTORICAL_FUNDING` | `8h_event` | `event` | null | 8 | 3 | false | `CANONICAL` |
| `HISTORICAL_AGG_TRADE` | `tick` | `event_stream` | null | null | null | true | `CANONICAL` |

Experimental liquidation remains `canonical: false`, `verified: false`, and
confidence `0.65`. AggTrade has no fabricated fixed daily expectation.

## Validation Rules

- `5m` fixed time series require five-minute cadence and 288 expected daily
  records.
- `8h_event` requires eight-hour cadence and three expected daily records.
- `tick` requires `event_stream`, null cadence, null expected daily records,
  and `variableDailyRecords: true`.
- `time_series_experimental` requires an `EXPERIMENTAL` provider tier.
- Dataset-specific mapper validation rejects a valid resolution assigned to the
  wrong dataset kind.
- Contract identities are deterministic and versioned.
- Duplicate contracts return `DUPLICATE`; no existing metadata or fact is
  overwritten.

## Coverage Semantics

Coverage evaluation reads the dataset contract rather than archive frequency:

- Funding uses `3` as its daily denominator, never `288`.
- OI uses `288` even though its source is packaged in a daily metrics archive.
- Liquidation uses `288` but always reports `EXPERIMENTAL` for the current
  Coinalyze Internal Web source.
- AggTrade returns a null coverage percentage and uses source-completion state
  because daily record volume is variable.

Allowed coverage statuses are `COMPLETE`, `PARTIAL`, `MISSING`, `UNAVAILABLE`,
and `EXPERIMENTAL`.

## Persistence Result

| Run | Writes | Duplicates | Repository total delta |
| --- | ---: | ---: | ---: |
| Initial contract reconciliation | 5 | 0 | +5 |
| Identical rerun | 0 | 5 | 0 |

Fact-record counts and identities were unchanged.

## No-Fabrication Boundary

Resolution metadata describes source cadence only. It does not create missing
Funding events, OI observations, liquidation bars, candles, or AggTrades. It
does not infer source availability, freshness, market state, signals, Context
Snapshots, Historical Memory, or knowledge.

## B8 Decision

**B8 Coverage Engine is safe to start.** Dataset-specific expected counts,
variable-stream behavior, provider tier, and immutable contract resolution are
now explicit and validated.

