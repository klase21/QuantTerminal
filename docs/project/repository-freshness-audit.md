# Repository Freshness Audit

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B11.5  
**Status:** COMPLETE  
**Audit time:** `2026-07-03T21:41:46.150Z`

## Purpose

This audit measures the latest source-backed observation currently stored in
the local Historical Repository. It performs no backfill, provider request,
projection recomputation, Repository write, product change, or intelligence
generation.

## Read Method

The SQLite Repository was opened with `readonly: true`, `fileMustExist: true`,
and `PRAGMA query_only=ON`. Indexed storage metadata supplied `COUNT`, `MIN`,
and `MAX` for each historical record kind. One latest payload and the immutable
`HISTORICAL_DATASET_METADATA` contract supplied provider and resolution
metadata.

No historical payload collection was materialized. In particular, the audit
did not deserialize or page through 1,994,155 AggTrade facts. The Repository
mapper stores provider observation time as `created_at` for all five datasets;
Funding uses `fundingTime` and the other datasets use `observedAt`.

Coverage projections were neither read nor written for freshness values.

## Freshness Policy

`expectedLatestObservation` uses the last cadence boundary at or before audit
time:

- five-minute series: `2026-07-03T21:40:00.000Z`;
- Funding eight-hour event: `2026-07-03T16:00:00.000Z`;
- AggTrade event stream: audit time, with a one-hour current tolerance.

Statuses:

| Status | Rule |
| --- | --- |
| `CURRENT` | Gap is no greater than one native cadence; AggTrade gap is no greater than one hour |
| `RECENT_GAP` | Gap exceeds current tolerance but is no greater than 24 hours |
| `STALE` | Gap exceeds 24 hours |
| `UNKNOWN` | Observation time or native resolution is unavailable |

This policy measures Repository recency only. It does not claim that an
external archive should already be published.

## Freshness Audit

| Dataset | Earliest | Latest | Total | Latest UTC date/hour | Expected latest | Freshness | Estimated gap |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `HISTORICAL_MARKET` | `2019-12-31T00:00:00.000Z` | `2026-07-01T23:55:00.000Z` | 684,000 | `2026-07-01 / 23` | `2026-07-03T21:40:00.000Z` | `STALE` | 45h 45m |
| `HISTORICAL_OPEN_INTEREST` | `2026-07-01T00:05:00.000Z` | `2026-07-02T00:00:00.000Z` | 288 | `2026-07-02 / 00` | `2026-07-03T21:40:00.000Z` | `STALE` | 45h 40m |
| `HISTORICAL_FUNDING` | `2020-01-01T00:00:00.000Z` | `2026-06-30T16:00:00.005Z` | 7,119 | `2026-06-30 / 16` | `2026-07-03T16:00:00.000Z` | `STALE` | approximately 72h |
| `HISTORICAL_LIQUIDATION` | `2026-07-01T00:00:00.000Z` | `2026-07-01T23:55:00.000Z` | 298 | `2026-07-01 / 23` | `2026-07-03T21:40:00.000Z` | `STALE` | 45h 45m |
| `HISTORICAL_AGG_TRADE` | `2026-07-01T00:00:00.058Z` | `2026-07-01T23:59:59.987Z` | 1,994,155 | `2026-07-01 / 23` | `2026-07-03T21:41:46.150Z` | `STALE` | 45h 41m 46s |

Funding is evaluated as an `8h_event` dataset. It is not compared against a
five-minute cadence or a 288-record daily expectation.

## Dataset Metadata

| Dataset | Provider | Tier | Canonical | Verified | Confidence | Resolution | Coverage mode |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| `HISTORICAL_MARKET` | Binance Vision (`binance-vision`) | `CANONICAL` | true | true | 1.00 | `5m` | `time_series` |
| `HISTORICAL_OPEN_INTEREST` | Binance Vision (`binance-vision`) | `CANONICAL` | true | true | 1.00 | `5m` | `time_series` |
| `HISTORICAL_FUNDING` | Binance Vision (`binance-vision`) | `CANONICAL` | true | true | 1.00 | `8h_event` | `event` |
| `HISTORICAL_LIQUIDATION` | Coinalyze Internal Web (`coinalyze-internal-web`) | `EXPERIMENTAL` | false | false | 0.65 | `5m` | `time_series_experimental` |
| `HISTORICAL_AGG_TRADE` | Binance Vision (`binance-vision`) | `CANONICAL` | true | true | 1.00 | `tick` | `event_stream` |

Provider-tier and resolution values come from immutable dataset metadata
attestations where older fact payloads do not carry the normalized fields.
Facts were not rewritten.

## Recent Gap Sync

All five datasets require synchronization if the next sprint is authorized:

1. `HISTORICAL_MARKET`
2. `HISTORICAL_FUNDING`
3. `HISTORICAL_OPEN_INTEREST`
4. `HISTORICAL_AGG_TRADE`
5. `HISTORICAL_LIQUIDATION`

No dataset is currently within its current or recent-gap tolerance.

## Recommended Order

1. **Market OHLCV:** restore the canonical price foundation first; downstream
   time alignment depends on it.
2. **Funding:** close the largest canonical gap using its native eight-hour
   event cadence.
3. **Open Interest:** restore the canonical five-minute derivatives series.
4. **AggTrade:** synchronize after core series because its event volume is
   substantially larger and must remain resumable and bounded.
5. **Liquidation:** synchronize last because the current source is
   experimental, non-canonical, and unverified.

Synchronization must preserve deterministic identities, duplicate-safe
Repository-only writes, provider timestamps, and existing provider tiers. This
audit does not authorize or implement that work.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Repository access | PASS; strict read-only/query-only |
| Historical fact writes | NONE |
| Projection reads/writes or recomputation | NONE |
| External fetches | NONE |
| AggTrade payload scan | NONE; indexed metadata aggregate only |
| Product/runtime changes | NONE |
| Prohibited behavior | PASS |
