# Signal Outcome Recorder Runtime

This directory implements the pure recorder boundary between an immutable
Signal Outcome and a future Historical Memory store. It validates one finalized
Signal Outcome and publishes one canonical immutable Outcome Event.

It does not persist, schedule, evaluate, learn, call APIs, or modify product
runtime behavior.

## Runtime Components

* `types.ts`: versioned event, identity, payload, status, source, validation,
  and recorder result contracts.
* `identity.ts`: deterministic event identity for one Outcome and event version.
* `event.ts`: deep freezing for an event and its embedded Signal Outcome.
* `recorder.ts`: pure event creation and recording entry points.
* `validation.ts`: complete Outcome, event, identity, timestamp, status, payload,
  and duplicate validation.
* `serialize.ts`: safe, non-throwing JSON round trips.
* `dedupe.ts`: caller-owned identity-set and collection duplicate checks.
* `index.ts`: public exports.

## Purpose and Ownership

The recorder owns only conversion of a validated immutable fact into a
versioned publication event. `recordSignalOutcome()` accepts only a
`FINALIZED` Signal Outcome whose learning status is still `pending`.

The recorder does not own:

* Signal generation, Tracking, or Evaluation;
* Outcome calculation or lifecycle progression;
* storage, retention, indexing, or Historical Memory;
* Learning, Pattern, or Playbook extraction;
* AI narratives, summaries, calibration, or recommendations.

## Event Contract

The first and only supported event version is `OUTCOME_EVENT_V1`. An event has
status `RECORDED`, source `SIGNAL_OUTCOME`, a caller-supplied `recordedAt`, and
the complete validated Signal Outcome as its immutable payload.

The payload is copied without reinterpretation. All Signal Outcome identity,
timing, signal, evaluation, performance, unavailable states, and snapshot
references are preserved.

## Deterministic Identity and Dedupe

Exactly one Outcome Event identity exists per:

```text
outcomeId * eventVersion
```

`eventId` is deterministically encoded from those values. Callers may provide a
read-only set of existing event IDs. A matching identity returns
`duplicate_event`; the existing event and the supplied set are never mutated.
There is no in-memory registry or hidden dedupe state.

## Time and Version Rules

`recordedAt` is supplied by the caller and must be a valid timestamp at or
after the Signal Outcome evaluation boundary. The recorder reads no ambient
clock and invents no timestamp.

Event version, event identity, status, source, payload, and recording time are
immutable. A future version creates a distinct deterministic identity; this
runtime supports only `OUTCOME_EVENT_V1`.

## Validation and Serialization

All operations return structured success or failure results and do not throw.
Validation rejects missing Outcome or Signal references, invalid Outcome state,
invalid event versions, malformed timestamps, invalid status/source, duplicate
identity, malformed payload, and unsupported schema versions.

Serialization validates before writing JSON. Deserialization validates the
complete event, may apply caller-supplied dedupe state, and returns a deeply
frozen event without loss.

## No-Fabrication Rules

The recorder records only immutable facts already present in Signal Outcome. It
must never generate learning, patterns, summaries, AI narratives, confidence
calibration, playbooks, recommendations, prices, metrics, or unavailable
replacement values.

## Relationship and Future Boundary

```text
Signal Outcome
  -> Outcome Recorder
  -> Outcome Event
  -> Historical Memory
  -> Learning
```

The recorder does not store events. A future Historical Memory adapter may
persist validated Outcome Events and supply existing identity sets for dedupe.
That adapter must not mutate the event contract or trigger learning inside the
recorder.
