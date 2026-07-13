# Consistency Temporal Alignment

## Boundary

D4 temporal alignment maps exact immutable canonical Fact versions into a bounded, immutable alignment outcome. It does not create Facts, aggregate values, fill gaps, produce Consistency Results, assemble Evidence, or publish consumer projections.

The runtime is explicit and stateless. A caller supplies a certified Run specification, a versioned temporal policy, exact Fact references, Event-Time bounds, and Knowledge-Time mode. Shared or mutable registries are not used.

## Approved Modes

| Mode | Selection rule |
|---|---|
| `EXACT_TIMESTAMP` | Exact governed timestamp equality; no rounding or truncation |
| `WINDOW_CONTAINMENT` | Point or interval containment using the policy boundary rule |
| `NEAREST_PRIOR` | Latest eligible event at or before the target within the governed gap |
| `NEAREST_OBSERVATION` | Prior-only or bidirectional according to policy; historical no-lookahead remains authoritative |
| `INTERVAL_OVERLAP` | Deterministic interval intersection with bounded overlap diagnostics |
| `AS_OF` | Latest eligible observation not later than the target |
| `EVENT_TO_WINDOW` | Maps irregular events to a bounded window without synthesizing cadence |

`NEAREST_PRIOR` is the approved contract name for nearest-prior-event, and `AS_OF` is the approved contract name for as-of-join.

## Identity

Alignment identity is a canonical checksum over the mode, full policy and versions, exact Fact references and versions, input roles, explicit unavailable inputs, Event-Time window, Knowledge-Time mode and cutoff, and immutable Run identity/checksum. Input order is normalized. Worker identity, attempt identity, evaluation duration, creation timestamp, and diagnostic prose are excluded.

A changed Fact version, policy version, mode, cutoff, unavailable-input classification, or Run binding creates a different identity. Repeated equivalent requests create the same identity and outcome checksum.

## Selection Integrity

- UTC timestamps are required and parsed without implicit timezone conversion.
- Exact available inputs must reproduce the Run input-set identity.
- Publication state eligibility is explicit.
- Missing, unsupported, inapplicable, invalid, and future-knowledge inputs remain distinct.
- Corrections are selected by exact immutable record version under the Knowledge-Time mode.
- Tie-breaking and admissible gaps come from the supplied policy.
- Forward-fill and interpolation are contractually false and rejected by the runtime.
- Resolution and cadence compatibility can authorize a mapping only through an explicit aggregation-policy reference. No mapping performs aggregation in Part 04.

## Outcomes

An outcome retains selected and rejected references, structured reason codes, policy bindings, Event-Time and Knowledge-Time bounds, no-lookahead decisions, temporal and knowledge offsets, overlap diagnostics, deterministic identity, checksum, and Run binding. Outcomes are immutable values in Part 04 and are not persisted as final Consistency Results.

## Reconciliation

Read-only reconciliation verifies outcome checksum, Run identity/checksum, policy identity/version, exact selected references, and no-lookahead eligibility. Mismatches fail verification; no repair is attempted.

## Persistence

No PostgreSQL schema change is required for this bounded runtime. Durable alignment records, duplicate/conflict transaction semantics, and database race certification remain deferred until an approved Part requires authoritative alignment persistence.
