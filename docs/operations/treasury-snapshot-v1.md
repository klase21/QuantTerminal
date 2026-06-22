# Treasury Snapshot V1

## Purpose

Treasury Snapshot V1 introduces durable, factual holdings evidence for future
ETF Intelligence, Market Drivers, Capital Flow Intelligence, investor-facing
dashboards, and an institutional evidence layer.

It does not infer transactions, fabricate changes, generate recommendations,
or alter Market Memory and Decision Brief behavior.

## Contract

Location:

```text
core/treasury-intelligence/
```

Schema version:

```text
1
```

Each snapshot contains:

- holder;
- holder type;
- asset;
- holdings;
- optional holdings value in USD;
- optional change amount;
- optional change percent;
- observation timestamp;
- source;
- source quality;
- generation timestamp.

Optional numeric evidence is represented as `null` when the source does not
provide it. It is never calculated from unrelated market prices.

Quality states:

- `verified`;
- `degraded`;
- `unavailable`;
- `unknown`.

Missing holder type is represented as `unknown` and prevents a record from
being classified as verified.

## Durable Artifact

Artifact type:

```text
treasury_snapshot
```

Artifact id:

```text
treasury-snapshot:<holder>:<asset>:<timestamp>
```

Artifacts use the existing file-backed intelligence artifact registry.
They contain one normalized Treasury snapshot and compact evidence metadata,
never raw provider payloads.

Confidence is `0` with status `not_calibrated`; source quality is evidence
validity metadata, not analytical confidence.

## CMC-Compatible Adapter

Adapter:

```text
lib/treasury/cmcTreasuryAdapter.ts
```

No supported official CMC treasury endpoint was discoverable during this
sprint. The adapter therefore requires an explicitly configured compatible
endpoint:

```text
CMC_TREASURY_URL
```

Authentication:

```text
CMC_API_KEY
```

or:

```text
CMC_PRO_API_KEY
```

The key is sent through `X-CMC_PRO_API_KEY` and is never persisted.

Strict required provider fields:

- holder;
- asset;
- holdings;
- timestamp.

Rejected records:

- non-object records;
- missing required evidence;
- missing or invalid timestamps;
- non-finite holdings, valuations, or change values;
- negative holdings or holdings valuation.

## Manual Builder

CMC-compatible source:

```powershell
npx.cmd tsx workers/treasury/buildTreasurySnapshots.ts `
  --cmc `
  --endpoint https://provider.example/treasury `
  --asset BTC
```

Versioned local source:

```powershell
npx.cmd tsx workers/treasury/buildTreasurySnapshots.ts `
  --file C:\path\to\verified-treasury-source.json
```

Only complete snapshots are published. A source with no accepted records fails
without writing artifacts.

## Coverage Audit

Run:

```powershell
npm run audit:treasury-coverage
```

Coverage matrix:

| Holder | Asset | Holdings | Quality | Available |
| --- | --- | ---: | --- | --- |
| Durable artifacts only | Durable artifacts only | Reported holdings | Source quality | Yes |

Aggregate summary:

- holders discovered;
- assets discovered;
- total holdings;
- total holdings value when valuations exist;
- records ingested;
- records rejected.

Additional output:

- Top Treasury Holders;
- Top Accumulating Holders;
- Top Reducing Holders;
- Asset Concentration Summary.

Failure categories:

- `unavailable_source`;
- `malformed_record`;
- `incomplete_data`;
- `validation_failure`.

## Current Coverage

This workspace contains no configured `CMC_TREASURY_URL` or CMC credential.
No Treasury record was downloaded and no synthetic artifact was created.
Until a real source is configured, the audit returns `PASS` with an explicit
`unavailable_source` degraded state.

## Limitations

- Optional USD valuation and change fields depend entirely on provider
  coverage.
- Total holdings cannot be compared across unlike assets without a common
  valuation field.
- Adapter rejection counts are emitted by the builder; the read-only durable
  inventory audit can only identify invalid persisted artifacts.
- There is no scheduler or automatic refresh in V1.
