# CMC Exchange Flow Adapter V1

## Purpose

CMC Exchange Flow Adapter V1 connects the existing Exchange Flow Snapshot
contracts to an authenticated CMC-compatible exchange asset-flow endpoint.
It preserves the platform's real-data boundary: only complete provider records
with explicit holdings, inflow, and outflow values may become durable
`exchange_flow` artifacts.

## Source Contract

Default endpoint:

```text
https://pro-api.coinmarketcap.com/v1/exchange/assets
```

The endpoint can be replaced by a flow-capable compatible endpoint through:

```text
CMC_EXCHANGE_FLOW_URL
```

Authentication uses:

```text
CMC_API_KEY
```

or:

```text
CMC_PRO_API_KEY
```

The adapter sends the key through `X-CMC_PRO_API_KEY`. Keys are never written
to artifact metadata or reports.

The standard CMC exchange-assets response is holdings-oriented. A response
that omits inflow or outflow is rejected as `incomplete_data`; holdings are
never converted into synthetic flows. A compatible endpoint must provide the
flow fields explicitly.

## Normalization

Adapter:

```text
lib/exchange-flow/cmcExchangeFlowAdapter.ts
```

Canonical output fields:

- `exchange`
- `asset`
- `holdings`
- `inflow`
- `outflow`
- `netFlow`
- `timestamp`
- `source`
- `sourceQuality`

Accepted identity aliases are narrow and explicit. Numeric strings are parsed
only when finite. Gross holdings, inflow, and outflow must be non-negative.
`netFlow` is deterministically calculated as `inflow - outflow`. When the
provider also reports net flow, the reported value must match.

Records are rejected when:

- the record is not an object;
- exchange, asset, holdings, inflow, outflow, or timestamp is absent;
- numeric values are invalid;
- reported net flow is inconsistent.

Unknown quality labels default to `verified` only after the complete
authenticated provider record passes validation. This describes source-record
integrity, not analytical confidence. Published artifacts retain confidence
status `not_calibrated`.

## Manual Ingestion

Example:

```powershell
$env:CMC_API_KEY = "<provider key>"

npx.cmd tsx workers/exchange-flow/buildExchangeFlowSnapshots.ts `
  --cmc `
  --exchange binance `
  --exchange-id 270
```

Optional:

```text
--asset BTC
--endpoint https://provider.example/exchange/assets
--artifact-root C:\path\to\isolated-artifact-root
```

The builder retains its existing `--file` mode.

Build output reports:

- exchanges discovered;
- assets discovered;
- records received;
- records ingested;
- records rejected;
- rejection counts;
- artifacts published.

Only accepted records are sent through the existing durable artifact registry.

## Coverage Audit

Run:

```powershell
npm run audit:exchange-flow-coverage
```

Coverage matrix:

| Exchange | Asset | Quality | Available |
| --- | --- | --- | --- |
| Derived from durable artifacts | Derived from durable artifacts | Provider quality | Yes |

Failure categories:

- `unavailable_source`
- `malformed_record`
- `incomplete_data`
- `validation_failure`

The audit remains read-only. Adapter rejection details are emitted by the
manual builder and are not fabricated from the artifact inventory.

## Current Environment

At implementation time, this workspace did not contain `CMC_API_KEY`,
`CMC_PRO_API_KEY`, or `CMC_EXCHANGE_FLOW_URL`. Therefore no authenticated
provider request was executed and no claim of real local coverage is made.
Once credentials and a flow-capable endpoint are configured, the manual
builder publishes accepted records and the coverage audit reports them.

## Limitations

- The official reserves endpoint may provide holdings without interval flows.
  Such rows are intentionally rejected.
- Holdings and flow units remain provider-defined and are preserved in
  metadata when supplied.
- Cross-asset aggregation is meaningful only when the provider supplies a
  common valuation basis.
- The adapter is manual and does not add scheduling, retries, or background
  ingestion.
