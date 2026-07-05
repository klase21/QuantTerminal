# Funding Recent Gap Sync via Official REST

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.8C  
**Status:** COMPLETE WITH RERUN VALIDATION PENDING

## Scope

One bounded Recent Gap Sync Orchestrator job executed for:

```text
dataset: HISTORICAL_FUNDING
symbol: BTCUSDT
source: GET https://fapi.binance.com/fapi/v1/fundingRate
query start: 2026-07-01T00:00:00.000Z
query end: 2026-07-05T00:00:00.005Z
requested target: 2026-07-05T00:30:00.000Z
```

The query end is the latest finalized eight-hour event before the explicit
target and current UTC time. No monthly Binance Vision archive was replayed.
No other dataset, projection, product surface, Evidence, Signal, Snapshot,
Memory, Scheduler, or Worker operation ran.

## Result

| Field | Result |
| --- | --- |
| Orchestrator status | `SUCCESS` |
| Funding job status | `SUCCESS` |
| Expected finalized slots | 13 |
| Provider records returned | 13 |
| Records written | 13 |
| Duplicate records on first run | 0 |
| First REST funding event | `2026-07-01T00:00:00.000Z` |
| Last REST funding event | `2026-07-05T00:00:00.003Z` |

Binance source timestamps are preserved exactly. Some events are 3-7ms after
their nominal eight-hour boundary. Validation accepts at most one second of
provider timestamp offset while requiring exactly one event for every expected
slot. It does not normalize or fabricate timestamps.

## Repository Integrity

| Measure | Before | After | Delta |
| --- | ---: | ---: | ---: |
| All active Repository records | 2,686,739 | 2,686,752 | +13 |
| Historical Funding records | 7,119 | 7,132 | +13 |
| Binance Vision Funding records | 7,119 | 7,119 | 0 |
| Official REST Funding records | 0 | 13 | +13 |

The ordered Binance Vision identity/checksum digest remained:

```text
21e74347bdc0fcc9acaaf9ef485284702f86d4ec8c19aa0b79223385d280b5b2
```

This matches the pre-execution digest and proves existing Vision records were
not overwritten or changed.

## Provider Metadata

All 13 REST records agree on:

| Field | Value |
| --- | --- |
| `provider` | `Binance Official REST Funding Rate` |
| `sourceId` | `binance-official-rest-funding-rate` |
| `providerTier` | `CANONICAL` |
| `canonical` | true |
| `verified` | true |
| `confidence` | 1 |
| `sourceOrigin` | `OFFICIAL_REST_RECENT_GAP` |
| `resolution` | `8h_event` |
| `coverageMode` | `event` |
| `expectedDailyRecords` | 3 |

## Projection Candidates

The successful job returned these candidates:

```text
2026-07-01
2026-07-02
2026-07-03
2026-07-04
2026-07-05
```

No projection refresh or exact coverage scan ran.

## Duplicate Rerun

The repository identity is deterministic over:

```text
sourceId + symbol + provider fundingTime
```

The live identical rerun was requested but did not start because the execution
approval service reported its usage limit. No fetch or write occurred during
that denied attempt. The runtime rerun result is therefore **NOT VERIFIED** in
this sprint; it must not be reported as a successful duplicate test.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| REST query bounded by start/end/limit | PASS |
| Expected finalized slots | PASS; 13 |
| Returned records match finalized slots | PASS; source jitter <= 7ms |
| Provider metadata | PASS |
| Existing Vision count and digest unchanged | PASS |
| Repository count delta | PASS; +13 |
| Latest Funding observation | PASS; `2026-07-05T00:00:00.003Z` |
| Projection writes | NONE |
| Prohibited behavior scan | PASS |
| Live duplicate rerun | PENDING; approval service limit |

## Remaining Action

Repeat the identical bounded orchestrator command when execution approval is
available. Certification requires `DUPLICATE`, 13 duplicates, zero writes,
and unchanged Repository counts. No implementation change should be needed.
