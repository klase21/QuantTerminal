# Decision Brief V1

## Purpose

QuantTerminal now has:

- a versioned Investigation Thesis;
- explicit Evidence Validity;
- supporting evidence;
- contradicting evidence.

Decision Brief V1 provides a deterministic summary of those prepared structures.

It does not:

- recommend a trade;
- produce a buy or sell signal;
- predict market direction;
- generate confidence;
- score a decision;
- interpret narratives;
- call AI or an LLM.

The brief reports the current evidence shape of an investigation.

## Architecture

```text
Investigation Thesis
  + prepared artifact validity
  + prepared supporting evidence
  + prepared contradicting evidence
  -> deterministic Decision Brief
  -> Research / artifact compatibility
```

Decision Brief generation is a pure aggregation step. It does not read raw market data, historical caches, Replay datasets, or external APIs.

It does not trigger builders or request-time historical computation.

## Contract

The canonical contract lives under:

```text
core/decision-brief/
```

```ts
interface DecisionBrief {
  schemaVersion: 1
  decisionBriefId: string
  investigationThesisId: string
  generatedAt: string
  currentView:
    | "undetermined"
    | "bullish_lean"
    | "bearish_lean"
    | "mixed"
    | "insufficient_evidence"
  freshnessStatus: "VALID" | "STALE" | "EXPIRED" | "UNKNOWN"
  coverageStatus: "FULL" | "PARTIAL" | "UNAVAILABLE" | "UNKNOWN"
  supportingEvidenceCount: number
  contradictingEvidenceCount: number
  keySupportingFactors: string[]
  keyContradictingFactors: string[]
  requiredNextValidation: string[]
  sourceArtifactIds: string[]
}
```

## Input Boundary

The builder accepts:

- one valid Investigation Thesis;
- zero or more prepared evidence sources.

Each source contains:

- artifact id;
- Evidence Validity;
- optional Contradiction Analysis.

The builder does not accept raw Historical Analog cases, Event Impact outcomes, market candles, Replay rows, or narrative prose.

Producer-specific systems must first publish or expose canonical validity and contradiction metadata.

## Current View Rules

Current View is deterministic and unweighted.

### Undetermined

Returned when the thesis is not active:

- resolved;
- invalidated;
- archived.

The brief does not reinterpret completed or inactive investigations.

### Insufficient Evidence

Returned when:

- no evidence sources are available;
- coverage is unavailable;
- both supporting and contradicting evidence counts are zero.

### Mixed

Returned when at least one supporting and one contradicting evidence item exist.

No ratio or score is calculated.

### Bullish Lean

Returned only when:

- at least one supporting evidence item exists;
- no contradicting evidence item exists.

In V1, supporting evidence from Historical Analog and Event Impact is based on prepared positive outcomes.

`bullish_lean` does not mean:

- buy;
- expected price increase;
- high confidence;
- recommended position.

It means only that the currently loaded, classified evidence is one-sided toward positive prepared outcomes.

### Bearish Lean

Returned only when:

- at least one contradicting evidence item exists;
- no supporting evidence item exists.

`bearish_lean` does not mean:

- sell;
- short;
- expected price decline;
- recommended position.

It means only that the currently loaded, classified evidence is one-sided toward adverse prepared outcomes.

## Evidence Counts

Counts are direct sums of prepared Contradiction Analysis arrays:

```text
supportingEvidenceCount
  = sum of supportingEvidence lengths

contradictingEvidenceCount
  = sum of contradictingEvidence lengths
```

There is no weighting, deduplication score, confidence adjustment, or statistical significance calculation.

Source artifact ids are deduplicated and sorted for deterministic output.

## Key Factors

Key factors are factual evidence titles already present in Contradiction Analysis.

Rules:

1. Preserve source order after deterministic artifact-id sorting.
2. Remove exact duplicate titles.
3. Return at most five supporting factors.
4. Return at most five contradicting factors.
5. Do not summarize or rewrite evidence.

The system does not generate explanatory prose.

## Evidence Validity

Decision Brief uses `aggregateEvidenceValidity()`.

The resulting brief takes:

- the most conservative freshness state;
- the most conservative coverage state.

This prevents one fresh, complete artifact from hiding stale or partial evidence elsewhere in the investigation.

No validity state changes evidence counts or current view in V1, except:

- `UNAVAILABLE` coverage produces `insufficient_evidence`.

Stale or expired evidence remains visible with its explicit validity status. Consumers decide whether to continue the investigation.

## Required Next Validation

