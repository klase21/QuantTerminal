# Durable Intelligence Artifact Store

## Purpose

The Durable Intelligence Artifact Store persists prepared intelligence artifacts across process restarts using the existing local file-cache strategy.

It implements the established `IntelligenceArtifactRegistry` interface. Producers and readers therefore do not depend on whether artifacts are stored in memory or on disk.

This store does not introduce a database, scheduler, background process, semantic search, or new artifact schema.

## File Layout

The default root is:

```text
.data/intelligence/
```

The runtime layout is:

```text
.data/intelligence/
  artifacts/
    <encoded-artifact-type>/
      <encoded-artifact-id>.json
  registry/
    artifact-index.json
```

Artifact type and id path segments are URL encoded. The index stores the relative payload path, so the root can move without rewriting artifact records.

The repository already ignores `.data/`. Runtime artifact payloads and the registry index are not committed.

## Store Contracts

The durable store contract is independently versioned with:

```text
DURABLE_ARTIFACT_STORE_VERSION = 1
```

Each index entry contains:

- store version;
- artifact id;
- artifact type;
- artifact schema version;
- generation time;
- expiration time;
- source metadata;
- relative payload path;
- lifecycle status;
- subject symbols used for indexed discovery.

The index envelope contains:

- store version;
- last update time;
- deterministic artifact entries.

Artifact payloads remain canonical `IntelligenceArtifact` objects. The store does not wrap or alter their schema.

## Writer Flow

Publication follows:

```text
Validate canonical artifact
  -> encode artifact path
  -> atomically write artifact payload
  -> update deterministic index entry
  -> atomically replace registry index
```

Payload validation uses the existing artifact validator.

The payload is written before the index. If index publication fails, the new payload may exist as an unreferenced file, but readers will not discover it. This preserves the index as the publication boundary.

Replacing an artifact uses the same stable payload path and reports `replaced: true`.

Only prepared intelligence artifacts are written. Raw market data, Replay events, OHLCV collections, and builder inputs are outside this store.

## Atomicity

Payloads and the index are each written through a temporary file followed by rename.

Mutations through one registry instance are serialized. The current implementation does not provide a cross-process file lock. Manual production should use one writer process per store root.

## Reader Flow

The file-backed adapter supports:

- get by artifact id;
- list all artifacts;
- list by artifact type;
- list by symbol;
- list by source system;
- the existing registry search contract.

Registry search supports the same public filters as the in-memory registry:

- ids;
- types;
- source systems;
- symbols;
- exchanges;
- tags;
- generation range;
- minimum confidence;
- text;
- expiration and archive inclusion;
- pagination.

Index fields narrow candidates before payload reads. Filters requiring full artifact content are applied after payload validation.

Missing or invalid payloads are not returned. A missing index behaves as an empty store.

Read-only registry operations degrade a corrupted index to an empty result so consumers remain available. Mutation operations remain strict and refuse to overwrite a corrupted index. The Operations Console validates index metadata independently and reports corruption as unavailable.

## Expiration and Archive Behavior

Expiration is evaluated at read time from `expiresAt`.

The index records lifecycle status, but an artifact can become expired after the index was written. Readers therefore calculate the effective status on every list or search operation.

Expired artifacts are excluded by default and can be included explicitly.

Archived artifacts remain on disk and are excluded by default. Archiving changes only the index lifecycle state; it does not delete evidence.

## Registry Adapter

`FileBackedIntelligenceArtifactRegistry` implements:

```text
IntelligenceArtifactRegistry
```

The existing `InMemoryIntelligenceArtifactRegistry` remains unchanged and remains appropriate for:

- unit tests;
- isolated builders;
- temporary process-local workflows;
- fast non-durable validation.

Consumers can use the existing `IntelligenceArtifactReader` with either adapter.

## Production Orchestrator Integration

The Intelligence Production Orchestrator accepts an optional registry dependency.

Default behavior remains process-local:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts
```

Durable publication is enabled manually:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts --durable
```

An alternate runtime root can be supplied:

```powershell
npx.cmd tsx workers/intelligence-orchestrator/buildIntelligenceSuite.ts `
  --durable `
  --artifact-root C:\QuantTerminal\.data\intelligence
```

Historical Analog, Event Impact, and Market Memory generation are unchanged. Only the final artifact publication target changes.

## Failure Behavior

- Invalid artifacts are rejected before writing.
- Missing artifacts return `null` through the registry interface.
- Corrupted payloads are excluded from list and search results.
- An invalid registry index fails explicitly.
- One orchestrator artifact publication failure does not roll back artifacts already published.
- No missing or corrupted artifact triggers intelligence regeneration.

The store never fabricates replacement data.

## Limitations

The first implementation is optimized for manual production and modest artifact counts.

Known limitations:

- no cross-process writer lock;
- no transactional group publication;
- no automatic orphan cleanup;
- no secondary indexes beyond the JSON registry;
- list and complex search operations may read multiple artifact payload files;
- no retention or compaction policy;
- no automatic migration between store versions.

These limitations are acceptable while artifact coverage and consumer workflows remain small.

## Future SQLite Migration Criteria

SQLite becomes justified only when measured usage demonstrates one or more of:

- artifact index rewrite cost becomes material;
- artifact counts make payload scanning too slow;
- concurrent writers are required;
- transactional multi-artifact publication is required;
- consumers need richer indexed queries;
- retention, supersession, and lineage queries become operationally important.

A future SQLite adapter should implement the existing registry interface. Producers, the orchestrator, and consumers should not require redesign.
