# Exchange Reserve Delta Engine V1

## Purpose

Exchange Reserve Delta Engine V1 compares prepared Binance reserve snapshots
and publishes factual reserve-change intelligence.

It does not fetch provider data, infer missing balances, or treat a missing
previous snapshot as zero.

## Calculation Model

Reserve wallet snapshots are aggregated by:

```text
exchange + asset + observation time
```

For each asset, the engine selects the two most recent distinct observation
times:

```text
current aggregate
previous aggregate
```

When both exist:

```text
balanceDelta = currentBalance - previousBalance
balanceDeltaPct = balanceDelta / previousBalance * 100
balanceUsdDelta = currentBalanceUsd - previousBalanceUsd
```

If the previous balance is zero, percentage change is undefined and the delta
remains unavailable in V1.

## Unavailable State

When no previous observed snapshot exists:

- status is `unavailable`;
- previous values remain `null`;
- all delta values remain `null`;
- reason is `Previous reserve snapshot unavailable.`

No zero delta is fabricated.

## Durable Artifact

Artifact type:

```text
exchange_reserve_delta
```

One artifact is published per Binance asset and current observation time.
Artifacts preserve current and previous source observations, calculation
status, and unavailable reason.

## Builder

Run:

```powershell
npm run build:exchange-reserve-deltas
```

The builder reads only durable `exchange_reserve_snapshot` artifacts. It does
not download or refresh reserve data.

## Rankings

Available deltas are ranked independently by:

- largest USD increase;
- largest USD decrease;
- largest quantity increase;
- largest quantity decrease.

Unavailable deltas are excluded from rankings rather than assigned zero.

## Deployable Snapshot

Generated file:

```text
.data/artifacts/exchange-reserve-delta-latest.json
```

Partition:

```text
exchange-reserve-delta/binance/1h/latest
```

The artifact is indexed in `artifact-index.json` and represented in the
Historical Intelligence section of `coverage-index.json`. It is not added as
a blocking dependency for Dashboard or Research.

If all deltas are unavailable, deployable coverage is `unavailable` even
though current reserve aggregates are present. Data Health therefore reports
the delta artifact as missing evidence with an explicit reason, not current.

## Audit

Run:

```powershell
npm run audit:exchange-reserve-deltas
```

The audit reports:

- assets evaluated;
- available and unavailable delta counts;
- coverage percentage;
- increase/decrease rankings;
- unavailable reason counts.

## Current Limitation

The current durable reserve inventory contains one distinct provider
observation time. V1 can evaluate 340 current asset aggregates, but cannot
calculate a valid delta until a later provider snapshot is published.
