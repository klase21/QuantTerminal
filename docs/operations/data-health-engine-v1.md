# Data Health Engine V1

## Purpose

Data Health Engine V1 answers:

> Can this deployable intelligence artifact be trusted right now?

It is a read-only validation layer. It does not refresh sources, regenerate
artifacts, alter scoring, or change product UI.

## Health Contract

Each indexed artifact produces:

```ts
{
  artifactType
  partitionKey
  path
  status
  reason
  generatedAt
  maxAgeMs
  ageMs
  freshness
  coverage
  recordCount
  payloadSizeBytes
  sourceHash
}
```

Statuses:

- `current`: structurally valid and inside its freshness policy;
- `stale`: structurally valid but outside its freshness policy;
- `missing`: file absent or evidence explicitly unavailable;
- `invalid`: schema, metadata, hash, size, or index mismatch;
- `unsupported`: no freshness policy exists for the artifact type.

## Freshness Policies

| Artifact | Maximum age |
| --- | ---: |
| Funding | 15 minutes |
| Open Interest | 15 minutes |
| Market Drivers | 15 minutes |
| Liquidation | 30 minutes |
| ETF | 24 hours |
| Exchange Flow | 1 hour |
| Treasury | 24 hours |
| Coverage Index | 15 minutes |

Age uses the real `observedAt` timestamp when available. `generatedAt` is used
only when an observation timestamp is absent. Repackaging old evidence does
not make it current.

## Validation Flow

```text
artifact-index.json
  -> validate index
  -> resolve bounded artifact path
  -> verify file exists
  -> parse standardized artifact
  -> compare metadata with index
  -> compare actual and reported bytes
  -> recompute source hash
  -> validate record count and timestamps
  -> apply freshness policy
  -> assign health status
```

The audit never reads raw source directories.

## Product Surface Summary

The engine reads the deployable Coverage Index and summarizes:

- Dashboard;
- Markets;
- Research;
- Replay;
- Historical Intelligence.

For each surface it reports current, stale, and missing evidence counts.
Missing, invalid, and unsupported evidence becomes a blocking issue. Stale
evidence remains visible as stale rather than being silently accepted.

OHLCV currently has coverage metadata but no deployable payload. Its health
therefore comes from the Coverage Index entry.

## Audit Semantics

Run:

```powershell
npm run audit:data-health
```

The audit returns `PASS` when the engine and artifact structure are valid.
Stale or explicitly unavailable evidence does not fail the audit; it is the
health result being measured.

The audit returns `FAIL` for:

- invalid artifact index;
- indexed file missing from disk;
- invalid payload or standardized metadata;
- source hash mismatch;
- payload size mismatch;
- index metadata mismatch;
- unsupported artifact type.

## Operational Use

Run Data Health after:

- generating deployable snapshots;
- deploying a new artifact set;
- changing freshness policy;
- investigating a product `NO DATA` or stale-evidence state.

Recommended sequence:

```powershell
npm run audit:deployable-snapshots
npm run audit:data-health
npm run test:intelligence
npx.cmd tsc --noEmit --pretty false --incremental false
```

## Limitations

- Policies are static constants in V1.
- Health is evaluated at audit time and is not persisted.
- No UI or API exposes the report yet.
- The engine does not decide whether stale evidence is acceptable for a
  specific investment decision.
- No source refresh is triggered.
