# Capital Flow Schema Adaptation V2

## Purpose

Capital Flow V2 aligns the canonical Treasury and Exchange Flow contracts with
the real public CoinMarketCap data-api responses. It preserves incomplete but
useful evidence without inventing timestamps, assets, inflows, or outflows.

## Treasury V2

Schema version `2` supports two useful quality tiers:

| Tier | Required evidence | Timestamp | Freshness |
| --- | --- | --- | --- |
| `verified` | holder, asset, holdings, timestamp | ISO timestamp | Evaluated from observation time |
| `partial` | holder, asset, holdings | `null` | Unknown at artifact level; never current solely from generation time |

The direct Treasury response exposed 180 structurally usable records:

- verified: 26;
- partial: 154;
- rejected: 0.

Partial records retain `timestamp: null`. The response request time is not used
as an observation time. Optional valuation and change fields remain `null`
when absent.

The durable catalog contains 177 latest holder/asset identities because three
provider rows resolve to existing holder/asset identities. Publication uses
stable identity-based artifact IDs rather than fabricating timestamps to make
duplicates appear distinct.

## Exchange Flow V2

Schema version `2` uses an explicit scope discriminator.

### Exchange Level

`exchange_level` records contain:

- exchange;
- total assets in USD;
- 24-hour net flow in USD;
- provider observation timestamp;
- source and quality.

They do not require an asset, gross inflow, or gross outflow.

### Asset Level

`asset_level` preserves the stricter V1 evidence boundary:

- exchange;
- asset;
- holdings;
- inflow;
- outflow;
- net flow;
- timestamp.

For asset-level evidence, net flow must equal inflow minus outflow.

The direct Exchange Flow response produced:

- exchange-level: 62;
- asset-level: 0;
- rejected: 0.

`netFlow24hUsd` is stored exactly as reported. It is not decomposed into
synthetic inflow and outflow values.

## Artifact and Health Behavior

Both scopes publish through the existing durable artifact registry.

Deployable outputs:

```text
.data/artifacts/exchange-flow-latest.json
.data/artifacts/treasury-latest.json
.data/artifacts/artifact-index.json
.data/artifacts/coverage-index.json
```

Health after regeneration:

| Artifact | Before | After |
| --- | --- | --- |
| Exchange Flow | missing | current |
| Treasury | stale with 26 records | stale with verified and partial records |

Exchange Flow is current because the endpoint supplies a current response
timestamp. Treasury remains stale because the newest real `dataAsOf` exceeds
the 24-hour policy. Null timestamps do not become current.

## Compatibility

- Existing asset-level flow validation remains strict.
- Market Driver scoring continues to consume asset-level exchange flow only.
- Exchange-level evidence is available to storage, coverage, and future
  consumers without changing scoring behavior.
- No UI, Replay, or data-source behavior changed.

## Validation

Run:

```powershell
npm run test:cmc-data-api-direct
npm run audit:exchange-flow-coverage
npm run audit:treasury-coverage
npm run audit:deployable-snapshots
npm run audit:data-health
npm run test:intelligence
npx.cmd tsc --noEmit --pretty false --incremental false
```

Raw provider responses are not persisted.
