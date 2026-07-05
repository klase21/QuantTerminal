# Coinalyze Internal Liquidation Provider

**Classification:** EXPERIMENTAL supplemental visible-data provider

## Boundary

The provider uses the publicly rendered Coinalyze chart datafeed:

```text
POST https://coinalyze.net/chart/getTheBars/
```

The official Coinalyze API is prohibited for this adapter. The adapter accepts
no cookie or browser session. Its dynamic `REQ_KEY` must be supplied explicitly
at execution time and is never hardcoded, logged, persisted, or included in a
record checksum.

## Explicit Mapping

```text
BTCUSDT
  market: BTCUSDT_PERP.A
  long liquidation: BTCUSDT_PERP_LQS.A
  short liquidation: BTCUSDT_PERP_LQB.A
```

No ticker transformation exists. An unmapped symbol is `UNAVAILABLE` and is
never queried.

## Evidence Contract

The visible datafeed supplies five-minute provider-native liquidation volume.
It does not supply an execution price or independently verifiable notional.
Stored experimental facts therefore use:

```text
providerTier: EXPERIMENTAL
canonical: false
verified: false
confidence: 0.65
price: null
quantity: <provider-visible volume>
notional: null
```

Binance Vision remains `CANONICAL`, `canonical: true`, `verified: true`, and
`confidence: 1.0`. Experimental facts never replace or overwrite canonical
records because provider identity participates in deterministic record IDs and
Repository idempotency.

## Availability

The endpoint was found and returned HTTP 200 for the mapped BTCUSDT page. The
requested `2026-07-01` window contained 288 five-minute bars, 221 non-empty
bars, and 298 mapped long/short rows. B6R wrote 298 experimental records. The
identical rerun returned 298 duplicates and zero writes.

`CAPUSDT` has no explicit mapping, returns `COINALYZE_MAPPING_MISSING`, and
causes no Internal Web request.

## Constraints

This provider is supplemental evidence only. It does not create Signals,
Context Snapshots, Evaluations, Outcomes, Historical Memory, Knowledge, UI
state, or AI reasoning. It stores no raw archive or page payload.
