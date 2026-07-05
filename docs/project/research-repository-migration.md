# Research Repository Migration

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11  
**Status:** IMPLEMENTED

## Purpose

Research can now manually read a day-level Historical Repository coverage
summary without replacing its existing Narratives, Prediction Markets,
Information Flow, Historical Analog, Event Impact, or Market Memory behavior.

The summary is projection metadata only. It does not read historical fact
records, calculate evidence, generate intelligence, or enter the Research
Decision Brief.

## Request Boundary

```text
Research manual load
  -> researchRepositoryClient
  -> GET /api/repository/coverage?symbol={symbol}&date={UTC-day}
  -> precomputed HISTORICAL_COVERAGE_PROJECTION records only
  -> researchRepositoryAdapter
  -> five display-only coverage rows
```

The client accepts only `generatedFromProjection: true` with
`projectionStatus: AVAILABLE`. `STALE`, `PROJECTION_MISSING`, malformed
responses, and request failures return structured unavailable states. There is
no exact-scan fallback.

## Dataset Summary

The adapter requires exactly the five canonical historical dataset contracts:

| Repository dataset | Research label | Research output |
| --- | --- | --- |
| `HISTORICAL_MARKET` | OHLCV | Coverage status/count and provider metadata |
| `HISTORICAL_OPEN_INTEREST` | Open Interest | Coverage status/count and provider metadata |
| `HISTORICAL_LIQUIDATION` | Liquidation | Coverage status/count and experimental metadata |
| `HISTORICAL_FUNDING` | Funding | Coverage status/count and provider metadata |
| `HISTORICAL_AGG_TRADE` | AggTrade | Variable event-stream count and provider metadata |

Each row preserves resolution, coverage mode, provider tier, canonical state,
verification state, confidence, observation bounds, and projection computation
time. The adapter rejects missing or malformed rows rather than filling them.

## Initial Summary

Target: `BTCUSDT`, `2026-07-01`.

| Dataset | Coverage | Actual / Expected | Tier | Canonical | Confidence |
| --- | --- | ---: | --- | --- | ---: |
| OHLCV | `COMPLETE` | 288 / 288 | `CANONICAL` | true | 1.00 |
| Open Interest | `PARTIAL` | 287 / 288 | `CANONICAL` | true | 1.00 |
| Liquidation | `EXPERIMENTAL` | 298 / 288 | `EXPERIMENTAL` | false | 0.65 |
| Funding | `MISSING` | 0 / 3 | `CANONICAL` | true | 1.00 |
| AggTrade | `VARIABLE` | 1,994,155 / variable | `CANONICAL` | true | 1.00 |

The AggTrade number comes from its precomputed projection. Research does not
scan or load the 1,994,155 AggTrade facts.

## Page Integration

`ResearchPage` adds one manual Repository Coverage panel. It uses the active
investigation symbol and a user-selected UTC day. The initial pilot day is
`2026-07-01`, unless an inherited historical case supplies a date.

The panel is independent of existing Research state:

- no automatic polling;
- no modification of existing Research requests;
- no addition to supporting or conflicting evidence;
- no Decision Brief input;
- no Historical Analog or Market Memory generation;
- no provider fallback.

## Failure Behavior

| Projection result | Research behavior |
| --- | --- |
| `AVAILABLE` | Display five adapted coverage rows |
| `STALE` | Fail closed and display stale reason |
| `PROJECTION_MISSING` | Fail closed and display missing reason |
| Invalid identity/response | Display unavailable reason |
| API/network error | Display unavailable reason |

`CAPUSDT` without a projection returns `PROJECTION_MISSING`; no fact scan or
external provider request follows.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Existing Research behavior | PRESERVED |
| BTCUSDT projection summary | PASS; five rows |
| Stale projection | PASS; fails closed |
| Missing projection | PASS; fails closed |
| CAPUSDT | PASS; projection missing, no fact scan |
| Exact coverage scan | NONE |
| Historical fact query | NONE |
| External provider query | NONE |
| Repository write | NONE |
| AI, Signal, Snapshot, Memory generation | NONE |

## B12 Recommendation

**B12 Evidence Engine can start with limitations.**

B12 may consume immutable projection metadata as availability evidence, but it
must not treat coverage as market direction, confidence in a thesis, or an
outcome. Source-backed market evidence requires separately approved bounded
fact contracts. B12 must preserve manual loading, fail-closed projection
gating, and the no-fabrication boundary.
