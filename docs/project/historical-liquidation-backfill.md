# Historical Liquidation Backfill

**Project:** Theta  
**Track:** Historical Backfill  
**Sprint:** B6 / B6R  
**Status:** RECONCILED WITH EXPERIMENTAL VISIBLE-DATA PROVIDER

## Source Contract

The canonical provider boundary is the registered, production-approved Binance
Vision archive (`sourceId: binance-vision`). The B6 engine targets the official
USD-M Futures liquidation snapshot path:

```text
data/futures/um/daily/liquidationSnapshot/{symbol}/
  {symbol}-liquidationSnapshot-{UTC-day}.zip
```

When an archive exists, the parser accepts only the provider fields needed for
a factual filled-liquidation record:

```text
time
side
average_price
accumulated_fill_quantity
```

`time` is retained verbatim as `sourceTimestamp` and represented as ISO in
`observedAt`. `price` is the provider `average_price`; `quantity` is the
provider `accumulated_fill_quantity`; `notional` is their deterministic
multiplication. Original order price or quantity is not used as a fallback.
Historical records expose `freshness: UNAVAILABLE` because archive retrieval
time is not source freshness.

## Provider Architecture

| Priority | Provider | Role | Production behavior |
| --- | --- | --- | --- |
| 1 | Binance Vision | Canonical official liquidation source | Direct official archive only, where available |
| 2 | Coinalyze Internal Web | Experimental supplemental evidence | Queried only with explicit mapping, caller enablement, and ephemeral visible-page request key |
| 3 | UNAVAILABLE | Safe terminal state | Returned when no official archive exists |

The official Coinalyze API is not used. B6R targets only the publicly visible
chart datafeed discovered from the rendered BTCUSDT liquidation page:

```text
POST https://coinalyze.net/chart/getTheBars/
```

The endpoint requires the page's dynamic `REQ_KEY`. The runtime accepts that
key only as an ephemeral caller input; it does not discover, hardcode, log, or
persist it. Cookies and browser sessions are not accepted by the contract.
Missing explicit provider mappings return `UNAVAILABLE` without deriving a
provider symbol.

The only verified B6R mapping is:

```text
BTCUSDT market -> BTCUSDT_PERP.A
long liquidation -> BTCUSDT_PERP_LQS.A
short liquidation -> BTCUSDT_PERP_LQB.A
```

It is recorded in `VERIFIED_COINALYZE_LIQUIDATION_SYMBOLS`. No naming rule or
suffix inference exists.

Coinalyze Internal Web returns five-minute `barData` keyed by provider epoch,
with mapped long/short series and provider-native liquidation volume. B6R
stores that volume as `quantity`; `price` and `notional` remain `null`. It never
reconstructs those missing values.

The official Binance Vision bucket was checked directly. The USD-M
`daily/liquidationSnapshot/` prefix currently contains no objects. Binance
Vision does contain some COIN-M liquidation archives, but a COIN-M contract is
not equivalent to `BTCUSDT` USD-M and is not an approved fallback.

## Record Contract

Record kind: `HISTORICAL_LIQUIDATION`

Each immutable payload contains:

* `symbol`
* `exchange`
* `provider`
* `observedAt`
* `side`
* `price` (`null` for Coinalyze aggregates)
* `quantity` (provider-native volume for Coinalyze Internal Web)
* `providerTier`
* `canonical`
* `verified`
* `confidence`
* `notional`
* `sourceId`
* `sourceTimestamp`
* `freshness`

Identity is deterministic from:

```text
sourceId + symbol + observedAt + provider fact values
```

Persistence uses
`PersistenceRepository.saveHistoricalLiquidationRecord()` exclusively. The
Repository and adapter reject repeated record IDs or idempotency keys without
overwriting existing facts.

## Initial BTCUSDT Execution

Required execution boundary:

```text
symbol: BTCUSDT
UTC day: 2026-07-01
```

The official archive returned HTTP 404. The engine therefore returned:

```text
UNAVAILABLE
Binance Vision has no official USD-M liquidation archive for BTCUSDT on 2026-07-01.
```

