# BTCUSDT Full Historical Backfill

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B3  
**Status:** COMPLETE

## Dataset

| Field | Verified value |
| --- | --- |
| Provider | Binance Vision |
| Registry source | `binance-vision` |
| Market | Binance USD-M Futures |
| Symbol | `BTCUSDT` |
| Interval | `5m` |
| Record kind | `HISTORICAL_MARKET` |
| First timestamp | `2019-12-31T00:00:00.000Z` |
| Last timestamp | `2026-06-30T23:55:00.000Z` |
| Covered range end | `2026-07-01T00:00:00.000Z` (exclusive) |
| Total records | 683,712 |
| Source duplicates | 0 |
| Missing 5-minute intervals | 0 |

The earliest boundary was verified against Binance Vision: daily BTCUSDT 5m
archives before `2019-12-31` were unavailable, while the `2019-12-31` archive
was present and complete. Monthly coverage begins at `2020-01`. At execution
time, `2026-06-30` was the latest published complete UTC daily archive;
`2026-07-01` was not yet available and was not fabricated or substituted.

## Execution Model

The full backfill creates a source plan from the verified earliest archive to
the latest published complete day. It uses monthly archives for complete
months and daily archives for uncovered boundaries. The completed run used:

* 77 monthly archives;
* 31 daily archives;
* 108 archives total.

Each archive is downloaded, parsed, chronologically validated, checked for
duplicate timestamps and missing 5-minute intervals, then persisted before
the next archive begins. This bounds memory use and makes completed archives
durable during a long run.

Resume behavior is based on deterministic candle identity and Repository
idempotency. A restarted process may download an already completed archive,
but every existing candle returns `DUPLICATE`; no checkpoint mutates or
overwrites a fact. Progress callbacks expose archive position, period, candle
count, persisted count, duplicate count, and missing-interval count.

## Persistence

The durable local dataset is stored in the ignored development database:

```text
.data/historical-backfill.sqlite
```

All writes pass through
`PersistenceRepository.saveHistoricalMarketRecord()`. The backfill runtime
does not import or call SQLite or Postgres adapters. Every record preserves raw
Binance timestamps, canonical ISO timestamps, OHLCV values, deterministic
identity, and content checksum.

## Rerun Summary

| Run | Status | New records | Duplicate records | Final repository count |
| --- | --- | ---: | ---: | ---: |
| Initial full run | `SUCCESS` | 683,712 | 0 | 683,712 |
| Identical full rerun | `DUPLICATE` | 0 | 683,712 | 683,712 |

The final Repository scan confirmed the first and last timestamps above and
strict chronological ordering across all 683,712 persisted records.

## No-Fabrication Boundary

Only source OHLCV facts were persisted. The run generated no Signals, Context
Snapshots, Tracking, Price Observations, Evaluations, Outcomes, Outcome Events,
Historical Memory, Pattern, or Learning records. Repository checks confirmed
zero records for every prohibited Signal-to-Memory kind.

No candle, timestamp, metadata, freshness, funding, open interest, fallback,
or missing interval was synthesized. Source unavailability fails closed.

## Validation Summary

| Check | Result |
| --- | --- |
| TypeScript validation | PASS |
| Earliest official archive probe | PASS; `2019-12-31` |
| Latest complete published day discovery | PASS; `2026-06-30` |
| All 108 archives completed | PASS |
| Total Repository records | PASS; 683,712 |
| Full chronological ordering | PASS |
| Duplicate source-candle rejection | PASS |
| Missing interval detection | PASS; zero in source dataset |
| Deterministic identity | PASS |
| Full duplicate rerun | PASS; zero new records |
| Repository-only persistence | PASS |
| Prohibited record-kind scan | PASS; all zero |
| API, page, Replay, package, provider changes | NONE |

No production build was run, in accordance with repository instructions.
