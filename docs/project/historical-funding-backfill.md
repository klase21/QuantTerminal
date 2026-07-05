# BTCUSDT Historical Funding Backfill

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B4  
**Status:** COMPLETE WITH SOURCE-PATH CORRECTION

## Source Contract

The requested `futures/um/daily/metrics` path was inspected before
implementation. Its source schema is:

```text
create_time,symbol,sum_open_interest,sum_open_interest_value,
count_toptrader_long_short_ratio,sum_toptrader_long_short_ratio,
count_long_short_ratio,sum_taker_long_short_vol_ratio
```

It contains no funding timestamp and no funding rate. The same schema was
verified at the earliest metrics boundary and in 2021, 2024, and 2026.
Relabelling `create_time` or another metrics field as funding would violate the
no-fabrication policy.

The backfill therefore uses Binance Vision's actual approved funding dataset:

```text
futures/um/monthly/fundingRate/BTCUSDT/
```

Its provider schema is exactly:

```text
calc_time,funding_interval_hours,last_funding_rate
```

This is a source-path correction within the existing `binance-vision`
provider, not a provider expansion or fallback.

## Covered Dataset

| Field | Verified value |
| --- | --- |
| Provider | Binance Vision |
| Source ID | `binance-vision` |
| Record kind | `HISTORICAL_FUNDING` |
| Symbol | `BTCUSDT` |
| First funding timestamp | `2020-01-01T00:00:00.000Z` |
| Last funding timestamp | `2026-06-30T16:00:00.005Z` |
| Monthly archives | 78 |
| Total funding records | 7,119 |
| Source duplicates | 0 |
| Detectable missing intervals | 0 |

The earliest available monthly archive is `2020-01`; `2019-12` is unavailable.
The latest completed archive at execution time is `2026-06`.

## Record Contract

Each immutable record preserves only source-backed fields:

* `symbol`: `BTCUSDT`;
* `fundingTime`: ISO representation of provider `calc_time`;
* `sourceFundingTime`: unmodified provider timestamp text;
* `fundingRate`: provider `last_funding_rate`;
* `fundingIntervalHours`: provider `funding_interval_hours`;
* `source`: `Binance Vision`;
* `sourceId`: `binance-vision`;
* `observedAt`: the same provider `calc_time` represented as ISO;
* deterministic record identity and content checksum.

No retrieval time is used as funding or observation time. The runtime creates
no freshness, confidence, metadata estimate, interpolation, or inferred
funding event.

## Persistence and Resume Behavior

`HISTORICAL_FUNDING` is a dedicated factual persistence kind. Every durable
write uses `PersistenceRepository.saveHistoricalFundingRecord()` and the
provider-neutral `StorageRecord` envelope. The funding runtime does not import
SQLite or Postgres adapters.

Monthly archives are validated and persisted sequentially. Repository
idempotency makes interrupted execution resumable: completed funding facts
return `DUPLICATE`, and later months can continue without overwrite.

| Run | Status | New records | Duplicate records | Final funding count |
| --- | --- | ---: | ---: | ---: |
| Initial run | `SUCCESS` | 7,119 | 0 | 7,119 |
| Identical full rerun | `DUPLICATE` | 0 | 7,119 | 7,119 |

## Validation

Missing intervals are detected from each record's provider-supplied
`funding_interval_hours`. Timestamp jitter retained by Binance, including the
final `+5ms`, is preserved and is not rounded into identity.

| Check | Result |
| --- | --- |
| TypeScript validation | PASS |
| Funding source schema validation | PASS |
| Chronological Repository ordering | PASS |
| Source duplicate count | PASS; 0 |
| Duplicate-record rejection | PASS |
| Deterministic identity | PASS |
| Detectable missing intervals | PASS; 0 |
| Repository record count | PASS; 7,119 |
| Full duplicate rerun | PASS; 0 writes |
| Repository-only persistence | PASS |
| Prohibited behavior scan | PASS |
| API, page, Replay, package, provider changes | NONE |

## No-Fabrication Boundary

The backfill stores funding facts only. It creates no Signal, Context Snapshot,
Tracking, Price Observation, Evaluation, Outcome, Outcome Event, Historical
Memory, Pattern, Learning, Calibration, Playbook, Replay state, or Knowledge.

No production build was run, in accordance with repository instructions.
