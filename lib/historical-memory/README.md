# Historical Memory Runtime Foundation

This directory implements the pure runtime boundary that accepts one immutable
Outcome Event and exposes one canonical immutable Historical Memory record for
future storage and learning systems.

It does not persist, schedule, index, search, learn, extract patterns, generate
playbooks, call APIs, or modify product runtime behavior.

## Runtime Components

* `types.ts`: memory, identity, reference, lifecycle, result, validation, and
  query contracts.
* `identity.ts`: deterministic one-Outcome-Event memory identity.
* `memory.ts`: memory creation and deep immutability.
* `lifecycle.ts`: strict forward-only lifecycle transitions.
* `validation.ts`: Outcome Event, identity, lifecycle, timestamp, reference,
  and duplicate validation.
* `serialize.ts`: safe non-throwing JSON round trips.
* `merge.ts`: deterministic monotonic lifecycle and append-only reference merge.
* `query.ts`: validated query structures only; no search implementation.
* `index.ts`: public exports.

## Purpose and Ownership

Historical Memory owns the canonical runtime representation of accepted
recorded history. A record embeds the complete validated Outcome Event without
reinterpretation. It is a historical fact boundary, not knowledge.

Historical Memory does not own:

* Signal generation, Tracking, Evaluation, or Outcome calculation;
* event recording or Outcome mutation;
* persistence, retention, physical indexing, or search;
* Learning, Pattern, or Playbook extraction;
* AI summaries, confidence, recommendations, or similarity.

## Identity

Exactly one Historical Memory identity exists per Outcome Event:

```text
Outcome Event -> memoryId
```

`memoryId` is deterministically encoded from `eventId`. The identity also
preserves `eventId` and `outcomeId`. Callers may provide a read-only set of
existing memory IDs; duplicates return `duplicate_memory_identity`. No registry
or hidden mutable state exists in this runtime.

## Lifecycle

The only allowed path is:

```text
CREATED -> VERIFIED -> INDEXED -> ARCHIVED
```

Lifecycle operations create a new deeply frozen record. Repeated, backward,
skipped, and post-archive transitions are rejected. `INDEXED` declares runtime
readiness only; this sprint implements no storage or indexing engine.

## Immutable Facts and References

The Outcome Event, identity, and `createdAt` are canonical immutable facts.
`createdAt` is caller supplied, must not precede the event's `recordedAt`, and
is never derived from an ambient clock.

Every record contains an `OUTCOME_EVENT` reference to its source event.
Additional `EVIDENCE`, `REPLAY`, or `CONTEXT` references may be supplied only as
existing IDs. Merge may extend this reference set and monotonically reconcile
lifecycle state. It cannot replace the Outcome Event, identity, or creation
time. Reference union is deterministic and duplicate-free.

## Query Model

The runtime defines validated query fields for:

* symbol;
* timeframe;
* direction;
* evaluation window;
* outcome status;
* inclusive evaluation-boundary date range.

Queries are immutable descriptions only. There is no filtering, searching,
database query, index lookup, similarity search, embedding, or vector store.

## Validation and Serialization

Historical Memory accepts only a complete valid Outcome Event. Raw Signal
Snapshots, raw Evaluation Results, and other payloads fail Outcome Event
validation. Structured errors cover duplicate identity, invalid Outcome
references, invalid lifecycle, malformed references, invalid timestamps,
immutable fact conflicts, malformed JSON, and unsupported schema versions.

Serialization validates before JSON output. Deserialization validates the full
record, optionally applies caller-owned dedupe state, and returns a deeply
frozen lossless result. Neither operation reads or writes storage.

## No-Fabrication Rules

Historical Memory stores only immutable recorded history. It must never
generate AI summaries, pattern labels, confidence, playbooks, recommendations,
similarity, metrics, source timestamps, or replacement values for unavailable
facts.

## Relationship and Future Dependencies

```text
Signal Outcome
  -> Outcome Recorder
  -> Historical Memory
  -> Learning Runtime (future)
  -> Pattern Runtime (future)
  -> Playbook Runtime (future)
```

Historical Memory is the canonical source of historical experience. A future
persistence adapter may store validated records, and a future Learning Runtime
may consume verified or indexed records. Neither may rewrite the canonical
Outcome Event facts through this module.
