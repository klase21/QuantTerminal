# Contradiction Engine V1

## Purpose

QuantTerminal intelligence has historically emphasized supporting evidence. Contradiction Engine V1 adds a deterministic, evidence-backed representation of both:

```text
supporting evidence
contradicting evidence
```

The engine does not reason, recommend, score decisions, generate confidence, infer narratives, or create opinions.

It classifies facts already present in prepared Historical Analog, Event Impact, and Market Memory outputs.

## Architecture

```text
Prepared intelligence output
  -> producer-specific contradiction adapter
  -> versioned ContradictionAnalysis
  -> API / artifact / memory propagation
  -> Research consumption
```

Contradiction generation is lightweight metadata derivation. It does not:

- read raw market data;
- scan history;
- rebuild caches;
- change similarity search;
- calculate new event outcomes;
- alter Replay;
- trigger intelligence production.

## Contract

The canonical contract lives under:

```text
core/contradiction/
```

```ts
interface ContradictionAnalysis {
  schemaVersion: 1
  contradictionId: string
  category: "historical_analog" | "event_impact" | "market_memory"
  supportingEvidence: ContradictionEvidence[]
  contradictingEvidence: ContradictionEvidence[]
  generatedAt: string
  sourceArtifactIds: string[]
}
```

Each evidence item contains:

- stable evidence id;
- evidence kind;
- factual title;
- factual summary;
- source;
- optional observation time;
- optional source artifact id;
- structured source metadata.

The contract does not include:

- recommendations;
- confidence;
- inferred causality;
- sentiment;
- generated explanations;
- decision scores.

## Validation

`isContradictionAnalysis()` validates:

- schema version;
- canonical category;
- required identifiers;
- evidence array shape;
- evidence source and summary;
- optional observation timestamps;
- generation timestamp;
- source artifact ids.

Contradiction metadata is optional on legacy intelligence objects and artifacts. Invalid optional metadata causes new artifact publication validation to fail, but legacy records without contradiction remain compatible.

## Historical Analog Evidence Rules

Historical Analog V1 contradiction metadata uses prepared 24h outcomes only.

No Historical Analog algorithm or cache-generation rule changes.

### Supporting Evidence

Supporting facts may include:

- positive 24h average outcome;
- positive outcomes representing more than half of usable cases;
- individual positive 24h historical cases.

### Contradicting Evidence

Contradicting facts may include:

- negative 24h average outcome;
- the observed non-positive outcome rate when win rate is below 100%;
- individual negative 24h historical cases.

The failure rate is reported as:

```text
100 - prepared 24h win rate
```

This is arithmetic over an existing statistic, not confidence generation.

Individual case evidence preserves:

- case id;
- similarity already calculated by Historical Analog;
- observed timestamp;
- actual prepared 24h outcome;
- source.

Only the first five positive and first five negative prepared cases are included in metadata to keep artifact payloads bounded. Aggregate facts still represent the full prepared sample.

## Event Impact Evidence Rules

Event Impact V1 contradiction metadata uses existing prepared 24h event outcomes.

No event outcome or aggregation calculation changes.

### Supporting Evidence

Supporting facts may include:

- positive prepared 24h average return;
- individual verified events with positive prepared 24h outcomes.

### Contradicting Evidence

Contradicting facts may include:

- negative prepared 24h average return;
- individual verified events with negative prepared 24h outcomes;
- an explicit mixed-distribution fact when both positive and negative outcomes exist.

Mixed consistency is represented only by observed counts:

```text
N positive outcomes
M negative outcomes
```

The engine does not label the distribution strong, weak, reliable, or unreliable.

## Market Memory Evidence Rules

Market Memory continues to consume prepared artifacts only.

### Source Propagation

Regime and Event memories inherit:

- supporting evidence from their source artifact contradiction metadata;
- contradicting evidence from their source artifact contradiction metadata.

Structural memories aggregate the contradiction metadata present on their supporting artifacts.

### Failure Memories

A memory with canonical type:

```text
failure
```

is represented as contradicting evidence using:

- the memory title;
- deterministic memory summary;
- memory id;
- source artifact references.

V1 does not infer failure memories from prose, negative words, tags, or outcomes.

### Thesis Compatibility

Contradiction metadata does not determine whether a memory supports a thesis.

If source artifacts already carry an Investigation Thesis, that metadata remains available independently. V1 does not perform semantic thesis matching or LLM reasoning.

## Published Artifact Integration

Canonical `IntelligenceArtifact` can optionally contain:

```text
contradiction
```

Historical Analog publishers attach deterministic Historical Analog contradiction metadata.

Event Impact publishers attach deterministic Event Impact contradiction metadata.

Market Memory publishers preserve contradiction metadata already generated by the memory builder.

Replay publication was not changed.

Existing artifacts without contradiction remain valid. Durable index entries may include contradiction metadata for operational discovery, while legacy entries continue to load without it.

## API and Reader Propagation

Historical Analog APIs attach contradiction metadata when a valid prepared cache is available.

Event Impact cache readers attach contradiction metadata to:

- newly prepared results;
- legacy cached results at the read boundary;
- unavailable results with empty evidence arrays.

No API triggers historical computation.

Market Memory API responses expose each memory's optional contradiction metadata through the existing memory contract.

## Research Consumption

Research remains manual-load and keeps its existing layout and workflow.

Existing Historical Analog, Event Impact, and Market Memory sections now expose compact counts for:

- supporting evidence;
- contradicting evidence.

Detailed evidence remains available in response contracts and published artifacts. No new page, panel, workflow, or automatic request was introduced.

## Compatibility

### Legacy Historical Analog Cache

Contradiction metadata is derived at API/publication time from existing prepared outcomes.

No cache migration is required.

### Legacy Event Impact Cache

The cache reader derives contradiction metadata from existing prepared event outcomes.

No outcome recalculation is performed.

### Legacy Artifacts

Artifacts without contradiction remain valid because the field is optional.

Republished Historical Analog and Event Impact artifacts receive contradiction metadata.

### Legacy Market Memory

Memories without contradiction remain readable. Rebuilt memories inherit available source artifact contradiction metadata.

## Failure Handling

- Missing prepared outcomes produce empty evidence arrays.
- Missing source artifact contradiction produces no inherited evidence.
- Zero returns are not classified as supporting or contradicting.
- Missing source artifacts do not trigger cache or registry lookups.
- Invalid contradiction metadata is rejected during new artifact validation.
- Missing contradiction metadata never blocks Research or artifact reads.

The engine prefers an empty evidence set over unsupported interpretation.

## Limitations

- V1 uses the 24h horizon for Historical Analog and Event Impact contradiction classification.
- Positive and negative evidence are classified by return sign; zero returns remain neutral and are omitted.
- Historical case samples embedded in contradiction metadata are bounded to five per side.
- Contradiction does not measure evidence importance, reliability, or statistical significance.
- Failure rate includes all non-positive outcomes because it is derived from the existing positive-return win-rate definition.
- Market Memory does not yet compare memories against thesis semantics.
- Existing durable artifacts require republication before contradiction metadata is persisted.
- Research exposes evidence counts, not a detailed contradiction inspection experience.

## Future Evolution

Future work may add, without changing V1 semantics:

- horizon selection from Investigation Thesis;
- supporting and contradicting artifact search;
- explicit evidence roles in Market Memory;
- contradiction detail views;
- evidence validity filtering;
- deterministic thesis-to-evidence compatibility rules.

These are not implemented in V1.
