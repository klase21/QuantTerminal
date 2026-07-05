# Repository Coverage Engine

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B8  
**Status:** IMPLEMENTED

## Purpose

The Repository Coverage Engine evaluates historical dataset coverage for one
symbol and one strict UTC day. It reads only through `PersistenceRepository`.
It performs no provider request, backfill, API handling, UI work, Signal
generation, Context Snapshot creation, Historical Memory write, or AI work.

## Output Contract

Every dataset result includes:

- dataset, symbol, and UTC day;
- resolution and coverage mode;
- expected and actual records;
- coverage percentage;
- repository coverage status;
- provider availability status;
- provider identity, tier, canonical/verified flags, and confidence;
- first and last in-day observation timestamps;
- an explicit reason.

Repository coverage statuses are `COMPLETE`, `PARTIAL`, `MISSING`,
`UNAVAILABLE`, `EXPERIMENTAL`, and `VARIABLE`.

Provider availability statuses are `AVAILABLE`, `UNAVAILABLE`, `UNKNOWN`, and
`NOT_CHECKED`.

## Status Separation

`repositoryCoverageStatus` describes only records stored for the requested
half-open UTC interval. `providerAvailabilityStatus` does not claim external
liveness. `AVAILABLE` means the Repository contains source-backed history for
the provider and symbol. External providers are never queried.

This distinction makes Funding `MISSING` for July 1 while provider availability
remains `AVAILABLE` because canonical historical Funding records exist for
BTCUSDT on other dates.

## Initial Evaluation

Target: `BTCUSDT`, `2026-07-01`  
Range: `[2026-07-01T00:00:00.000Z, 2026-07-02T00:00:00.000Z)`

| Dataset | Resolution | Expected | Actual | Coverage | Repository status | Provider availability | Tier | First | Last |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| `HISTORICAL_MARKET` | `5m` | 288 | 288 | 100% | `COMPLETE` | `AVAILABLE` | `CANONICAL` | `00:00:00.000Z` | `23:55:00.000Z` |
| `HISTORICAL_OPEN_INTEREST` | `5m` | 288 | 287 | 99.65% | `PARTIAL` | `AVAILABLE` | `CANONICAL` | `00:05:00.000Z` | `23:55:00.000Z` |
| `HISTORICAL_LIQUIDATION` | `5m` | 288 | 298 | 100% capped | `EXPERIMENTAL` | `AVAILABLE` | `EXPERIMENTAL` | `00:00:00.000Z` | `23:55:00.000Z` |
| `HISTORICAL_FUNDING` | `8h_event` | 3 | 0 | 0% | `MISSING` | `AVAILABLE` | `CANONICAL` | null | null |
| `HISTORICAL_AGG_TRADE` | `tick` | null | 1,994,155 | null | `VARIABLE` | `AVAILABLE` | `CANONICAL` | `00:00:00.058Z` | `23:59:59.987Z` |

The OI record at exactly `2026-07-02T00:00:00.000Z` is excluded by the strict
half-open boundary. Liquidation remains non-canonical regardless of count.
AggTrade receives no fabricated fixed denominator.

## Repository Health Model

`repositoryHealth.ts` performs a provider-history check through Repository
pages only:

- matching source-backed history: `AVAILABLE`;
- Repository unavailable: `UNAVAILABLE`;
- no matching history and no external check: `UNKNOWN`;
- contract unavailable before a check can run: `NOT_CHECKED`.

## Performance Limitation

The initial complete evaluation took 74,661 ms on the local SQLite Repository.
The current provider-neutral list contract must deserialize all 1,994,155
AggTrade records to produce an exact count and strict timestamp range.

This is acceptable for a manual audit or background computation, but violates
the request-path responsiveness requirement. The engine performs streaming
page reads and does not retain the full dataset in memory, but paging alone
does not remove the aggregate cost.

## B9 Recommendation

**B9 Repository Query API is not safe for direct production request-path
exposure yet.**

B9 may begin only if its first responsibility is a provider-neutral bounded
coverage aggregate or precomputed/cache-backed coverage projection. An API must
not synchronously invoke the current full AggTrade scan. No direct SQLite or
Postgres query may bypass Repository ownership.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Repository-only reads | PASS |
| External fetches | NONE |
| OHLCV expected count | PASS; 288 |
| OI expected count | PASS; 288 |
| Liquidation expected count and tier | PASS; 288, experimental |
| Funding expected count | PASS; 3, not 288 |
| AggTrade variable count | PASS; null denominator, 1,994,155 actual |
| Strict UTC boundary | PASS |
| Repository writes | NONE |
| Prohibited behavior | PASS |

