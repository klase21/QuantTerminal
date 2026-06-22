# Exchange Flow Snapshot V1

## Purpose

Exchange Flow Snapshot V1 defines reusable, durable evidence for:

- exchange holdings;
- asset inflows;
- asset outflows;
- net flow;
- source quality and observation time.

The layer is intended for future:

- ETF Intelligence;
- Treasury Intelligence;
- Market Driver Engine;
- Capital Flow Dashboard.

V1 creates the contract, strict ingestion boundary, durable artifact publisher,
and coverage audit. It does not infer flows from price, volume, open interest,
ETF data, or sector-rotation scores.

## Real-Data Boundary

No authoritative exchange-flow source is currently configured in this
workspace.

The repository contains:

- ETF flow data, which is not exchange-wallet flow;
- market and derivatives data, which does not expose exchange holdings;
- sector inflow/outflow scores, which are derived product signals;
- CryptoHFTData microstructure data, which does not represent deposits and
  withdrawals.

These sources are not substituted.

Consequently, V1 publishes no fabricated zero-flow artifact. Durable
`exchange_flow` artifacts are generated only when a versioned real source file
is explicitly supplied to the manual builder.

## Contract

Location:

```text
core/exchange-flow/
```

Schema version:

```text
1
```

Each snapshot contains:

- exchange;
- asset;
- holdings;
- inflow;
- outflow;
- net flow;
- timestamp;
- source;
- source quality;
- generation time;
- optional source metadata.

Source quality states:

- `verified`;
- `degraded`;
- `unavailable`;
- `unknown`.

Validation rules:

- holdings, inflow, and outflow are finite and non-negative;
- net flow is finite;
- net flow equals inflow minus outflow;
- timestamp and generated time are valid;
- source and identity fields are explicit.

## Durable Artifact

Artifact type:

```text
exchange_flow
```

Artifact id:

```text
exchange-flow:<exchange>:<asset>:<timestamp>
```

The existing file-backed durable artifact store is used.

Artifacts expose:

- confidence `0`;
- confidence status `not_calibrated`;
- evidence validity based on source quality;
- source provenance;
- exchange and asset subjects;
- one compact source snapshot.

No Decision Brief, Market Memory, or recommendation is generated.

## Manual Builder

Worker:

```text
workers/exchange-flow/buildExchangeFlowSnapshots.ts
```

Usage:

```powershell
npx.cmd tsx workers/exchange-flow/buildExchangeFlowSnapshots.ts `
  --file C:\path\to\verified-exchange-flow.json
```

Input shape:

```json
{
  "schemaVersion": 1,
  "source": "provider-id",
  "snapshots": [
    {
      "exchange": "exchange-id",
      "asset": "BTC",
      "holdings": 0,
      "inflow": 0,
      "outflow": 0,
      "netFlow": 0,
      "timestamp": "2026-06-22T00:00:00.000Z",
      "sourceQuality": "verified",
      "metadata": {
        "reference": "provider record identifier"
      }
    }
  ]
}
```

The numeric zeroes above describe the schema only. They are not seed data and
are not published by this sprint.

The builder:

1. Reads a caller-supplied local file.
2. Validates every snapshot.
3. Rejects inconsistent net flow.
4. Creates canonical artifacts.
5. Publishes atomically through the durable artifact store.

It performs no download, estimation, or symbol substitution.

## Coverage Audit

Run:

```powershell
npm run audit:exchange-flow-coverage
```

The audit reads durable `exchange_flow` artifacts and selects the latest
snapshot per exchange/asset pair.

It reports:

- coverage matrix;
- per-exchange holdings and flow;
- exchanges and assets covered;
- total holdings;
- total inflow;
- total outflow;
- total net flow;
- top net inflow exchanges;
- top net outflow exchanges;
- top holdings concentration exchanges.

Failure categories:

- `unavailable_source`;
- `unsupported_asset`;
- `incomplete_data`;
- `unknown`.

## Current Coverage

Coverage matrix:

| Exchange | Asset | Available | Quality |
| --- | --- | --- | --- |
| No configured source | No configured asset | No | unavailable |

Aggregate:

- exchanges covered: `0`;
- assets covered: `0`;
- coverage: `0%`;
- total inflow: unavailable;
- total outflow: unavailable;
- total net flow: unavailable.

The audit serializes numeric aggregates as zero when no snapshots exist, but
the summary and `unavailable_source` category explicitly state that these are
empty-set aggregates, not observed zero flows.

## Failure Categories

Current:

| Category | Count |
| --- | ---: |
| unavailable_source | 1 |
| unsupported_asset | 0 |
| incomplete_data | 0 |
| unknown | 0 |

## Source Adapter Strategy

Future adapters may target providers such as CMC-compatible exchange asset
snapshots, verified exchange transparency feeds, or institutional on-chain
flow vendors.

An adapter must establish:

- stable exchange identity;
- stable asset identity;
- holdings unit and valuation basis;
- inflow/outflow measurement interval;
- observation timestamp;
- provenance;
- whether net flow is reported or deterministically derived.

Adapters must emit the V1 source-file contract. They must not write artifacts
directly.

## Limitations

- No real exchange-flow provider is configured.
- No durable `exchange_flow` artifact was generated in this sprint.
- Holdings units remain provider-defined and must be documented in metadata.
- Cross-asset totals are meaningful only when units share a valuation basis.
- The audit cannot rank exchanges until real snapshots exist.

## Recommended Next Sprint

Implement one authenticated CMC-compatible or institutional exchange-flow
adapter and ingest at least two timestamped snapshots for the same
exchange/asset pair.

Success should require:

1. documented holdings units;
2. independently attributable source timestamps;
3. a defensible flow interval;
4. at least one durable artifact;
5. non-empty audit rankings.
