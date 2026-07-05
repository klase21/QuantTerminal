# Open Interest Recent Gap Sync Execution

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.8B  
**Status:** COMPLETE

## Scope

One bounded Recent Gap Sync Orchestrator job executed:

```text
dataset: HISTORICAL_OPEN_INTEREST
symbol: BTCUSDT
archive UTC day: 2026-07-03
planning boundary: 2026-07-04T00:00:00.000Z
maxUtcDaysPerDataset: 1
provider: Binance Vision
```

No Market, Funding, AggTrade, or Liquidation runner was selected. No Cron,
Worker, API, UI, Evidence, Signal, Snapshot, Memory, exact coverage scan, or
projection operation ran.

## Execution Window

```text
latestObservedAt before sync: 2026-07-03T00:00:00.000Z
missingWindowStart:           2026-07-03T00:05:00.000Z
missingWindowEnd:             2026-07-04T00:00:00.000Z
estimatedMissingRecords:      288
attemptedUtcDays:             [2026-07-03]
```

The planner also identifies the July 4 midnight boundary as affected lineage,
but the day cap and completed-archive filter dispatched only the July 3 archive.

## First Execution

| Field | Result |
| --- | --- |
| Orchestrator status | `SUCCESS` |
| Job status | `SUCCESS` |
| Records written | 288 |
| Duplicate records | 0 |
| Projection refresh candidate | `2026-07-03` |
| Projection refreshed | No |

The initial sandboxed fetch attempt returned `fetch failed` before persistence.
The identical bounded command was then run with network access and completed.

## Duplicate Rerun

The same deterministic plan and archive were executed again.

| Field | Result |
| --- | --- |
| Plan identity | Unchanged |
| Job identity | Unchanged |
| Job status | `DUPLICATE` |
| Records written | 0 |
| Duplicate records | 288 |
| Existing records overwritten | 0 |

## Repository Counts

| Measure | Before | After | Delta |
| --- | ---: | ---: | ---: |
| All active Repository records | 2,686,451 | 2,686,739 | +288 |
| Open Interest records | 576 | 864 | +288 |
| Strict July 3 OI records | 1 boundary record | 288 | +287 in-day records |

The preceding archive already supplied `2026-07-03T00:00:00.000Z`. The July 3
archive supplied 288 records from `00:05` through the next `00:00` boundary,
leaving the strict half-open July 3 interval with exactly 288 records from
`00:00` through `23:55`.

## Interval Validation

```text
archive first: 2026-07-03T00:05:00.000Z
archive last:  2026-07-04T00:00:00.000Z
records:       288
non-5m deltas: 0
```

Latest Repository OI observation after sync:
`2026-07-04T00:00:00.000Z`.

## Provider Metadata

All 288 new facts agree on:

| Field | Value |
| --- | --- |
| `sourceId` | `binance-vision` |
| provider | Binance Vision |
| provider tier | `CANONICAL` |
| canonical | true |
| verified | true |
| confidence | 1 |
| resolution | `5m` |
| coverage mode | `time_series` |
| unit | `PROVIDER_NATIVE` |
| freshness | `UNAVAILABLE` |

Historical freshness remains `UNAVAILABLE`; retrieval time was not substituted
for provider observation time.

## Projection Boundary

The orchestrator returned `2026-07-03` as the projection-refresh candidate.
No exact coverage scan or projection write ran. Existing projections remain
unchanged pending a separately approved refresh.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| One dataset selected | PASS; OI only |
| One completed UTC archive day attempted | PASS; July 3 only |
| Existing OI runner reused | PASS |
| Repository-only persistence | PASS |
| Duplicate-safe rerun | PASS; 288 duplicates, zero writes |
| Five-minute interval validation | PASS; zero invalid deltas |
| Provider metadata validation | PASS |
| Latest observation check | PASS; July 4 midnight UTC |
| Projection refresh/write | NONE |
| Prohibited behavior | PASS |

## Funding Recommendation

**Open Interest is synchronized through the latest completed archive day in
this bounded sequence and is current enough to move to the Funding bounded
adapter.**

It is not live-current at five-minute cadence: the latest repository fact is
the July 4 midnight archive boundary. The next step should therefore preserve
the same completed-archive discipline while implementing Funding's bounded
8-hour-event adapter; it must not replay full monthly history.
