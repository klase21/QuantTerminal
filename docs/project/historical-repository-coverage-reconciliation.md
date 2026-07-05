# Historical Repository Coverage Reconciliation

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B7.6  
**Target:** `BTCUSDT`, `2026-07-01` UTC

## Result

Repository coverage was reconciled where the approved source now supports a
deterministic repair. No UI, Replay, product page, Signal, Context Snapshot,
Historical Memory, or AI behavior changed.

## Root Cause Analysis

### OHLCV

The complete B3 run correctly stopped at `2026-06-30T23:55:00.000Z`. At that
run's execution time, Binance Vision had not yet published the July 1 daily
archive. The archive planner therefore ended at the latest discoverable
complete UTC day. There was no symbol mapping, mapper, identity, UTC-boundary,
or persistence defect.

On 2026-07-03, the official archive
`BTCUSDT-5m-2026-07-01.zip` returned HTTP 200. It was parsed and validated by
the existing OHLCV runtime, then persisted through `PersistenceRepository`.

**Root cause:** publication timing followed by execution omission.  
**Repair:** 288 canonical candles written; zero missing five-minute intervals.

### Funding

Funding uses the approved Binance Vision monthly `fundingRate` dataset. The
implementation intentionally plans only completed monthly archives. July 2026
is still in progress, so the monthly July archive returned HTTP 404. A probed
daily funding archive path also returned HTTP 404.

The Repository, mapper, deterministic identity, and existing 7,119 records are
healthy. The latest source-backed funding fact remains
`2026-06-30T16:00:00.005Z`.

**Root cause:** approved source archive cadence and target-date mismatch.  
**Repair:** none. Live REST data, inferred cadence values, and fabricated July
records were rejected as unsafe substitutions.

### Open Interest

B5 persisted 288 immutable OI facts before provider-tier metadata was added to
the historical persistence contract. Re-running B5 correctly returned
duplicates, so it could not retrofit payload fields without violating
fact immutability.

**Root cause:** execution preceded the provider-tier contract.  
**Repair:** 288 immutable `HISTORICAL_PROVIDER_METADATA` attestations were
appended. Each attestation references one existing OI record and persists:

- `providerTier: CANONICAL`
- `canonical: true`
- `verified: true`
- `confidence: 1.0`
- `sourceId: binance-vision`

No OI identity or fact payload was modified.

The Binance metrics archive contains observations from `00:05` through exactly
`2026-07-02T00:00:00.000Z`. Under the strict half-open July 1 boundary, 287 of
the 288 source rows are in-day. The boundary row remains preserved as supplied.

### AggTrade And Liquidation

AggTrade required no repair. All 1,994,155 records remain canonical and inside
the target day. Experimental liquidation required no repair. All 298 records
remain explicitly non-canonical.

## Coverage Report

Coverage uses the half-open interval
`[2026-07-01T00:00:00.000Z, 2026-07-02T00:00:00.000Z)`.

| Dataset | Expected | Actual | Coverage | Provider | Tier | Canonical | Verified | Confidence | Reason | Status |
| --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- |
| OHLCV 5m | 288 | 288 | 100% | Binance Vision | `CANONICAL` | true | true | 1.0 | Official daily archive now published and ingested | `COMPLETE` |
| Funding | 3 cadence slots | 0 | 0% | Binance Vision | `CANONICAL` | true | true | 1.0 | July monthly archive and daily archive path unavailable | `UNAVAILABLE` |
| Open Interest | 288 archive rows | 287 in-day | 99.65% | Binance Vision | `CANONICAL` | true | true | 1.0 | One provider row is exactly the next-day UTC boundary | `PARTIAL` |
| AggTrade | 1,994,155 | 1,994,155 | 100% | Binance Vision | `CANONICAL` | true | true | 1.0 | Complete validated source archive | `COMPLETE` |
| Liquidation | 298 supplied rows | 298 | 100% of supplied evidence | Coinalyze Internal Web | `EXPERIMENTAL` | false | false | 0.65 | Supplemental explicitly mapped evidence | `EXPERIMENTAL` |

The Funding expectation describes the established eight-hour source cadence;
it is not a claim that unavailable July values exist. No records are generated
from that expectation.

## Repairs Performed

1. Added provider-neutral immutable historical metadata attestations to the
   Repository contract.
2. Persisted 288 OI attestations without changing existing OI identities.
3. Ingested 288 source-backed July 1 OHLCV candles through Repository only.
4. Preserved Funding as `UNAVAILABLE` because no approved archive exists.

## Rerun Safety

The identical reconciliation rerun returned:

| Record set | New writes | Duplicates |
| --- | ---: | ---: |
| July 1 OHLCV | 0 | 288 |
| OI provider metadata | 0 | 288 |

No existing record was overwritten.

## Repository Integrity

- OHLCV target-day count: 288; first `00:00`, last `23:55`.
- OHLCV interval violations: 0.
- OI fact count: 288; strict in-day count: 287.
- OI metadata attestations: 288; valid target references: 288.
- AggTrade count: 1,994,155.
- Experimental liquidation count: 298; all retain `canonical: false`.
- Record ID collisions: 0.
- Idempotency-key collisions: 0.
- Existing historical identities modified: 0.

## Remaining Limitations

- July 1 Funding remains unavailable until Binance Vision publishes an approved
  archive containing the target date.
- OI archive-day semantics are right-boundary based; strict UTC-day coverage is
  therefore 287/288 even though all 288 archive rows are present.
- Older historical facts may require metadata attestations rather than payload
  mutation when their persisted payload predates the provider-tier contract.
- Experimental liquidation is not canonical coverage.

## B8 Recommendation

**YES: Repository is ready for B8 Coverage Engine.**

B8 must model dataset-specific time semantics and resolve immutable provider
metadata attestations. It must expose Funding as `UNAVAILABLE`, OI as `PARTIAL`
for strict July 1 boundaries, and Liquidation as `EXPERIMENTAL`. Repository
integrity no longer blocks Coverage Engine implementation; incomplete source
coverage remains explicit input to it.

Replay migration should continue to require Coverage Engine output rather than
assuming every dataset is complete.

## B7.7 Resolution Contract Addendum

Five immutable `HISTORICAL_DATASET_METADATA` records now define dataset-specific
resolution and coverage semantics. Funding is evaluated against three
eight-hour events per UTC day, OI and OHLCV against 288 five-minute
observations, experimental Liquidation against 288 five-minute bars, and
AggTrade as a variable tick stream with no fixed daily denominator.

The initial metadata run wrote five records. Its identical rerun returned five
duplicates and zero writes. Historical market fact counts and identities did
not change.

## Validation Summary

| Check | Result |
| --- | --- |
| Official OHLCV archive availability | PASS; HTTP 200 |
| Official Funding archive availability | UNAVAILABLE; daily and July monthly HTTP 404 |
| Repository-only OHLCV persistence | PASS; 288 writes |
| OI metadata reconciliation | PASS; 288 immutable attestations |
| Duplicate-safe reconciliation rerun | PASS; 576 duplicates, zero writes |
| Deterministic identity | PASS |
| Provider metadata | PASS through OI attestations and native current records |
| Time boundaries | PASS with explicit OI boundary classification |
| Repository counts | PASS |
| Prohibited behavior | PASS |
