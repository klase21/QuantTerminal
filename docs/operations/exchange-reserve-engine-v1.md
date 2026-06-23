# Exchange Reserve Engine V1

## Purpose

Exchange Reserve Engine V1 publishes factual Binance reserve-wallet evidence
from CoinMarketCap's public data-api endpoint.

Source:

```text
https://api.coinmarketcap.com/data-api/v3/exchange/reserves/wallets?id=270
```

The engine is Binance-only. It does not calculate deltas, infer missing
balances, or convert reserve evidence into market drivers.

## Source Schema

The response exposes records under:

```text
data.exchangeWallets
```

Mapped fields:

| Canonical field | CMC field |
| --- | --- |
| exchange | fixed `binance` from endpoint id `270` |
| walletAddress | `walletAddress` |
| network | `network` |
| asset | `name` |
| balance | `balance` |
| balanceUsd | `balanceUsd` |
| updateTime | record `updateTime`, then response `data.updateTime` |

CMC timestamps formatted as `YYYY-MM-DD HH:mm:ss` are interpreted as UTC and
normalized to ISO 8601.

## Contracts and Artifacts

Contract:

```text
core/exchange-reserve/
```

Artifact type:

```text
exchange_reserve_snapshot
```

Each durable artifact represents one Binance wallet, network, asset, and
observation time. Required balances must be finite and non-negative.

The source response is not persisted.

## Builder

Run:

```powershell
npm run build:exchange-reserves
```

The builder:

1. fetches the public Binance reserve endpoint without credentials;
2. validates each source record;
3. publishes valid durable artifacts;
4. regenerates standardized deployable snapshots.

Records missing a network or another required source field are rejected. No
placeholder network is introduced.

## Deployable Snapshot

Generated file:

```text
.data/artifacts/exchange-reserve-latest.json
```

Partition:

```text
exchange-reserve/binance/1h/latest
```

The deployable payload contains compact normalized reserve records rather than
full intelligence artifact envelopes. It is indexed by
`.data/artifacts/artifact-index.json` and represented in
`.data/artifacts/coverage-index.json`.

Current payload size is below the 512 KiB hard limit but above the 128 KiB
warning threshold. A future partitioning sprint should split reserves by
network or asset before coverage grows materially.

## Coverage Audit

Run:

```powershell
npm run audit:exchange-reserve-coverage
```

The audit reports:

- durable artifacts read;
- valid and invalid snapshots;
- latest wallet/asset records;
- wallet, network, and asset counts;
- total USD reserve value;
- top assets by USD value;
- rejection categories.

## Freshness and Health

Data Health applies a one-hour freshness policy to the deployable reserve
snapshot. Age is calculated from the real provider update time.

No generation timestamp is substituted for missing observation time.

## Limitations

- Binance only.
- CMC's reserve labels and wallet coverage are accepted as provider evidence,
  not independently verified on-chain in this layer.
- Reserve balances are point-in-time observations; no delta or flow is
  calculated.
- Fourteen source records in the first run lacked `network` and were rejected.
- The deployable payload currently exceeds the warning-size threshold.
