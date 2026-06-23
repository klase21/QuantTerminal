# CMC Data API Direct Test V1

## Purpose

This test verifies the exact public CoinMarketCap data-api URLs supplied for
Exchange Flow and Treasury. It uses no API key and does not depend on the
official CMC Pro API contract.

Run:

```powershell
npm run test:cmc-data-api-direct
```

The worker:

1. fetches both exact URLs without authentication;
2. records HTTP status and top-level keys;
3. normalizes only explicitly mapped fields;
4. reports accepted and rejected records;
5. publishes only validated artifacts;
6. refreshes deployable snapshots when publication succeeds.

Raw responses are not persisted.

## Exchange Flow Result

URL:

```text
https://api.coinmarketcap.com/data-api/v3/exchange-asset/flow/list?convertId=2781&start=1&limit=100&sortBy=exchangeRank&sortType=asc
```

Result:

- HTTP status: `200`;
- top-level keys: `data`, `status`;
- record path: `data.flowList`;
- records discovered: `62`;
- records accepted: `0`;
- records rejected: `62`;
- artifacts published: `0`.

Observed fields:

```text
id
name
slug
exchangeRank
totalAsset
openInterestUsd
netFlow24hUsd
netFlow7dUsd
netFlow30dUsd
```

Verified mapping:

| Required field | Provider field | Result |
| --- | --- | --- |
| exchange | `name` or `slug` | Available |
| asset | none | Missing |
| holdings | `totalAsset` | Available in USD |
| inflow | none | Missing |
| outflow | none | Missing |
| netFlow | `netFlow24hUsd` | Available |
| timestamp | `status.timestamp` | Available |

Every record was rejected with:

```text
Missing required field(s): asset, inflow, outflow.
```

`netFlow24hUsd` cannot be decomposed into gross inflow and outflow. No zero or
estimated values were introduced.

## Treasury Result

URL:

```text
https://api.coinmarketcap.com/data-api/v3/coin-treasury/table?id=1&start=1&limit=1000&sort=holdings&sortType=desc
```

Result:

- HTTP status: `200`;
- top-level keys: `data`, `status`;
- record path: `data.data`;
- records discovered: `180`;
- records accepted: `26`;
- records rejected: `154`;
- durable `treasury_snapshot` artifacts published: `26`.

Verified mapping:

| Treasury field | Provider field |
| --- | --- |
| holder | `companyName` |
| holderType | `companyType` |
| asset | `coin` |
| holdings | `holdings` |
| timestamp | `dataAsOf` |
| holdingsValueUsd | unavailable, stored as `null` |
| changeAmount | unavailable, stored as `null` |
| changePercent | unavailable, stored as `null` |

The response-level request timestamp is not used as a substitute for missing
`dataAsOf`. Records without an observation date were rejected:

```text
Missing required field(s): timestamp.
```

Accepted sample:

```text
holder: Strategy
holderType: non-mining
asset: BTC
holdings: 846842
timestamp: 2026-06-15T00:00:00.000Z
```

## Coverage and Health

Before:

| Evidence | Coverage | Health |
| --- | --- | --- |
| Exchange Flow | Missing | Missing |
| Treasury | Missing | Missing |

After:

| Evidence | Coverage | Health |
| --- | --- | --- |
| Exchange Flow | Missing | Missing |
| Treasury | 26 durable artifacts, 100% persisted-record validity | Stale |

Treasury is stale because the newest accepted `dataAsOf` is June 15, 2026,
which exceeds the 24-hour Data Health policy on June 23, 2026. This is a real
freshness result, not an ingestion failure.

## Remaining Blocker

The provided Exchange Flow endpoint offers exchange-level net flow and total
assets, not asset-scoped gross inflow/outflow records. The current canonical
Exchange Flow contract cannot be populated without:

- an asset identity;
- explicit inflow;
- explicit outflow.

A different public endpoint or compatible provider schema is required.

## Safety

- No API key was used.
- No raw response was committed.
- No synthetic flow or valuation was generated.
- Deployable snapshot audit remained within artifact size limits.
