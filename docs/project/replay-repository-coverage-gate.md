# Replay Repository Coverage Gate

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B10  
**Status:** IMPLEMENTED

## Purpose

Replay now has a projection-only readiness gate for future Repository-backed
dataset loading. The gate calls:

```text
GET /api/repository/coverage?symbol={symbol}&date={UTC-day}
```

It does not load Repository datasets, compute coverage, scan facts, request
recomputation, query an external provider, or change the existing Replay
provider path.

## Gate Contract

| API projection status | repositoryReady | degradedReason |
| --- | --- | --- |
| `AVAILABLE` | true | null |
| `STALE` | false | `STALE_PROJECTION` |
| `PROJECTION_MISSING` | false | `PROJECTION_MISSING` |
| API, network, or malformed response | false | `COVERAGE_API_ERROR` |

Unknown statuses fail closed as API errors. The helper never falls back to
exact coverage.

## Replay Integration

When the user selects Load Replay, the coverage gate starts first and runs
concurrently with the existing provider-backed Replay requests. This preserves
chart responsiveness and existing CryptoHFTData/Binance behavior.

No Repository dataset query exists in B10. The gate result controls only
future Repository eligibility:

- `AVAILABLE` permits a future bounded Repository branch;
- `STALE` displays a degraded/limited state and keeps that branch closed;
- `PROJECTION_MISSING` fails the Repository branch closed;
- API failure keeps the Repository branch closed.

Replay Metadata displays the projection status. A closed gate displays the
explicit degraded reason. Existing chart, liquidations, OI, Funding,
orderbook, manual datasets, controls, and fallback behavior remain unchanged.

## No Exact Scan Boundary

`replayCoverageGate.ts` calls only the same-origin coverage API. Neither the
helper nor `ReplayV1Page` imports the Coverage Engine, projection writer, exact
evaluator, Repository adapter, or historical backfill runtime.

## B10.5 Recommendation

**YES: B10.5 bounded Replay dataset query is safe to start.**

B10.5 must require `repositoryReady: true`, query one bounded dataset/window,
preserve the current provider path, and fail closed without exact scans or
unbounded AggTrade reads. `STALE`, `PROJECTION_MISSING`, and
`COVERAGE_API_ERROR` must never enter the Repository data path.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Replay page compilation | PASS |
| `AVAILABLE` mapping | PASS; ready true |
| `STALE` mapping | PASS; `STALE_PROJECTION` |
| Missing mapping | PASS; `PROJECTION_MISSING` |
| API/network failure mapping | PASS; `COVERAGE_API_ERROR` |
| Existing Replay provider flow | PRESERVED |
| Exact coverage calls | NONE |
| External provider additions | NONE |
| Historical backfill changes | NONE |
| Prohibited behavior | PASS |

