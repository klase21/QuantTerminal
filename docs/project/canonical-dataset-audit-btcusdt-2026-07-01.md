# Canonical Dataset Audit: BTCUSDT 2026-07-01

## Scope

This read-only audit covers records in `.data/historical-backfill.sqlite` for
`BTCUSDT` during the half-open UTC interval
`[2026-07-01T00:00:00.000Z, 2026-07-02T00:00:00.000Z)`.

No runtime, repository, persistence, product page, Replay, signal, snapshot, or
Historical Memory behavior was changed.

## Dataset Counts

| Dataset | Record kind | In-day records | Repository records | First repository timestamp | Last repository timestamp | Result |
| --- | --- | ---: | ---: | --- | --- | --- |
| OHLCV 5m | `HISTORICAL_MARKET` | 0 | 683,712 | `2019-12-31T00:00:00.000Z` | `2026-06-30T23:55:00.000Z` | COVERAGE GAP |
| Funding | `HISTORICAL_FUNDING` | 0 | 7,119 | `2020-01-01T00:00:00.000Z` | `2026-06-30T16:00:00.005Z` | COVERAGE GAP |
| Open Interest | `HISTORICAL_OPEN_INTEREST` | 287 | 288 | `2026-07-01T00:05:00.000Z` | `2026-07-02T00:00:00.000Z` | PARTIAL |
| AggTrade | `HISTORICAL_AGG_TRADE` | 1,994,155 | 1,994,155 | `2026-07-01T00:00:00.058Z` | `2026-07-01T23:59:59.987Z` | PASS |
| Liquidation | `HISTORICAL_LIQUIDATION` | 298 | 298 | `2026-07-01T00:00:00.000Z` | `2026-07-01T23:55:00.000Z` | PASS (EXPERIMENTAL) |

OHLCV uses `openTime`, Funding uses `fundingTime`, and the remaining datasets
use `observedAt` as their audit timestamp. The OI archive contains 288 records,
but its final provider record is exactly the exclusive next-day boundary and is
therefore not counted as July 1 coverage.

## Provider Metadata

| Dataset | Required tier | Stored sourceId | Stored tier result | Canonical flags | Result |
| --- | --- | --- | --- | --- | --- |
| OHLCV | `CANONICAL` | No July 1 record | Not auditable for target day | Not auditable for target day | FAIL: coverage absent |
| Funding | `CANONICAL` | No July 1 record | Not auditable for target day | Not auditable for target day | FAIL: coverage absent |
| Open Interest | `CANONICAL` | `binance-vision` | `providerTier` missing on all 287 in-day records | `canonical`, `verified`, and `confidence` missing | FAIL: persisted provenance incomplete |
| AggTrade | `CANONICAL` | `binance-vision` | `CANONICAL` on 1,994,155 records | `true`, `true`, `1.0` | PASS |
| Liquidation | `EXPERIMENTAL` | `coinalyze-internal-web` | `EXPERIMENTAL` on 298 records | `false`, `false`, `0.65` | PASS |

The current OHLCV, Funding, and OI runtime models declare canonical provider
metadata. This audit does not treat those declarations as proof for absent or
previously persisted rows. Existing records were not overwritten to retrofit
metadata.

## Identity And Collision Audit

Deterministic identities were recomputed from each dataset's canonical identity
function inputs.

| Dataset | Records checked | Identity mismatches | Duplicate domain identities |
| --- | ---: | ---: | ---: |
| OHLCV | 683,712 | 0 | 0 |
| Funding | 7,119 | 0 | 0 |
| Open Interest | 288 | 0 | 0 |
| AggTrade | 1,994,155 | 0 | 0 |
| Liquidation | 298 | 0 | 0 |

Repository `record_id` and `idempotency_key` counts equal row counts for every
record kind. No duplicate identity exists within a sourceId namespace. Shared
use of `binance-vision` across canonical dataset kinds is intentional and is
isolated by record kind and dataset-specific identity prefixes.

## Time And Ordering Audit

- All 1,994,155 AggTrade timestamps are inside the target UTC day.
- AggTrade row order has zero `tradeTime` regressions and zero non-increasing
  `aggregateTradeId` transitions.
- AggTrade IDs span `3365320781` through `3367314935`.
- All 298 experimental liquidation records are inside the target UTC day and
  retain `canonical: false`.
- OI has 287 in-day records. Its remaining record is the provider-supplied
  `2026-07-02T00:00:00.000Z` boundary observation; it is not rewritten or
  attributed to July 1.
- OHLCV and Funding have no target-day timestamps to validate.

## Anomalies

1. `HISTORICAL_MARKET` stops at `2026-06-30T23:55:00.000Z`; July 1 has no 5m
   OHLCV coverage.
2. `HISTORICAL_FUNDING` stops at `2026-06-30T16:00:00.005Z`; July 1 has no
   funding observation.
3. The persisted OI archive crosses the requested day boundary and contains
   only 287 strict in-day observations.
4. Persisted OI records lack `providerTier`, `canonical`, `verified`, and
   `confidence`, despite the current source model classifying Binance Vision OI
   as canonical.
5. Liquidation is supplemental experimental evidence, not a canonical dataset.

No fabricated replacement data, timestamps, metadata, or inferred coverage was
introduced.

## B8 Readiness

**B8 Coverage Engine is safe to start with limitations.** Its first contract
must represent absent, partial, boundary-crossing, and provenance-incomplete
coverage explicitly. It must not classify the target day as fully canonical.

Replay or other consumer migration is **not ready** to assume complete July 1
coverage until OHLCV and Funding are reconciled and persisted OI provider-tier
metadata is addressed without overwriting immutable facts.

## Validation Summary

- Repository read/count check: PASS
- Deterministic identity recomputation: PASS
- Duplicate source identity check: PASS
- AggTrade ordering check: PASS
- UTC boundary check: FAIL (OI boundary record; OHLCV/Funding absent)
- Provider metadata check: FAIL (persisted OI metadata incomplete)
- Liquidation experimental/non-canonical check: PASS
- Prohibited behavior review: PASS; this sprint adds documentation only

## Decision

**DATASET AUDIT COMPLETE WITH ANOMALIES**