| Item | Result |
| --- | --- |
| Records downloaded | 0 |
| Records written | 0 |
| Repository liquidation records after run | 0 |
| Rerun records written | 0 |
| Rerun duplicates | 0; no source records existed to duplicate |
| Rerun status | `UNAVAILABLE` |

The requested duplicate-producing rerun cannot be certified for this boundary
because no source-backed BTCUSDT liquidation facts exist. Reporting duplicate
records would require fabricating or substituting data and is prohibited.

## Unsupported Symbol Behavior

`CAPUSDT` against the same official boundary returned `UNAVAILABLE`, zero
records, and zero writes. Coinalyze capability for `CAPUSDT` without an
explicit provider instrument mapping also returned `UNAVAILABLE`.

## B6R Fallback State Machine

The provider chain is strict:

```text
Binance Vision
  -> BINANCE_UNAVAILABLE on 404
  -> require explicit Coinalyze Internal Web mapping
  -> COINALYZE_MAPPING_MISSING when absent
  -> require explicit enablement and ephemeral request key
  -> COINALYZE_DISABLED when absent
  -> query visible chart datafeed
  -> COINALYZE_EMPTY when no history is returned
  -> validate and persist through Repository only
```

The visible endpoint was found and queried in the public page context for
`BTCUSDT` on `2026-07-01`. It returned HTTP 200 with 288 five-minute bars, 221
non-empty bars, and 298 mapped long/short rows. The exact response was passed
through the parser and Repository; the temporary out-of-repository response
artifact was removed after validation.

```text
BINANCE_UNAVAILABLE
SUCCESS via EXPERIMENTAL supplemental evidence
```

| B6R check | Result |
| --- | --- |
| Mapping used | `BTCUSDT_PERP.A`, `BTCUSDT_PERP_LQS.A`, `BTCUSDT_PERP_LQB.A` |
| Coinalyze Internal Web endpoint found | YES; `/chart/getTheBars/` |
| Coinalyze queried in visible-page validation | YES; no cookie/token persisted |
| Records written | 298 |
| Duplicate records on rerun | 298; 0 writes |
| `CAPUSDT` | `BINANCE_UNAVAILABLE`, `COINALYZE_MAPPING_MISSING`; no Coinalyze query |
| Mapped, enabled visible response | 288 bars, 221 non-empty bars, 298 rows |
| Repository liquidation record count | 298 |

Duplicate-safe persistence is deterministic and adapter-enforced. The first
run wrote 298 experimental facts; the identical rerun returned 298 duplicates
and zero writes.

## No-Fabrication Boundary

B6/B6R creates no Signal, Context Snapshot, Tracking, Evaluation, Outcome,
Historical Memory, Pattern, Learning, Calibration, Playbook, recommendation,
UI state, or AI reasoning. It does not infer liquidation direction, substitute
trade data, use the official Coinalyze API, map COIN-M records onto USD-M symbols, or use
retrieval time as a provider timestamp.

## Validation

| Check | Result |
| --- | --- |
| TypeScript validation | PASS |
| Provider-aware source model | PASS |
| Deterministic event identity | PASS |
| Repository-only persistence | PASS; direct adapter imports absent |
| Required BTCUSDT archive | BLOCKED; official source returned 404 |
| Required initial write | 0 records |
| Duplicate-safe repository contract | PASS |
| Duplicate rerun with source records | NOT EXECUTABLE; source unavailable |
| Unsupported CAP-like symbol | PASS; `UNAVAILABLE`, 0 writes |
| Coinalyze Internal Web BTC mapping | PASS; market and LQS/LQB symbols explicit |
| Coinalyze disabled gate | PASS; not queried |
| Coinalyze missing mapping | PASS; `COINALYZE_MAPPING_MISSING`, not queried |
| Coinalyze empty response | PASS; `COINALYZE_EMPTY` |
| Provider tier metadata | PASS; Binance `CANONICAL/1.0`, Internal Web `EXPERIMENTAL/0.65` |
| Coinalyze Internal Web persistence | PASS; 298 writes, then 298 duplicates and 0 writes |
| Prohibited behavior scan | PASS |
| UI, Dashboard, Scanner, Replay changes | NONE |
| Signal, Context, Memory, AI generation | NONE |

No production build was run, in accordance with repository instructions.
