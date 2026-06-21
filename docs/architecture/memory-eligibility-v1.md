# Memory Eligibility Layer V1

## Purpose

Memory Eligibility V1 evaluates whether repeated, discovered intelligence artifacts have enough deterministic evidence to be considered by a future Market Memory production workflow.

```text
Artifact Registry
  -> Artifact Discovery
  -> coverage and repetition evaluation
  -> Memory Eligibility record
  -> future manual memory production boundary
```

The layer does not generate memories, summaries, recommendations, confidence values, or semantic conclusions.

## Contract

The versioned contract lives in:

```text
core/memory-eligibility/
```

Every eligibility record contains:

- `schemaVersion`
- `eligibilityId`
- `category`
- `artifactCount`
- `coverageStatus`
- `eligibilityStatus`
- `evaluatedAt`
- `supportingArtifactIds`

Eligibility statuses are:

- `candidate`
- `eligible`
- `population_ready`
- `insufficient_evidence`

The record contains artifact identity and evidence state only. It contains no memory title, memory summary, confidence, recommendation, or inferred lesson.

## Grouping and Repetition

Artifacts are grouped by:

1. Artifact Discovery category.
2. Exact normalized symbol scope.

Symbol scopes are uppercase, deduplicated, sorted, and encoded into `eligibilityId`.

Examples:

```text
memory-eligibility:historical_pattern:BTCUSDT
memory-eligibility:replay_pattern:BTCUSDT+ETHUSDT
memory-eligibility:event_pattern:unscoped
```

This prevents unrelated symbols from satisfying repetition requirements for each other.

The same artifact id is counted once within a group.

## Coverage Aggregation

Group coverage uses only existing Evidence Validity metadata.

Rules:

- all artifacts `FULL` -> `FULL`;
- at least one `FULL` or `PARTIAL`, but not all `FULL` -> `PARTIAL`;
- all artifacts `UNAVAILABLE` -> `UNAVAILABLE`;
- otherwise -> `UNKNOWN`.

This is an evidence availability classification. It is not confidence and does not assess the truth of an artifact.

## Eligibility Rules

Rules are applied in order:

### Insufficient Evidence

Returned when:

- the discovery category is `unknown`;
- the group has no artifacts;
- aggregate coverage is `UNKNOWN`;
- aggregate coverage is `UNAVAILABLE`.

Artifact count cannot override unavailable or unknown evidence coverage.

### Candidate

Returned when:

- exactly one artifact exists;
- category is known;
- coverage is `FULL` or `PARTIAL`.

Candidate means the artifact is discoverable but has no repeated observation.

### Eligible

Returned when:

- at least two artifacts exist;
- category is known;
- coverage is `FULL` or `PARTIAL`;
- the population-ready rule is not satisfied.

Eligible means repetition exists. It does not authorize automatic memory generation.

### Population Ready

Returned when:

- at least five artifacts exist;
- category is known;
- every artifact has `FULL` coverage.

Population ready means a repeated, fully covered artifact population exists. It does not assert statistical significance or memory quality.

## Reader Lifecycle

`MemoryEligibilityReader` wraps the existing `IntelligenceArtifactReader`.

It:

1. Reads artifact summaries from the registry.
2. Reuses Artifact Discovery classification.
3. Reads Evidence Validity coverage from each summary.
4. Groups artifacts by category and symbol scope.
5. Applies fixed eligibility rules.
6. Returns ephemeral eligibility records.

It supports the existing discovery filters plus eligibility status filtering.

The reader scans at most 500 artifact summaries. It does not load producer payloads or call producer systems.

For reproducible output, callers should supply an explicit `evaluatedAt`. With identical artifact summaries and the same timestamp, the result is deterministic.

## Replay Learning Compatibility

Replay Learning and Replay Intelligence are both `replay_pattern` discovery artifacts.

Repeated Replay artifacts for the same symbol scope can become eligible when their Evidence Validity coverage is usable.

The eligibility layer does not:

- inspect Replay observations;
- load Replay datasets;
- modify Replay;
- infer a lesson from Replay facts;
- call a Replay builder.

## Historical Analog and Event Impact Compatibility

Historical Analog artifacts are evaluated as `historical_pattern`.

Event Impact artifacts are evaluated as `event_pattern`.

Their algorithms and calculations remain unchanged. Eligibility reads only artifact count, discovery category, symbols, and coverage status.

## Market Memory Compatibility

Memory Eligibility is a future gate before Market Memory production.

V1 deliberately does not modify or call `buildMarketMemories()`.

An `eligible` or `population_ready` record means only that a future manual producer may inspect the referenced artifacts under separately versioned memory-generation rules.

Existing Market Memory artifacts are classified as `market_memory_candidate` for discovery continuity. Eligibility does not regenerate or recursively summarize them.

## Operations Visibility

The Intelligence Operations snapshot exposes:

- total eligibility group count;
- candidate group count;
- eligible group count;
- population-ready group count;
- insufficient-evidence group count.

Operations derives this metadata from the durable artifact index. It does not load payloads or generate memories.

The existing Operations Console displays these counts in the Artifact Inventory panel.

## Failure Handling

- Missing artifact index -> zero eligibility groups.
- Missing validity metadata -> `UNKNOWN` coverage and `insufficient_evidence`.
- Missing symbols -> deterministic `unscoped` group.
- Unknown artifact type -> `unknown` category and `insufficient_evidence`.
- Duplicate artifact ids -> counted once per group.
- Invalid evaluation timestamp -> explicit error.

No failure triggers memory creation, data loading, retries, or producer computation.

## Backward Compatibility

- Artifact Registry interfaces are unchanged.
- Artifact Discovery contracts are unchanged.
- Existing artifacts require no migration.
- Missing legacy validity metadata degrades to `UNKNOWN`.
- Existing Market Memory generation remains unchanged.
- Operations metadata additions are additive.
- Replay, Historical Analog, and Event Impact systems are unchanged.

## Limitations

- Thresholds are fixed V1 policy rather than empirically calibrated sample requirements.
- Artifact count does not measure independence between observations.
- `FULL` coverage is inherited from producers and is not revalidated.
- Exact symbol-set grouping may separate related multi-symbol and single-symbol evidence.
- Unscoped artifacts can repeat with other unscoped artifacts.
- The 500-artifact scan limit may require pagination later.
- Eligibility records are derived and not durably stored.
- Eligibility does not validate evidence quality, causality, statistical significance, or contradiction balance.

## Future Evolution

Future work may add:

- versioned category-specific thresholds;
- explicit observation independence metadata;
- durable eligibility snapshots when operational scale requires them;
- manual Market Memory builder input restricted by eligibility ids;
- explicit supersession and invalidation handling.

These changes must remain deterministic and must not introduce AI, semantic reasoning, confidence generation, recommendations, automatic memory creation, or request-time historical computation.
