# Context Snapshot Runtime Foundation

This directory implements the pure immutable Context Snapshot runtime defined
by `docs/project/context-snapshot-architecture.md`. It freezes caller-supplied,
source-backed market evidence at the Signal creation boundary.

It does not fetch evidence, generate Signals, persist records, evaluate market
behavior, create Outcomes, write Historical Memory, or produce Knowledge.

## Runtime Purpose

Signal Snapshot owns Signal identity and metadata. Context Snapshot owns only
the evidence available when that Signal was created. The deterministic
`contextSnapshotId` is derived from `signalId + snapshotVersion`; no clock,
random value, provider ID, or storage identity participates.
Each record also retains the immutable sibling `signalSnapshotId` for factual
lineage; that reference does not alter Context Snapshot identity.

The nine canonical evidence categories are:

```text
MARKET, DERIVATIVES, ETF, MACRO, PREDICTION,
SECTOR, NEWS, RESEARCH, EXCHANGE
```

Each item preserves category, source ID, source observation time, canonical
freshness, availability, opaque JSON payload, and an unavailable reason when
needed. The runtime has no provider-specific branches and does not inspect the
meaning of payload fields.

## Immutability and Lifecycle

The lifecycle is forward-only:

```text
CREATED -> FINALIZED -> ARCHIVED
```

Evidence assembly may merge only two `CREATED` records with the same identity
and capture time. Merge is append-only: every existing evidence item must be
present unchanged in the incoming record. `FINALIZED` and `ARCHIVED` records
cannot merge or reopen.

Public constructors, lifecycle operations, merge, and deserialization return
deeply frozen records. Duplicate identities and duplicate source/category
pairs are structured validation failures.

## Evidence Philosophy

Available evidence requires a source ID, trusted observation timestamp,
canonical non-unavailable freshness, and JSON-safe payload. Unavailable
evidence has a null payload and explicit reason. Missing timestamps are never
replaced by capture or process time. The runtime never infers confidence,
macro state, funding, news, predictions, regimes, or any other evidence.

## Historical Memory Relationship

Context Snapshot is an upstream factual sibling of Signal Snapshot. Future
Outcome and Historical Memory integrations may retain its immutable reference,
but neither may rewrite or reconstruct it. This sprint does not modify
Historical Memory or its references.

## Modules

* `types.ts`: canonical evidence, snapshot, lifecycle, query, and result types.
* `identity.ts`: deterministic Signal/version identity.
* `evidence.ts`: category, availability, payload, and evidence validation.
* `contextSnapshot.ts`: creation, evidence hashing, ordering, and deep freezing.
* `validation.ts`: complete snapshot, timestamp, duplicate, and identity validation.
* `lifecycle.ts`: forward-only lifecycle transitions.
* `merge.ts`: append-only `CREATED` evidence assembly.
* `serialize.ts`: safe, non-throwing JSON round trips.
* `query.ts`: validated query contracts only; no search implementation.
* `index.ts`: public runtime exports.

## SignalCapture Integration

The P5-26 Local Runner SignalCapture handler supplies already-present approved
evidence, fills absent categories with explicit unavailable items, finalizes
once, and persists through Repository. The runtime itself still performs no
collection and has no handler or persistence dependency. Historical Memory is
not integrated with Context Snapshot in this sprint.

## Intentionally Not Implemented

No source client, API, UI, Historical Memory integration, Pattern, Learning,
Calibration, Playbook, AI, or automatic evidence collection is implemented
inside this runtime.
