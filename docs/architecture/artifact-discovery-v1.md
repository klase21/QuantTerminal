# Artifact Discovery V1

## Purpose

Artifact Discovery V1 provides a deterministic classification layer over the existing Intelligence Artifact Registry.

```text
Prepared intelligence artifact
  -> registry summary
  -> deterministic discovery classification
  -> discovery record
  -> future knowledge accumulation consumer
```

The layer identifies discoverable artifacts. It does not create Market Memory, generate knowledge, infer semantics, score evidence, recommend actions, or modify producer systems.

## Contract

The versioned contract lives in:

```text
core/artifact-discovery/
```

Every discovery record contains:

- `schemaVersion`
- `discoveryId`
- `artifactId`
- `artifactType`
- `symbols`
- `tags`
- `category`
- `discoveredAt`

The stable discovery id is:

```text
discovery:<artifact-id>
```

Symbols are normalized to uppercase. Tags are normalized to lowercase. Both are deduplicated and sorted.

## Categories

V1 supports:

- `historical_pattern`
- `event_pattern`
- `replay_pattern`
- `market_memory_candidate`
- `unknown`

## Indexing Rules

Classification uses the canonical artifact type only:

| Artifact type | Discovery category |
| --- | --- |
| `historical_analog` | `historical_pattern` |
| `event_impact` | `event_pattern` |
| `replay_intelligence` | `replay_pattern` |
| `replay_learning` | `replay_pattern` |
| `market_memory` | `market_memory_candidate` |
| `dashboard_evidence` | `unknown` |
| `custom:*` | `unknown` |

These mappings are explicit. The discovery layer does not inspect summaries, evidence prose, numerical outcomes, confidence, or producer-specific payload metadata to infer a category.

`market_memory_candidate` means the artifact is discoverable through the Market Memory compatibility boundary. It does not trigger memory generation and does not imply that a new memory should be created.

## Reader

`ArtifactDiscoveryReader` wraps the existing `IntelligenceArtifactReader`.

It supports:

- discovery by artifact id;
- filtering by artifact type;
- filtering by symbol;
- filtering by tag;
- filtering by discovery category;
- generated-time filters;
- optional expired and archived inclusion;
- deterministic offset and limit.

The reader consumes registry summaries only. It does not read producer caches, raw market data, Replay datasets, Historical Analog payloads, Event Impact calculations, or Market Memory catalogs.

V1 scans at most 500 registry summaries per discovery operation. Results are sorted by category and artifact id.

## Lifecycle

1. An existing producer publishes a canonical intelligence artifact.
2. The registry validates and stores the artifact.
3. A consumer requests discovery through `ArtifactDiscoveryReader`.
4. Registry summaries are classified using fixed type mappings.
5. The consumer receives ephemeral discovery records.

Discovery records are derived views. V1 does not persist a separate discovery index or mutate the source artifact.

For reproducible persisted output, callers must provide an explicit `discoveredAt` timestamp. With identical artifact summaries and the same timestamp, the generated records are identical.

## Replay Learning Compatibility

Both:

- `replay_intelligence`
- `replay_learning`

are classified as `replay_pattern`.

The discovery layer does not distinguish orderbook evidence from manually captured factual Replay Learning by parsing their content. Consumers can use `artifactType` when that distinction matters.

No Replay loader, Replay infrastructure, or Replay UI is modified.

## Historical Analog and Event Impact Compatibility

Historical Analog and Event Impact are discovered through their existing canonical artifact types.

No similarity calculation, outcome calculation, cache read, or producer invocation occurs during discovery.

## Market Memory Compatibility

Artifact Discovery prepares stable candidate records for future Market Memory workflows.

V1 does not:

- call `buildMarketMemories()`;
- publish Market Memory artifacts;
- synthesize lessons;
- infer recurring patterns;
- select evidence for memory generation.

A future manual producer may query discovery categories and then apply separately versioned, deterministic Market Memory acceptance rules.

## Operations Visibility

The Intelligence Operations snapshot exposes:

- total discoverable indexed artifacts;
- counts by discovery category;
- Replay Learning artifact count.

These counts are derived from durable artifact index metadata only. Operations does not load artifact payloads or execute discovery against producer systems.

The Operations Console displays the counts inside the existing Artifact Inventory panel. It remains read-only.

## Failure Handling

- Missing registry entries return an empty discovery result.
- Unsupported or custom artifact types return `unknown`.
- Missing symbols or tags return empty arrays.
- Expired and archived artifacts remain excluded unless explicitly requested.
- Registry read failures propagate as read failures; they do not trigger producer work.
- Discovery never fabricates symbols, tags, categories, evidence, or confidence.

## Backward Compatibility

- Existing artifacts require no migration.
- Existing registry interfaces are unchanged.
- Existing artifact readers remain valid.
- Existing Market Memory generation is unchanged.
- Existing Operations API fields remain present.
- Discovery metadata is additive.

## Limitations

- V1 classification is intentionally coarse.
- Discovery records are not durably stored.
- The 500-summary scan limit may require future pagination for larger registries.
- Category mapping does not inspect producer-specific metadata.
- `unknown` artifacts require an explicit future contract update before classification.
- Discovery does not determine whether an artifact contains enough evidence for memory creation.
- Discovery does not validate cross-artifact relationships.

## Future Evolution

Future versions may add:

- durable discovery indexing when registry scale requires it;
- cursor-based registry scanning;
- explicit producer-supplied discovery metadata;
- deterministic eligibility contracts for manual Market Memory production;
- artifact relationship graphs based on explicit source ids.

These extensions must remain deterministic and must not introduce AI classification, semantic inference, recommendations, confidence generation, or automatic memory creation.
