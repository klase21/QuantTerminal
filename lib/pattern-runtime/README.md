# Pattern Runtime Foundation

This directory implements the first Knowledge Layer runtime above Historical
Memory. It validates caller-supplied, versioned interpretations of immutable
Historical Memory evidence without extracting, calculating, learning, scoring,
persisting, or searching for patterns.

## Runtime Components

* `types.ts`: Pattern, identity, scope, evidence, metrics, lifecycle, result,
  validation, and query contracts.
* `identity.ts`: deterministic scope/version/evidence identity and evidence hash.
* `pattern.ts`: creation from eligible Historical Memory and deep freezing.
* `evidence.ts`: strict Historical Memory evidence projection and validation.
* `lifecycle.ts`: forward-only lifecycle transitions.
* `validation.ts`: identity, version, evidence, scope, metric, timestamp, and
  lifecycle validation.
* `serialize.ts`: safe non-throwing JSON round trips.
* `merge.ts`: deterministic lifecycle reconciliation and versioned evidence growth.
* `query.ts`: immutable validated query descriptions only.
* `index.ts`: public exports.

## Facts Versus Interpretation

Historical Memory is the fact layer. `PatternEvidence` contains immutable IDs
and selectors projected from a `VERIFIED`, `INDEXED`, or `ARCHIVED` Historical
Memory record. Raw Signal Snapshots, Evaluation Results, and Outcome Events are
not accepted as Pattern evidence.

Pattern Runtime is an interpretation layer. `interpretation` and
`metricSummary` must be supplied by an upstream future process and are never
generated or computed here. Evidence must be non-empty, scope selectors must
match every evidence record, and `sampleSize` and distribution counts must
match the evidence set. These checks establish consistency; they do not prove
or calculate an interpretation.

## Identity and Versioning

Pattern identity includes:

* `patternId`;
* positive integer `patternVersion`;
* canonical `scope`;
* deterministic `evidenceSetHash`.

The evidence hash uses a stable pure runtime hash of sorted Historical Memory
IDs. It is an identity checksum, not a security or similarity score.

Changing evidence, interpretation, metrics, or scope requires a new Pattern
version and therefore a new deterministic Pattern ID. Same-version records may
only reconcile compatible lifecycle progress. A higher version may extend the
evidence set only when it retains every prior Historical Memory reference.
There is no hidden identity registry or persistence state.

## Lifecycle

Allowed transitions are:

```text
DRAFT -> CANDIDATE -> VALIDATED -> ARCHIVED
                   -> REJECTED  -> ARCHIVED
```

Transitions are adjacent and forward-only. `VALIDATED` and `REJECTED` are
separate branches. A rejected Pattern cannot become validated within the same
version; new evidence or interpretation must create a new version.

## Metric Summary

The model accepts only caller-supplied source-backed structures for sample
size, win rate, return statistics, favorable/adverse excursion, drawdown
profile, evaluation-window distribution, and direction distribution. Values
must be finite, win rate must be between 0 and 100, category counts must be
unique, and distribution totals must equal sample size.

No aggregation or metric calculation exists in this runtime.

## Query Model

`PatternQuery` supports symbol, timeframe, direction, evaluation window,
outcome status, Pattern status, minimum sample size, and date range. Query
helpers validate and freeze descriptions only. They do not search, filter,
rank, compare, or access storage.

## No-Fabrication and Exclusions

Pattern Runtime must not generate AI narratives, unsupported labels,
confidence calibration, playbooks, recommendations, similarity scores,
embeddings, metrics, or evidence. It contains no Learning, extraction,
aggregation, scoring, persistence, database, vector store, API, scheduler,
worker, or UI implementation.

## Relationship and Future Dependencies

```text
Historical Memory
  -> Pattern Runtime
  -> Learning Runtime
  -> Confidence Calibration
  -> Playbook Runtime
```

Pattern Runtime is the first Knowledge Layer. Future systems may submit
source-backed Pattern inputs or consume validated versions, but they must not
rewrite Historical Memory facts or bypass Pattern versioning.
