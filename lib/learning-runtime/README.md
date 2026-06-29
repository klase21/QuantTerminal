# Learning Runtime Foundation

This directory implements the immutable versioned conclusion layer above
Pattern Runtime. It validates caller-supplied Learning conclusions derived from
one or more complete Pattern records without performing automatic learning,
text generation, scoring, aggregation, calibration, or persistence.

## Runtime Components

* `types.ts`: Learning, identity, scope, Pattern evidence, conclusion,
  lifecycle, result, validation, and query contracts.
* `identity.ts`: deterministic scope/version/Pattern-set identity.
* `learning.ts`: creation from validated Patterns and deep freezing.
* `evidence.ts`: strict Pattern-only evidence validation.
* `lifecycle.ts`: forward-only branched lifecycle transitions.
* `validation.ts`: identity, scope, Pattern, conclusion, sample, timestamp, and
  lifecycle validation.
* `serialize.ts`: safe non-throwing JSON round trips.
* `merge.ts`: deterministic lifecycle reconciliation and versioned Pattern growth.
* `query.ts`: immutable validated query descriptions only.
* `index.ts`: public exports.

## Pattern-to-Learning Relationship

Every `LearningEvidence` embeds a complete validated immutable Pattern record.
Raw Signal Snapshots, Evaluation Results, Outcome Events, and Historical Memory
records are not Learning evidence. This keeps the dependency direction clear:

```text
Historical Memory facts
  -> Pattern interpretations
  -> Learning conclusions
```

Learning Runtime does not rewrite Pattern interpretation, Pattern metrics, or
Historical Memory evidence. It only preserves those records as immutable input
to a caller-supplied conclusion.

## Facts, Interpretations, and Conclusions

Historical Memory is the immutable fact layer. Pattern Runtime is the first
interpretation layer. Learning Runtime is the versioned conclusion layer.

`LearningConclusion` contains only the allowed caller-supplied fields: summary,
applicable and failure conditions, supporting and conflicting Pattern IDs,
sample size, observed win rate, average return, and risk notes. The runtime
validates structure and reference consistency; it never generates text,
classifications, metrics, or conclusions.

Every evidence Pattern must be classified exactly once as supporting or
conflicting. Sample size must be positive and cannot exceed the sum of the
referenced Pattern sample sizes. This upper-bound check does not aggregate or
deduplicate overlapping samples.

## Identity and Versioning

Learning identity includes `learningId`, positive integer `learningVersion`,
canonical `scope`, and a deterministic `patternSetHash` derived from sorted
Pattern IDs. The hash is an identity checksum, not a score or similarity value.

Changing a conclusion, Pattern set, classification, or scope requires a new
Learning version. A higher version may append Pattern references only when it
retains every prior Pattern and preserves each prior supporting/conflicting
classification. Same-version merge may reconcile lifecycle only.

## Lifecycle

Allowed transitions are:

```text
DRAFT -> CANDIDATE -> VALIDATED -> SUPERSEDED -> ARCHIVED
                   -> REJECTED  -> SUPERSEDED -> ARCHIVED

VALIDATED -> ARCHIVED
REJECTED  -> ARCHIVED
```

Transitions are forward-only. `VALIDATED` and `REJECTED` are separate branches.
A rejected Learning record cannot become validated in the same version.
`SUPERSEDED` remains immutable and may only transition to `ARCHIVED`.

## Merge Philosophy

Same-version Pattern evidence and conclusions are immutable. Conflicting
branches or changed content are rejected. Across versions, merge deterministically
selects the higher version only when its Pattern set is a superset and prior
classifications are retained. No merge mutates either input.

## Query Model

`LearningQuery` supports symbol, timeframe, direction, Learning status, minimum
sample size, Pattern ID, and date range. Query helpers validate and freeze
descriptions only. They do not search, filter, rank, score, or access storage.

## No-Fabrication and Exclusions

Learning Runtime must not generate AI narratives, unsupported conclusions,
confidence calibration, playbooks, trade recommendations, similarity scores,
embeddings, metrics, or evidence. It contains no automatic learning, scoring,
database, vector store, API, scheduler, worker, persistence, or UI behavior.

## Future Dependencies

```text
Historical Memory
  -> Pattern Runtime
  -> Learning Runtime
  -> Confidence Calibration
  -> Playbook Runtime
```

Future calibration and Playbook systems may consume validated Learning records.
They must not rewrite Learning conclusions, Pattern evidence, or Historical
Memory facts through this module.
