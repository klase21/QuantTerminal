# Artifact Standardization V1 Operations

## Commands

Generate standardized deployable artifacts:

```powershell
npm run build:deployable-snapshots
```

Audit contracts, sizes, hashes, storage classes, and index parity:

```powershell
npm run audit:deployable-snapshots
```

## Generated Files

Payload artifacts:

- `latest-market-drivers.json`;
- `etf-latest.json`;
- `funding-latest.json`;
- `open-interest-latest.json`;
- `liquidation-latest.json`;
- `exchange-flow-latest.json`;
- `treasury-latest.json`;
- `coverage-index.json`.

Discovery index:

- `artifact-index.json`.

## Build Sequence

1. Read prepared caches and durable artifacts.
2. Normalize compact latest payloads.
3. Assign scope, timeframe, and partition key.
4. Calculate source hash and record count.
5. Calculate the final serialized payload size.
6. Write payload artifacts atomically.
7. Build `artifact-index.json` from finalized metadata.

The index is written last so it cannot advertise an artifact that has not been
written successfully.

## Audit Checks

The read-only audit verifies:

- every expected file exists;
- every payload follows schema version 2;
- standard metadata is complete;
- partition keys are present and portable;
- source hashes match normalized payloads;
- reported sizes equal actual file sizes;
- record counts are non-negative;
- storage class is `deployable_snapshot`;
- no file exceeds 512 KiB;
- warning threshold violations above 128 KiB are reported;
- the artifact index matches every payload file;
- no orphan index entries exist;
- no raw dataset extensions exist.

## Failure Handling

- Hash mismatch: audit failure.
- Size mismatch: audit failure.
- Missing partition key: audit failure.
- Raw or temporary storage class: audit failure.
- Missing payload/index entry: audit failure.
- Artifact above warning threshold: warning.
- Artifact above hard threshold: audit failure.

## Commit Safety

Only `.data/artifacts/*.json` is allowed through `.gitignore`. Runtime caches,
durable history, provider downloads, databases, and temporary files remain
ignored.

Before committing, confirm:

```powershell
git status --short --untracked-files=all
npm run audit:deployable-snapshots
```

The status output must not include raw cache paths or source-native files.
