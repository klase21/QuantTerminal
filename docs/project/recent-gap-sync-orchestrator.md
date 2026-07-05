# Recent Gap Sync Orchestrator

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.7  
**Status:** IMPLEMENTED  
**Execution mode validated:** DRY RUN ONLY

## Purpose

The Recent Gap Sync Orchestrator is a thin manual orchestration layer over the
existing historical backfill architecture. It does not introduce another
provider, Repository, scheduler, worker, or persistence framework.

```text
Explicit latest Repository observations + explicit target time
  -> Recent Gap Sync Planner
  -> deterministic five-dataset job plan
  -> dry-run result
  -> optional bounded existing runner dispatch (not executed in B11.7)
  -> affected UTC days for future projection refresh
```

Projection refresh is not invoked. Cron, Local Runner, Scheduler Runtime,
Worker Runtime, APIs, and product pages are not connected.

## Manual Contract

`runRecentGapSync()` accepts:

- symbol;
- explicit target end timestamp;
- latest source observation timestamp per requested dataset;
- optional dataset subset;
- `dryRun`;
- Repository and explicit `recordedAt` only for non-dry execution;
- a hard maximum number of completed UTC days per dataset;
- explicit experimental Liquidation enablement.

Latest observations are caller supplied from a Repository freshness read. The
planner does not perform an unbounded generic Repository scan. Invalid symbols,
timestamps, duplicate dataset selection, future latest observations, or
missing non-dry dependencies fail validation.

## Deterministic Planning

Job identity hashes:

```text
dataset + symbol + missingWindowStart + missingWindowEnd
```

Plan identity hashes the ordered job identities. Identical inputs produce the
same plan and job IDs. Existing dataset runners retain their own deterministic
fact identities and Repository duplicate behavior.

## Dataset Contracts

| Priority | Dataset | Resolution | Coverage mode | Provider strategy | Existing bounded execution |
| ---: | --- | --- | --- | --- | --- |
| 1 | Market | `5m` | `time_series` | Binance Vision archive | **NO**; current runners are fixed-week/full-history |
| 2 | Funding | `8h_event` | `event` | Binance Vision archive | **NO**; current runner rediscovers/replays all months |
| 3 | Open Interest | `5m` | `time_series` | Binance Vision archive | **YES**; explicit UTC day |
| 4 | AggTrade | `tick` | `event_stream` | Binance Vision archive | **YES**; explicit UTC day |
| 5 | Liquidation | `5m` | `time_series_experimental` | Binance Vision, then explicit experimental provider | **YES**; explicit UTC day and explicit experimental inclusion |

No REST fallback or new Internal API path was added. Liquidation retains the
existing explicit Coinalyze mapping, enablement, and request-key gates.

Only completed UTC archive days may be dispatched. The current partial UTC day
remains in the affected-day set but is not sent to a daily archive runner.
AggTrade ending within the final second of a UTC day starts its next archive
gap on the following day, avoiding a needless full-day duplicate replay.

## Initial BTCUSDT Dry Run

Target: `2026-07-04T19:11:23.341Z`  
Source observations: B11.5 Repository Freshness Audit

| Dataset | Missing start | Missing end | Estimated missing | Affected UTC days | Execution |
| --- | --- | --- | ---: | --- | --- |
| Market | `2026-07-02T00:00:00.000Z` | `2026-07-04T19:10:00.000Z` | 807 | Jul 2–4 | Blocked: bounded Market runner missing |
| Funding | `2026-07-01T00:00:00.005Z` | `2026-07-04T16:00:00.005Z` | 12 | Jul 1–4 | Blocked: bounded Funding runner missing |
| Open Interest | `2026-07-02T00:05:00.000Z` | `2026-07-04T19:10:00.000Z` | 806 | Jul 2–4 | Existing daily runner reusable |
| AggTrade | `2026-07-02T00:00:00.000Z` | `2026-07-04T19:11:23.341Z` | Variable | Jul 2–4 | Existing daily runner reusable |
| Liquidation | `2026-07-02T00:00:00.000Z` | `2026-07-04T19:10:00.000Z` | 807 | Jul 2–4 | Existing daily runner reusable; experimental opt-in required |

Combined affected UTC days:

```text
2026-07-01
2026-07-02
2026-07-03
2026-07-04
```

At this target, only July 2 and July 3 are complete archive days for the three
reusable daily runners. July 4 is not dispatched.

The dry run produced zero fetch calls, required no Repository instance, and
wrote no facts, operational records, or projections. Repeating the same input
produced the same plan ID.

## Non-Dry Dispatch Boundary

The callable execution contract exists but was not run in B11.7.

- OI delegates to `runBinanceVisionOpenInterestBackfill()` per completed day.
- AggTrade delegates to `runBinanceVisionAggTradeBackfill()` per completed day.
- Liquidation delegates to `runBinanceVisionLiquidationBackfill()` only when
  experimental execution is explicitly included.
- Market and Funding return `UNSUPPORTED`; their broad runners are never
  called by this orchestrator.
- A per-dataset day cap rejects oversized runs before provider access.
- Successful and duplicate day results become `projectionRefreshDays`, but no
  projection function is called.

Job results report attempted days, records written, duplicates, errors, and
days eligible for later projection refresh. They do not claim refresh occurred.

## Missing Runner Gaps

Before all-dataset execution is possible:

1. Market needs a bounded daily archive adapter that reuses the existing
   parser, validator, and `persistHistoricalCandles()` path.
2. Funding needs a bounded month/day adapter that reads only the containing
   recent archive and filters source-backed events to the planned window.
3. AggTrade execution needs cautious one-day manual operation because record
   volume is variable and large.
4. Cooperative cancellation, durable checkpointing, retry execution, and
   rate limiting remain unimplemented.

## Projection Boundary

The plan returns affected UTC days and dry-run projection candidates. Non-dry
results return only successful or duplicate completed days as projection
refresh candidates.

Neither `evaluateRepositoryCoverage()` nor `writeCoverageProjection()` is
imported by the orchestrator. B11.8 must keep projection refresh a separate,
explicit post-sync step until its cost and failure semantics are certified.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| BTCUSDT five-dataset dry-run | PASS |
| Deterministic repeated plan | PASS |
| Dry-run fetch calls | 0 |
| Dry-run Repository dependency | NONE |
| Dry-run Repository writes | NONE |
| Projection writes | NONE |
| Existing runner reuse contract | OI, AggTrade, Liquidation |
| Broad Market/Funding runner prevention | PASS; explicit unsupported result |
| New provider integration | NONE |
| UI/runtime integration | NONE |
| Prohibited behavior | PASS |

## B11.8 Recommendation

**B11.8 Manual Recent Gap Sync Execution is safe to start with strict
limitations.**

The first execution should select **Open Interest only**, one completed UTC
day, with an explicit Repository, `recordedAt`, fetch boundary, and day cap of
one. AggTrade should be a separate volume-certified run. Experimental
Liquidation must remain opt-in. Market and Funding must not execute until their
bounded adapters are implemented and validated.

B11.8 must record before/after Repository counts, duplicate rerun behavior,
provider timestamps, and exact attempted days. It must not connect Cron,
workers, APIs, UI, or automatic projection refresh.
