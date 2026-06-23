# Exchange Flow Real Source Integration V1

## Source

Exchange Flow uses the existing authenticated CMC-compatible adapter:

```text
lib/exchange-flow/cmcExchangeFlowAdapter.ts
```

Default endpoint:

```text
https://pro-api.coinmarketcap.com/v1/exchange/assets
```

The official endpoint is holdings-oriented and may omit interval inflow and
outflow. Such rows are rejected. A flow-capable compatible endpoint can be
configured with `CMC_EXCHANGE_FLOW_URL`.

## Authentication and Target

Required:

```text
CMC_API_KEY or CMC_PRO_API_KEY
CMC_EXCHANGE_NAME
CMC_EXCHANGE_ID
```

Optional:

```text
CMC_EXCHANGE_FLOW_URL
CMC_EXCHANGE_ASSET
```

The manual workers now load `.env.local` when present. CI and shell environment
variables remain supported.

## Schema

Accepted records require:

- exchange;
- asset;
- timestamp;
- holdings;
- inflow;
- outflow.

`netFlow` is always normalized as:

```text
inflow - outflow
```

If the provider reports net flow, it must match the normalized value within
numeric tolerance.

## Rejection Rules

- non-object record: `malformed_record`;
- missing required field: `incomplete_data`;
- negative/non-finite gross values: `validation_failure`;
- inconsistent provider net flow: `validation_failure`;
- authentication, endpoint, timeout, or empty response:
  `unavailable_source`.

No missing flow is replaced with zero.

## Publication

Validated records are published through the existing durable artifact registry
as `exchange_flow`.

Run:

```powershell
npm run build:capital-flow-evidence
```

When at least one real artifact is published, the worker invokes the existing
deployable snapshot builder so `exchange-flow-latest.json`,
`artifact-index.json`, and Data Health inputs are refreshed.

## Current Environment

At the June 23, 2026 validation, no CMC credential, exchange name/id, or
flow-capable endpoint was configured. Real ingestion therefore remained
`unavailable_source`; no artifact was fabricated.

## Limitations

- The default official CMC endpoint may not satisfy flow-field requirements.
- Units remain provider-defined unless the compatible endpoint supplies a
  common valuation basis.
- Ingestion is manual and has no scheduler or retry loop.
