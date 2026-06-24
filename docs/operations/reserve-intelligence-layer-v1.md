# Reserve Intelligence Layer V1

## Purpose

Reserve Intelligence converts raw Binance reserve deltas into standardized,
evidence-backed observations. It does not infer market direction, make
predictions, or attach bullish/bearish labels.

## Inputs

The engine consumes existing prepared intelligence only:

- `exchange_reserve_snapshot` artifacts
- `exchange_reserve_delta` artifacts

No provider data is downloaded by the Reserve Intelligence builder.

## Output

The builder publishes one `reserve_intelligence` artifact per asset. Each
observation contains:

- exchange
- asset
- asset classification
- observation type
- current balance and USD value
- previous observation timestamp when available
- quantity change
- absolute change
- percentage change
- USD value change
- 1d / 7d / 30d trend fields when real historical observations exist

The deployable snapshot is:

```text
.data/artifacts/reserve-intelligence-latest.json
```

## Classifications

Supported asset classifications:

- `hard_asset`
- `stablecoin`
- `exchange_asset`
- `smart_contract_asset`
- `other`

Classification is deterministic and based only on static asset symbol lists.

## Observation Types

Supported observations:

- `reserve_increase`
- `reserve_decrease`
- `reserve_no_change`
- `stablecoin_accumulation`
- `stablecoin_decline`
- `stablecoin_no_change`
- `delta_unavailable`

These are descriptive observations only. They do not imply future price
direction.

## Trends

The engine exposes 1d, 7d, and 30d trend slots. A trend is marked unavailable
unless a real reserve snapshot exists at or before the requested horizon.

No timestamp is fabricated and no value is interpolated.

## Health and Coverage

Reserve Intelligence is integrated into:

- durable artifact registry
- deployable artifact index
- coverage index under Historical Intelligence
- Data Health Engine

The layer is current when observations are generated from current reserve delta
evidence and remains partial when some assets have unavailable deltas.

## Limitations

- No market-direction inference.
- No bullish/bearish labels.
- 1d / 7d / 30d trends require retained historical reserve snapshots.
- Current V1 quality depends on available reserve delta coverage.
