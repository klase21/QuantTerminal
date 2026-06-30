# Playbook Runtime Foundation

This directory implements the immutable versioned operational-knowledge layer
above validated Learning and Confidence Calibration. It validates human-authored
Playbook rules without generating text, calculating confidence, executing
trades, calling APIs, or persisting records.

## Runtime Components

* `types.ts`: Playbook, identity, scope, evidence, rule, lifecycle, result,
  validation, decision, and query contracts.
* `identity.ts`: deterministic version/scope/Learning-set/Calibration-set identity.
* `playbook.ts`: creation from validated Knowledge Layer inputs and deep freezing.
* `evidence.ts`: strict validated Learning-or-Calibration evidence handling.
* `lifecycle.ts`: forward-only transitions with an explicit reviewer boundary.
* `validation.ts`: identity, scope, evidence, rule, reviewer, timestamp, and
  lifecycle validation.
* `serialize.ts`: safe non-throwing JSON round trips.
* `merge.ts`: deterministic lifecycle reconciliation and versioned evidence growth.
* `query.ts`: immutable validated query descriptions only.
* `index.ts`: public exports.

## Purpose and Ownership

Playbook Runtime owns only the structure and lifecycle of versioned operational
knowledge. It does not own Historical facts, Pattern interpretation, Learning
conclusions, Calibration outputs, execution behavior, or broker actions.

Rules are inert text structures. `entryConditions`, `exitConditions`, and other
condition fields are not commands, orders, triggers, recommendations, or an
execution plan. No consumer may treat this module as authority to trade.

## Facts and Knowledge Boundary

```text
Historical Memory = immutable facts
Pattern Runtime = evidence-backed interpretation
Learning Runtime = versioned conclusion
Confidence Calibration = versioned trust interpretation
Playbook Runtime = versioned operational knowledge
```

Playbook accepts only complete records whose upstream status is `VALIDATED`:

* Learning records;
* Confidence Calibration records.

Signal Snapshots, Signal Evaluations, Signal Outcomes, Outcome Events,
Historical Memory, and Pattern records are forbidden as direct evidence.
Embedding complete validated upstream records keeps provenance immutable and
prevents loose IDs from masquerading as approved knowledge.

## Identity and Versioning

Identity includes `playbookId`, positive integer `playbookVersion`, canonical
scope, `learningSetHash`, and `calibrationSetHash`. The hashes are deterministic
identity checksums, not confidence or similarity scores.

Changing rules, scope, or evidence requires a new version. A higher version may
append evidence only when every prior Learning and Calibration reference is
retained. Same-version merge may reconcile lifecycle only and cannot rewrite
rules or evidence. Rejected Playbooks require a new version before approval.

## Rule Contract

Every rule requires human-authored title, summary, applicable, entry, exit,
risk, invalidation, and failure conditions plus supporting Learning and
Calibration IDs. Supporting IDs must exist in the Playbook evidence, and every
evidence record must support at least one rule.

The runtime checks structure and provenance only. It never creates, rewrites,
prioritizes, scores, or interprets rule text.

## Lifecycle and Human Approval

Allowed transitions are:

```text
DRAFT -> CANDIDATE -> APPROVED -> SUPERSEDED -> ARCHIVED
                   -> REJECTED -> SUPERSEDED -> ARCHIVED

APPROVED -> ARCHIVED
REJECTED -> ARCHIVED
```

Approval and rejection require a caller-supplied reviewer identifier and
decision timestamp. The runtime reads no user session and no ambient clock; it
validates metadata but cannot authenticate whether a reviewer is human. That
authentication and authorization boundary belongs to a future governed system.

Decision metadata is immutable after approval or rejection. Supersession does
not rewrite the prior record; it marks the old version through a new frozen
lifecycle object. Superseded records may only be archived.

## Query Model

`PlaybookQuery` supports symbol, timeframe, direction, status, Learning ID,
Calibration ID, minimum sample size, and date range. Query helpers validate and
freeze descriptions only. They do not search, filter, rank, score, or access
storage.

## No-Fabrication and Exclusions

Playbook Runtime never generates AI narratives, operational text, execution
instructions, trade recommendations, broker actions, confidence values, scores,
predictions, similarity, embeddings, rules, or evidence. It contains no AI,
automatic generation, execution, API, persistence, scheduler, worker, database,
vector store, learning engine, or UI behavior.

## Future Dependencies

```text
Historical Memory
  -> Pattern Runtime
  -> Learning Runtime
  -> Confidence Calibration
  -> Playbook Runtime
  -> Execution Layer (future)
```

Playbook never executes trades. A future execution layer may inspect an
`APPROVED` Playbook only under a separately governed contract and must not infer
authorization from the existence of this runtime record alone.
