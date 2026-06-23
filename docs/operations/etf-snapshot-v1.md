# ETF Snapshot Intelligence V1

## Purpose

ETF Snapshot Intelligence V1 creates durable, factual ETF capital-flow
evidence for future Market Drivers, Capital Flow Dashboard, Institutional
Layer, investor summaries, and alerting systems.

It does not generate recommendations, modify Decision Brief or Market Memory,
or substitute missing holdings and flow values.

## Contract

Location:

```text
core/etf-intelligence/
```

Schema version:

```text
1
```

Required fields:

- asset;
- observation timestamp.

Optional evidence:

- net inflow USD;
- inflow USD;
- outflow USD;
- holdings;
- holdings value USD.

Missing optional evidence is represented as `null`, never zero. Quality states
are `verified`, `degraded`, `unavailable`, and `unknown`.

Validation rejects malformed records, missing asset or timestamp, non-finite
numbers, negative gross flows, negative holdings, and negative holdings
valuation. Net inflow may be negative. When all three flow fields are present,
net inflow must equal inflow minus outflow.

## Durable Artifact

Artifact type:

```text
etf_snapshot
```

Artifact id:

```text
etf-snapshot:<asset>:<timestamp>
```

The existing file-backed intelligence artifact registry stores one normalized
snapshot per artifact. Raw provider responses are not persisted. Artifact
confidence remains `0` and `not_calibrated`; provider quality is evidence
validity metadata, not predictive confidence.

## Sources

### Existing Farside reader

The existing `lib/data-sources/etfFlowClient.ts` reader provides verified BTC
and ETH daily net flow in USD millions. The manual builder converts that
reported unit to USD and leaves gross inflow, gross outflow, holdings, and
valuation as `null`.

```powershell
npx.cmd tsx workers/etf/buildEtfSnapshots.ts --farside
```

### CMC-compatible adapter

Adapter:

```text
lib/etf/cmcEtfAdapter.ts
```

The adapter requires a configured compatible endpoint:

```text
CMC_ETF_URL
```

and either:

```text
CMC_API_KEY
CMC_PRO_API_KEY
```

Usage:

```powershell
npx.cmd tsx workers/etf/buildEtfSnapshots.ts `
  --cmc `
  --endpoint https://provider.example/etf `
  --asset BTC
```

The API key is sent through `X-CMC_PRO_API_KEY` and is never persisted.

Versioned source files remain supported through `--file`.

## Coverage Audit

Run:

```powershell
npm run audit:etf-coverage
```

Coverage matrix:

| Asset | Available | Quality |
| --- | --- | --- |
| Durable artifact asset | Yes | Provider quality |

Aggregate summary:

- assets discovered;
- records ingested;
- records rejected;
- total net inflow when available;
- total holdings value when available.

Additional outputs:

- Top ETF Inflows;
- Top ETF Outflows;
- Largest ETF Holdings;
- Asset Flow Summary.

Failure categories:

- `unavailable_source`;
- `malformed_record`;
- `incomplete_data`;
- `validation_failure`;
- `unknown`.

## Initial Coverage

The initial manual Farside build on June 23, 2026 KST published:

| Asset | Available | Quality |
| --- | --- | --- |
| BTC | Yes | verified |
| ETH | Yes | verified |

Observed source rows:

- BTC net inflow: `$39,200,000`;
- ETH net inflow: `$300,000`;
- aggregate net inflow: `$39,500,000`;
- records ingested: `2`;
- records rejected: `0`.

Gross inflow, gross outflow, holdings, and holdings value remain unavailable
because the source did not provide them.

## Limitations

- Farside supplies aggregate daily net flow, not gross inflow/outflow or ETF
  holdings.
- A configured CMC-compatible source must provide its own observation
  timestamp and explicit optional metrics.
- Cross-asset holdings totals are reported only when USD valuations exist.
- Adapter rejection counts are emitted during ingestion; the durable inventory
  audit can only classify invalid persisted artifacts.
- V1 is manual and adds no scheduler or alert behavior.