Required validation items use fixed templates driven only by contract state.

Examples:

- load prepared intelligence when no source artifact exists;
- verify observation time when freshness is unknown;
- validate current evidence when stale or expired;
- validate missing evidence when coverage is partial;
- obtain usable coverage when unavailable;
- check for supporting evidence when none exists;
- check for contradicting evidence when none exists.

These are validation requirements, not market recommendations.

No free-form explanation generation occurs.

## Research Consumption

Research creates a Decision Brief from intelligence already loaded manually:

- Historical Analog;
- Event Impact;
- Market Memory.

No additional API request is introduced.

The existing Investigation Status area can expose:

- current view;
- supporting and contradicting evidence counts;
- first key supporting factor;
- first key contradicting factor;
- first required validation.

The Research workflow and page layout remain unchanged.

When no Investigation Thesis exists, Research does not create a brief.

When a thesis exists but no intelligence is loaded, the brief reports `insufficient_evidence`.

## Historical Analog

Historical Analog remains unchanged.

Decision Brief consumes only its existing:

- Evidence Validity;
- Contradiction Analysis;
- source artifact identity.

No similarity, outcome, win-rate, or case-ranking calculation is modified.

## Event Impact

Event Impact remains unchanged.

Decision Brief consumes only its existing:

- Evidence Validity;
- Contradiction Analysis;
- source artifact identity.

No event outcome or aggregation calculation is modified.

## Market Memory

Market Memory can preserve a Decision Brief when:

- its source artifact already contains one;
- the memory remains associated with the same thesis.

Structural memories preserve a source brief only when all grouped artifacts reference the same Decision Brief id.

Market Memory does not generate a new directional brief from memory prose.

## Published Artifact Compatibility

Canonical Intelligence Artifacts may optionally contain:

```text
decisionBrief
```

Artifact validation requires:

- a valid Decision Brief contract;
- an accompanying Investigation Thesis;
- matching `investigationThesisId` and `thesisId`.

Historical Analog, Event Impact, Replay Evidence, and Market Memory publication adapters accept an optional prepared Decision Brief.

They do not automatically invent one when a thesis or evidence is absent.

Existing artifacts without a Decision Brief remain valid.

Durable artifact payloads and index entries may persist the optional brief. Legacy index entries remain readable.

## Artifact Adapter

`decisionBriefSourcesFromArtifacts()` converts canonical artifacts into Decision Brief evidence sources.

It reads only:

- artifact id;
- artifact validity;
- artifact contradiction metadata.

It does not read producer metadata or recalculate intelligence.

## Determinism

For the same:

- thesis;
- evidence sources;
- explicit generation timestamp;

the builder returns the same:

- current view;
- evidence counts;
- key factors;
- validation requirements;
- source artifact ids.

Callers should supply a stable generation timestamp when persistent reproducibility is required.

## Failure Handling

- Missing sources produce `insufficient_evidence`.
- Missing contradiction metadata contributes zero evidence.
- Missing supporting evidence adds an explicit validation requirement.
- Missing contradicting evidence adds an explicit validation requirement.
- Unknown validity remains `UNKNOWN`.
- Invalid generated timestamps are rejected.
- Invalid artifact Decision Brief metadata is rejected at publication.
- No failure triggers data loading or historical computation.

## Backward Compatibility

- Investigation Thesis remains optional on legacy context.
- Decision Brief remains optional on artifacts and memories.
- Existing Historical Analog and Event Impact caches require no migration.
- Existing durable artifacts remain readable.
- Research remains functional without a thesis or brief.
- No API response is made incompatible by requiring Decision Brief fields.

## Limitations

- V1 treats all evidence items equally.
- Evidence counts can include aggregate facts and individual cases from the same source distribution.
- The current view does not account for statistical significance or sample quality.
- V1 does not map a thesis hypothesis to semantic evidence support.
- Stale evidence remains countable, although freshness is exposed.
- Key factors are evidence titles rather than a synthesized explanation.
- Required validation uses fixed English templates.
- No durable standalone Decision Brief store exists.
- No artifact search filter by Decision Brief or thesis id exists.
- Research presents a compact summary, not a dedicated brief workflow.

## Future Evolution

Possible future work:

- deterministic horizon selection from the thesis;
- evidence-role deduplication;
- explicit source artifact grouping;
- validity-aware exclusion policies;
- durable brief publication;
- brief lifecycle history;
- contradiction detail navigation;
- thesis-specific evidence compatibility.

These are not implemented in V1.
