# Treasury Real Source Integration V1

## Source

Treasury uses the existing authenticated CMC-compatible adapter:

```text
lib/treasury/cmcTreasuryAdapter.ts
```

There is no assumed official default Treasury endpoint. A verified compatible
endpoint is required:

```text
CMC_TREASURY_URL
```

Authentication:

```text
CMC_API_KEY or CMC_PRO_API_KEY
```

Optional asset filter:

```text
CMC_TREASURY_ASSET
```

The manual workers now load `.env.local` when present.

## Schema

Required:

- holder;
- asset;
- holdings;
- timestamp.

Optional values remain `null` when absent:

- holdings value in USD;
- change amount;
- change percent.

Holder type defaults to `unknown`, which degrades source quality rather than
fabricating a classification.

## Rejection Rules

- non-object record: `malformed_record`;
- missing holder, asset, holdings, or timestamp: `incomplete_data`;
- negative holdings/valuation or non-finite numeric values:
  `validation_failure`;
- authentication, endpoint, timeout, or empty response:
  `unavailable_source`.

## Publication

Validated records are published through the existing durable artifact registry
as `treasury_snapshot`.

Run:

```powershell
npm run build:capital-flow-evidence
```

When real records are published, the existing deployable snapshot builder
refreshes `treasury-latest.json`, the artifact index, and Data Health inputs.

## Current Environment

At the June 23, 2026 validation, neither a CMC credential nor
`CMC_TREASURY_URL` was configured. Treasury ingestion therefore remained
`unavailable_source`; no synthetic holder or holdings value was created.

## Limitations

- Coverage depends on the configured compatible provider.
- Optional valuation and change metrics cannot be derived from unrelated price
  data.
- Ingestion remains manual.
