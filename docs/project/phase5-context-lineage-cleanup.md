# Phase 5 Context Lineage and Conflict Cleanup

**Project:** Theta  
**Phase:** 5  
**Sprint:** P5-27F  
**Scope:** P5-27 certification defects only  
**Decision:** **CLEANUP COMPLETE**

## 1. Purpose

P5-27 found two objective defects in the local context-aware
Signal-to-Memory pipeline:

1. Context Snapshot identity stopped after SignalCapture and Outcome used the
   Signal Snapshot ID as a substitute context reference.
2. A repeated Context identity with different immutable evidence was accepted
   as an ordinary duplicate rather than surfaced as a conflict.

This sprint fixes only those defects. It adds no evidence, provider, handler,
API, UI, Knowledge execution, or product capability.

## 2. Context Lineage Fix

Local Runner now retains each finalized Context Snapshot in same-run state,
keyed by its sibling Signal Snapshot ID. Intermediate handlers do not receive
or inspect evidence. The identity remains available alongside the ordered
pipeline until OutcomeRecording resolves it.

OutcomeRecording resolves Context identity in this order:

1. matching same-run finalized Context Snapshot;
2. explicit runtime-valid Context Snapshot metadata;
3. persisted `CONTEXT_SNAPSHOT`, using an explicit record ID or the
   deterministic `signalId + snapshotVersion` identity.

Resolved context must be `FINALIZED` and match both `signalId` and
`signalSnapshotId`. Outcome receives:

```text
AVAILABLE -> actual contextSnapshotId
UNAVAILABLE -> null referenceId plus explicit reason
```

Signal Snapshot ID is never substituted for missing Context identity.

## 3. Outcome and Event Lineage

Signal Outcome now preserves both factual identities:

* Signal Snapshot through `identity.snapshotId` and Repository parent lineage;
* Context Snapshot through `snapshotReferences.contextReference` when available.

The Outcome Event embeds the corrected immutable Signal Outcome unchanged.
Repository maps Signal Outcome parents to:

```text
SIGNAL_SNAPSHOT
CONTEXT_SNAPSHOT (when available)
SIGNAL_TRACKING
SIGNAL_EVALUATION
```

No Context evidence is copied, interpreted, or modified.

## 4. Historical Memory Lineage

HistoricalMemoryWrite reads the Context reference already embedded in the
Outcome Event. When available, it supplies the existing ID as a canonical
Historical Memory `CONTEXT` reference.

Repository maps Historical Memory parents to:

```text
SIGNAL_SNAPSHOT
CONTEXT_SNAPSHOT (when available)
SIGNAL_EVALUATION
OUTCOME_EVENT
```

The Outcome Event remains the immutable memory payload. Parent metadata and
the Context reference provide traceability only; they do not change facts.

## 5. Conflict Handling Fix

Context persistence remains Repository-only. No adapter was changed.

When Context write returns `DUPLICATE`, SignalCapture now:

1. reads the existing `CONTEXT_SNAPSHOT` through Repository;
2. validates it with Context Snapshot Runtime;
3. safely serializes existing and incoming immutable records;
4. compares canonical content.

Outcomes:

| Condition | Result | Mutation |
| --- | --- | --- |
| Same identity and identical content | Idempotent duplicate accepted | None |
| Same identity and different evidence/content | Local Runner `CONFLICT` with `CONTEXT_SNAPSHOT_CONFLICT` | None |
| Existing record unavailable or malformed | Fail closed as conflict | None |

The existing SQLite or Postgres record is never overwritten. Local Runner now
includes `CONFLICT` in its structured result vocabulary.

## 6. Files Changed

Runtime orchestration and handlers:

* `workers/local-runner/types.ts`
* `workers/local-runner/dispatch.ts`
* `workers/local-runner/runner.ts`
* `workers/local-runner/signalCapture.ts`
* `workers/local-runner/outcomeRecording.ts`
* `workers/local-runner/historicalMemoryWrite.ts`
* `workers/local-runner/README.md`

Repository metadata mapping:

* `lib/persistence/repository/mapper.ts`
* `lib/persistence/repository/README.md`

Documentation:

* `docs/project/phase5-context-lineage-cleanup.md`

No package, adapter, API, page, source client, or Knowledge runtime was changed.

## 7. No-Fabrication and Ownership

* Missing Context remains explicitly unavailable.
* No evidence is inferred or generated.
* No source metadata or freshness is synthesized.
* Tracking, EvaluationWindow, PriceObservation, and SignalEvaluation do not
  read or modify Context evidence.
* Outcome and Historical Memory consume identity references only.
* No Pattern, Learning, Calibration, or Playbook handler was activated.
* No provider or fetch path was added.

## 8. Validation Summary

| Check | Result |
| --- | --- |
| TypeScript `npx.cmd tsc --noEmit --pretty false --incremental false` | PASS |
| Context-aware seven-stage dry run | PASS |
| SQLite seven-stage chain | PASS |
| Actual Context ID in Signal Outcome | PASS |
| Actual Context ID embedded in Outcome Event | PASS |
| Historical Memory `CONTEXT` reference | PASS |
| Memory parents: Signal Snapshot, Context Snapshot, Evaluation, Event | PASS |
| Identical duplicate | PASS; one factual record each, no overwrite |
| Conflicting duplicate | PASS; `CONFLICT`, no overwrite |
| Prohibited provider/fetch/direct-adapter/Knowledge scan | PASS |

Focused source-dependent validation used real, source-timestamped Binance
Futures data. No mock or fabricated market value was introduced.

## 9. Remaining Limitations

The cleanup does not change existing Phase 5 limitations:

* Local Runner only;
* no external or Vercel Cron integration;
* no production Worker Pool;
* no live Neon requirement for this local validation;
* no API or UI;
* no Pattern, Learning, Calibration, or Playbook execution;
* Context evidence remains limited to approved metadata available at Signal creation;
* Price Observation remains limited to the approved implemented source path.

These limitations are outside the two P5-27 defects.

## 10. Decision

**CLEANUP COMPLETE**

Context identity is now traceable from Signal capture through Outcome Event and
Historical Memory, unavailable context remains explicit, and immutable Context
conflicts fail closed without overwriting durable facts.
