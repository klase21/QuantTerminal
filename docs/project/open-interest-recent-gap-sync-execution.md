# Open Interest Recent Gap Sync Execution

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.8A  
**Status:** COMPLETE

## Scope

One bounded Recent Gap Sync Orchestrator job executed:

```text
dataset: HISTORICAL_OPEN_INTEREST
symbol: BTCUSDT
archive UTC day: 2026-07-02
planning boundary: 2026-07-03T00:00:00.000Z
maxUtcDaysPerDataset: 1
provider: Binance Vision
```

No Market, Funding, AggTrade, or Liquidation runner was selected. No Cron,
Worker, API, UI, Evidence, Signal, Snapshot, Memory, or projection operation
ran.

## Execution Plan

```text
latestObservedAt: 2026-07-02T00:00:00.000Z
missingWindowStart: 2026-07-02T00:05:00.000Z
missingWindowEnd: 2026-07-03T00:00:00.000Z
estimatedMissingRecords: 288
attemptedUtcDays: [2026-07-02]
```

The planner reports July 2 and the midnight-boundary date July 3 as affected
dates. The bounded dispatcher executed only the completed July 2 archive.

## First Execution

| Field | Result |
| --- | --- |
| Orchestrator status | `SUCCESS` |
| Job status | `SUCCESS` |
| Records written | 288 |
| Duplicate records | 0 |
| Source duplicates | 0 |
| Missing five-minute intervals | 0 |
| Projection refresh candidate | `2026-07-02` |
| Projection refreshed | No |

Explicit Repository recording time:
`2026-07-04T19:47:46.196Z`. Observation times remain provider timestamps.

## Duplicate Rerun

The identical plan and archive were executed again.

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
| All active Repository records | 2,686,163 | 2,686,451 | +288 |
| Open Interest records | 288 | 576 | +288 |
| Strict July 2 OI records | 1 boundary record | 288 | +287 in-day records |

The prior archive already supplied `2026-07-02T00:00:00.000Z`. The July 2
source archive supplied 288 records from `00:05` through the next
`00:00` boundary. Consequently strict half-open July 2 coverage is exactly 288
records from `00:00` through `23:55`.

## Interval Validation

Archive interval:

```text
first: 2026-07-02T00:05:00.000Z
last:  2026-07-03T00:00:00.000Z
records: 288
missing intervals: 0
non-five-minute deltas: 0
```

Latest Repository OI observation after sync:
`2026-07-03T00:00:00.000Z`.

## Provider Metadata

All 288 new records agree on:

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
for source observation time.

## Projection Boundary

The orchestrator returned `2026-07-02` as the successful projection-refresh
candidate. No exact coverage scan or projection write was executed. Existing
coverage projections therefore remain unchanged until a separate approved
refresh sprint.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| One dataset selected | PASS; OI only |
| One completed UTC day attempted | PASS; July 2 only |
| Existing OI runner reused | PASS |
| Repository-only persistence | PASS |
| Duplicate-safe rerun | PASS; 288 duplicates, zero writes |
| Five-minute interval validation | PASS |
| Provider metadata validation | PASS |
| Unsupported symbol query | NONE |
| Projection refresh/write | NONE |
| Other datasets changed | NONE |
| Prohibited behavior | PASS |

## B11.8B Recommendation

**B11.8B can safely synchronize the next completed OI day,
`2026-07-03`, using the same one-dataset, one-day, day-cap-one contract.**

That should complete before moving to Funding. Funding still requires a
bounded recent-month adapter because its current runner rediscoveries and
replays the full monthly history. B11.8B must again record before/after counts,
validate the midnight boundary, and perform a duplicate rerun without
refreshing projections automatically.
