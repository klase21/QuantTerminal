# Repository Coverage API

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B9  
**Status:** IMPLEMENTED

## Endpoint

```text
GET /api/repository/coverage?symbol=BTCUSDT&date=2026-07-01
```

The same-origin route runs in the Node.js runtime and reads only
`HISTORICAL_COVERAGE_PROJECTION` through `PersistenceRepository`. Local
development uses the SQLite Repository. A configured `DATABASE_URL` selects
the provider-neutral Postgres Repository.

The route never imports or invokes exact coverage evaluation. It performs no
historical fact scan, projection write, provider request, backfill, UI work,
Replay work, Signal generation, Context Snapshot creation, Historical Memory
write, or AI work.

## Projection Lifecycle

The route now reports projection lifecycle status as `AVAILABLE`, `STALE`, or
`PROJECTION_MISSING`. Every returned dataset includes:

- `projectionKind`;
- `computedAt`;
- `sourceRecordCount` and `sourceRepositoryWatermark`;
- `stale` and `recomputeRequired`;
- `projectionVersion`.

Freshness uses the v2 24-hour lifecycle policy. Stale projections remain
readable and explicitly degraded. The API never recomputes them synchronously.

## Successful Response

```json
{
  "ok": true,
  "symbol": "BTCUSDT",
  "utcDay": "2026-07-01",
  "generatedFromProjection": true,
  "projectionStatus": "AVAILABLE",
  "datasets": [
    {
      "dataset": "HISTORICAL_MARKET",
      "actualRecords": 288,
      "expectedRecords": 288,
      "coverageStatus": "COMPLETE",
      "coveragePercent": 100,
      "resolution": "5m",
      "coverageMode": "time_series",
      "providerTier": "CANONICAL",
      "canonical": true,
      "verified": true,
      "confidence": 1,
      "firstObservedAt": "2026-07-01T00:00:00.000Z",
      "lastObservedAt": "2026-07-01T23:55:00.000Z",
      "computedAt": "2026-07-03T08:00:00.000Z",
      "sourceRecordCount": 288,
      "sourceRepositoryWatermark": "869053ff33fbb58384bdedb800705397c6615f82059a67dba771d6c7017354e4"
    }
  ]
}
```

The actual response contains all five projected datasets: OHLCV `COMPLETE`, OI
`PARTIAL`, Liquidation `EXPERIMENTAL`, Funding `MISSING`, and AggTrade
`VARIABLE`.

## Missing Projection

A valid symbol/day without a complete projection returns HTTP 404:

```json
{
  "ok": false,
  "symbol": "CAPUSDT",
  "utcDay": "2026-07-01",
  "generatedFromProjection": false,
    "projectionStatus": "PROJECTION_MISSING",
  "reason": "No precomputed repository coverage projection exists for this symbol and UTC day.",
  "datasets": []
}
```

Missing projections never trigger exact coverage evaluation. An incomplete
projection set also returns `PROJECTION_MISSING`; Repository failure returns
HTTP 503 `UNAVAILABLE`.

## Validation

Invalid symbols and invalid calendar dates return HTTP 400
`VALIDATION_ERROR`. Date validation rejects normalized-but-impossible values
such as `2026-02-30`.

| Case | HTTP | Projection status | Local latency |
| --- | ---: | --- | ---: |
| BTCUSDT, 2026-07-01 | 200 | `AVAILABLE` | 2,792 ms |
| BTCUSDT, 2026-07-02 | 404 | `PROJECTION_MISSING` | 2,867 ms |
| CAPUSDT, 2026-07-01 | 404 | `PROJECTION_MISSING` | 2,756 ms |
| Invalid symbol | 400 | `VALIDATION_ERROR` | 10 ms |
| Invalid date | 400 | `VALIDATION_ERROR` | <1 ms |

Latency includes opening and validating the 3 GB local SQLite Repository. The
route reads five small projection records and no historical fact records.

## B10 Recommendation

**YES: B10 Replay Repository Migration is safe to start with limitations.**

Replay may use this API as a projection-only coverage gate. B10 must preserve
graceful `PROJECTION_MISSING`, `PARTIAL`, `EXPERIMENTAL`, and `MISSING` states,
must not invoke exact coverage in a request, and must introduce bounded
Repository queries for actual Replay datasets. AggTrade must not be scanned in
the Replay request path.

## Validation Summary

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Route compilation | PASS |
| BTCUSDT projection response | PASS; HTTP 200 |
| Missing-date projection | PASS; HTTP 404 |
| CAPUSDT without exact fallback | PASS; HTTP 404 |
| Invalid symbol | PASS; HTTP 400 |
| Invalid date | PASS; HTTP 400 |
| External fetches | NONE |
| Repository writes | NONE |
| Exact coverage imports/calls | NONE |
| Prohibited behavior | PASS |
