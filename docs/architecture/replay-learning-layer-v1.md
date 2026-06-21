# Replay Learning Layer V1

## Purpose

Replay Learning V1 captures factual evidence from a completed Replay investigation so that the evidence can be reused by the Intelligence Artifact Registry, Market Memory, Decision Brief, and Research.

It does not generate a lesson, opinion, prediction, recommendation, confidence value, or narrative.

```text
Replay observation
  -> explicit factual observations and outcomes
  -> Replay Learning contract
  -> replay_learning artifact
  -> existing intelligence consumers
```

Replay loaders, Replay UI, and Replay infrastructure remain unchanged. V1 is an application contract and publication boundary only.

## Contract

The versioned contract lives in:

```text
core/replay-learning/
```

Every Replay Learning record contains:

- `learningId`
- `replayContext`
- `observations`
- `outcomes`
- `evidenceArtifactIds`
- `generatedAt`

The contract also includes `schemaVersion: 1`.

### Replay Context

The replay context records:

- exchange
- symbol
- timeframe
- date
- UTC hour
- investigation timestamp
- optional Investigation Thesis id
- optional selected Historical Case id

This identifies the exact investigation window without reading or reloading Replay datasets.

### Observation Types

Canonical observation types are:

- `funding`
- `open_interest`
- `liquidation`
- `orderbook`
- `price_structure`
- `other`

Each observation requires:

- stable observation id
- observation type
- observation time
- factual statement
- source

Optional metadata may contain primitive measured values. Optional evidence artifact ids may identify the exact prepared artifacts supporting the observation.

### Outcomes

Each outcome requires:

- stable outcome id
- horizon
- observation time
- factual statement
- source

Outcomes describe what was observed after the Replay context. They do not claim causality or predictive value.

## Lifecycle

V1 has an explicit, manual lifecycle:

1. A caller completes or reviews a Replay window.
2. The caller supplies factual observations, outcomes, and prepared evidence artifact ids.
3. `createReplayLearning()` validates and canonicalizes the record.
4. `createReplayLearningArtifact()` converts it to a canonical intelligence artifact.
5. `publishReplayLearningArtifact()` publishes it through the existing production registry.
6. Existing durable registry adapters may persist the artifact without a Replay-specific store.

There is no automatic capture, scheduler integration, Replay hook, loader modification, or request-time historical calculation.

## Evidence Rules

Replay Learning accepts evidence capture only.

The builder:

- requires at least one factual observation or outcome;
- requires at least one evidence artifact id;
- validates timestamps;
- validates the selected UTC hour;
- normalizes exchange and symbol vocabulary;
- sorts observations and outcomes deterministically;
- deduplicates evidence artifact ids;
- preserves caller-provided facts without rewriting them.

The builder does not:

- inspect raw Replay payloads;
- infer market meaning;
- classify facts as bullish or bearish;
- generate prose;
- calculate confidence;
- generate recommendations;
- infer causality.

Factual correctness and provenance remain the responsibility of the producer supplying the observations and referenced prepared artifacts.

## Artifact Registry Compatibility

The canonical artifact type `replay_learning` is added to the existing registry contract.

The publication adapter creates:

- a deterministic artifact id based on `learningId`;
- uncalibrated confidence metadata;
- Evidence Validity derived from observation coverage;
- supporting evidence entries copied from factual observations and outcomes;
- symbol, exchange, and optional historical case subjects;
- references to all source evidence artifact ids.

The adapter does not create Contradiction metadata. Replay Learning facts are not automatically supporting or contradicting evidence because V1 does not infer their relationship to a thesis.

## Market Memory Compatibility

Market Memory can consume `replay_learning` artifacts without reading Replay data.

The deterministic V1 rule requires at least two Replay Learning artifacts for the same symbol and exchange. It creates a `setup` memory that reports only:

- number of Replay Learning artifacts;
- total factual observation count;
- total factual outcome count.

The memory does not synthesize a lesson or recurring causal claim. It preserves the source artifacts, validity, thesis, and Decision Brief only when their identifiers remain consistent.

## Decision Brief Compatibility

Replay Learning artifacts are compatible with the existing generic Decision Brief artifact adapter.

They contribute:

- source artifact identity;
- evidence freshness;
- evidence coverage.

They do not contribute bullish or bearish evidence counts in V1 because no Contradiction classification is generated. A future deterministic evidence-role contract would be required before Replay Learning can affect `currentView`.

## Research Compatibility

Research can consume Replay Learning through existing artifact and Market Memory boundaries.

V1 adds no Research polling, API request, or UI workflow. This preserves Research responsiveness and manual historical loading rules.

A future Research integration may display:

- factual Replay observations;
- factual outcomes;
- evidence provenance;
- source Replay window;

without changing this contract.

## Backward Compatibility

- Existing Replay behavior is unchanged.
- Existing Replay evidence artifacts remain valid.
- Existing artifact types and readers remain valid.
- Existing Market Memory generation remains valid.
- Replay Learning fields are not required on legacy artifacts.
- Decision Brief remains optional.
- Investigation Thesis remains optional.

## Limitations

- V1 does not capture facts automatically from Replay.
- V1 does not verify that referenced artifact ids exist at contract creation time.
- V1 does not define a dedicated durable Replay Learning store.
- V1 does not classify observations as supporting or contradicting a thesis.
- V1 does not infer causality between observations and outcomes.
- V1 does not provide a Replay or Research UI for authoring learning records.
- The Market Memory compatibility rule reports evidence volume only; it does not claim an accumulated lesson.

## Future Evolution

Future versions may add:

- explicit manual capture controls in Replay;
- deterministic validation that referenced artifacts exist;
- evidence-role annotations supplied by verified producers;
- a Research detail view for Replay Learning artifacts;
- lifecycle states such as draft, verified, and superseded;
- production orchestration for verified learning publication.

These extensions must preserve the factual-only boundary and must not introduce AI-generated lessons, recommendations, predictions, or confidence.
