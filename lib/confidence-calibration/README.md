# Confidence Calibration Runtime Foundation

This directory implements the immutable versioned trust layer above Learning
and Pattern Runtime. It validates caller-supplied confidence interpretations
without calculating confidence, selecting bands, scoring evidence, learning,
persisting, or searching.

## Runtime Components

* `types.ts`: Calibration, identity, scope, evidence, method, bands, lifecycle,
  model, result, validation, and query contracts.
* `identity.ts`: deterministic scope/version/Learning-set/Pattern-set identity.
* `calibration.ts`: creation from validated upstream records and deep freezing.
* `evidence.ts`: strict Learning-or-Pattern evidence validation.
* `lifecycle.ts`: forward-only branched lifecycle transitions.
* `validation.ts`: identity, scope, evidence, method, confidence, sample,
  timestamp, band, and lifecycle validation.
* `serialize.ts`: safe non-throwing JSON round trips.
* `merge.ts`: deterministic lifecycle reconciliation and versioned evidence growth.
* `query.ts`: immutable validated query descriptions only.
* `index.ts`: public exports.

## Learning/Pattern-to-Calibration Relationship

Every Calibration version requires at least one complete validated Learning
record and one complete validated Pattern record. Evidence is discriminated as
`LEARNING` or `PATTERN` and remains deeply immutable. Raw Signal Snapshots,
Evaluation Results, Outcome Events, and Historical Memory records are rejected.

Separate `learningSetHash` and `patternSetHash` values preserve the distinction
between versioned conclusions and their underlying Pattern interpretations.
The hashes are deterministic identity checksums, not scores or similarities.

## Facts and Interpretation Boundary

```text
Historical Memory = recorded facts
Pattern Runtime = evidence-backed interpretation
Learning Runtime = versioned conclusion
Confidence Calibration = versioned trust interpretation
```

Calibration Runtime validates only the structure supplied by its caller. It
does not derive raw confidence, calibrated confidence, bands, sample metrics,
conditions, or methods.

## Calibration Model

The model contains only the approved fields: raw and calibrated confidence,
canonical band, sample size, observed win rate, expected return, average
drawdown, versioned method identity, and caller-supplied applicable/failure
conditions.

Confidence percentages must be between 0 and 100. Available bands require both
confidence values and a positive sample. `UNAVAILABLE` requires
`calibratedConfidence: null` and permits null source metrics. The runtime does
not map numeric ranges to bands; band selection remains an upstream governed
input.

Canonical bands are:

```text
VERY_LOW | LOW | MODERATE | HIGH | VERY_HIGH | UNAVAILABLE
```

## Identity and Versioning

Identity includes `calibrationId`, positive integer `calibrationVersion`,
canonical scope, `learningSetHash`, and `patternSetHash`. Any output, method,
scope, or evidence change requires a new version.

A higher version may append evidence only when every prior Learning and Pattern
reference is retained. Same-version merge may reconcile lifecycle only; it
cannot alter confidence, band, method, conditions, metrics, or evidence.

## Lifecycle

Allowed transitions are:

```text
DRAFT -> CANDIDATE -> VALIDATED -> SUPERSEDED -> ARCHIVED
                   -> REJECTED  -> SUPERSEDED -> ARCHIVED

VALIDATED -> ARCHIVED
REJECTED  -> ARCHIVED
```

Transitions are forward-only. Rejected Calibration cannot become validated in
the same version. A superseded version remains immutable and may only be
archived.

## Query Model

`CalibrationQuery` supports symbol, timeframe, direction, Calibration status,
band, minimum sample size, Learning ID, Pattern ID, and date range. Query
helpers validate and freeze descriptions only. They do not search, rank,
filter, score, or access storage.

## No-Fabrication and Exclusions

Calibration Runtime must not generate confidence values, AI narratives,
unsupported bands, playbooks, trade recommendations, similarity scores,
embeddings, metrics, or evidence. It contains no automatic calibration,
scoring engine, AI, database, vector store, API, scheduler, persistence, or UI.

## Future Dependencies

```text
Historical Memory
  -> Pattern Runtime
  -> Learning Runtime
  -> Confidence Calibration
  -> Playbook Runtime
```

Confidence Calibration is the versioned trust layer. Future Playbook systems
may consume validated Calibration records but must not rewrite upstream facts,
Patterns, Learning conclusions, or Calibration versions.
