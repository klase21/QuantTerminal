# Bounded Replay Repository Query

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B10.5  
**Status:** IMPLEMENTED

## Purpose

The bounded Replay Repository API exposes one dataset for one symbol, UTC day,
and UTC hour. It does not replace or modify the existing Replay loading path.

```text
GET /api/repository/replay
  ?symbol=BTCUSDT
  &date=2026-07-01
  &hour=8
  &dataset=open_interest
```

The route reads through `PersistenceRepository` only. It performs no provider
request, exact coverage scan, Repository write, backfill, AI work, Signal
generation, Context Snapshot creation, or Historical Memory write.

## Coverage Gate

Before reading facts, the route reads only the coverage projection set. It
continues only when projection status is `AVAILABLE`.

- `STALE` returns `COVERAGE_NOT_READY`.
- Missing projection returns HTTP 404 `PROJECTION_MISSING`.
- CAPUSDT therefore stops before any historical fact query.
- The Replay client also refuses to issue the request unless its B10 gate has
  `repositoryReady: true` and status `AVAILABLE`.

Gate enforcement exists on both client and server; bypassing the client does
not bypass projection readiness.

## Dataset Bounds

| Dataset | Repository kind | Bound |
| --- | --- | --- |
| `market` | `HISTORICAL_MARKET` | Strict one-hour range; up to 12 five-minute candles expected |
| `open_interest` | `HISTORICAL_OPEN_INTEREST` | Strict one-hour range; up to 12 five-minute points expected |
| `liquidation` | `HISTORICAL_LIQUIDATION` | Strict one-hour range; bars/events may exceed 12 when both sides exist |
| `funding` | `HISTORICAL_FUNDING` | Events in the hour, otherwise latest event in a bounded 24-hour lookback |
| `agg_trade` | `HISTORICAL_AGG_TRADE` | Strict one-hour range plus hard response limit and cursor pagination |

AggTrade defaults to 1,000 records and caps requests at 5,000. A page with
remaining records returns `truncated: true` and an opaque `nextCursor`. It never
returns the full 1,994,155-record day.

## Initial Hour 08 Results

Target: `BTCUSDT`, `2026-07-01`, `08:00-08:59:59.999Z`

| Dataset | Count | First observation | Last observation | Local latency |
| --- | ---: | --- | --- | ---: |
| Market | 12 | `08:00:00.000Z` | `08:55:00.000Z` | 5,673 ms |
| Open Interest | 12 | `08:00:00.000Z` | `08:55:00.000Z` | 5,349 ms |
| Liquidation | 13 | `08:00:00.000Z` | `08:55:00.000Z` | 5,283 ms |
| Funding | 1 latest prior event | `2026-06-30T16:00:00.005Z` | same | 5,391 ms |
| AggTrade page 1 | 1,000 | `08:00:00.107Z` | `08:00:57.871Z` | 4,388 ms |
| AggTrade page 2 | 1,000 | continuation | continuation | 2,899 ms |

The first AggTrade page and continuation page both returned
`truncated: true`. A limit of 5,001 was rejected before Repository access.

Latency includes opening and validating the 3 GB local SQLite Repository plus
the projection gate. B10.6 must treat Repository datasets as optional/manual
and preserve current Replay responsiveness.

## Response Shape

```json
{
  "ok": true,
  "symbol": "BTCUSDT",
  "date": "2026-07-01",
  "hour": 8,
  "dataset": "open_interest",
  "source": "repository",
  "bounded": true,
  "records": [],
  "count": 12,
  "firstObservedAt": "2026-07-01T08:00:00.000Z",
  "lastObservedAt": "2026-07-01T08:55:00.000Z",
  "providerTier": "CANONICAL",
  "canonical": true,
  "verified": true,
  "confidence": 1,
  "truncated": false,
  "nextCursor": null,
  "limit": null
}
```

## B10.6 Recommendation

**YES: B10.6 Replay Repository Adapter is safe to start with limitations.**

The adapter must remain behind `repositoryReady`, load only bounded hourly
datasets, preserve the existing provider path, and treat failures as optional
degradation. AggTrade must remain manual/paginated and must not auto-load as a
complete hour. No request may fall back to an exact coverage scan.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Market hour query | PASS; 12 |
| OI hour query | PASS; 12 |
| Liquidation hour query | PASS; 13 experimental bars |
| Funding bounded prior event | PASS; 1 |
| AggTrade hard limit | PASS; 1,000 returned |
| AggTrade cursor continuation | PASS |
| AggTrade over-limit rejection | PASS; HTTP 400 |
| CAPUSDT projection gate | PASS; no fact query |
| Closed client gate | PASS; fetch not called |
| Exact coverage calls | NONE |
| External provider calls | NONE |
| Repository writes | NONE |
| Existing Replay UI/provider path | UNCHANGED |
| Prohibited behavior | PASS |

