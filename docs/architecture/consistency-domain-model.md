# Consistency Domain Model

## Purpose

D4 consistency evaluates bounded relationships among immutable D2 fact versions. It never selects truth, overwrites facts, infers missing values, or establishes causality.

## Core Contracts

**Consistency Rule.** A versioned, policy-bound test over declared input roles. Categories include temporal and identity alignment, provider and dataset agreement, value-domain, cadence, resolution, direction, magnitude, publication state, and correction state. Numeric tolerances and admissible gaps must come from approved immutable policy; Phase 0 defines none.

**Consistency Run.** One immutable execution envelope for a versioned rule set over a bounded subject and time window. It records run identity, rule-set identity/version, dataset and subject scope, ordered fact-version inputs, policy version, event window, knowledge cutoff, times, terminal outcome, and retry classification.

**Consistency Input Reference.** Includes canonical record ID, positive record version, physical fact identity, checksum, dataset, provider snapshot, effective and observed times, publication state, registry/policy/schema/normalization versions, and lineage node. It never resolves dynamically to latest.

**Consistency Result.** One append-only result for one rule and ordered input set. Proposed outcomes are CONSISTENT, INCONSISTENT, PARTIAL, INDETERMINATE, NOT_APPLICABLE, BLOCKED_MISSING_INPUT, BLOCKED_INVALID_INPUT, and BLOCKED_SUPERSEDED_INPUT. Phase 1 must reconcile names with D1 vocabulary.

**Severity.** Rule logic reports outcome; immutable policy assigns blocking or advisory effect for an Evidence Profile. Consumers cannot reinterpret severity.

~~~mermaid
flowchart LR
  RS["Rule Set + Version"] --> R["Consistency Run"]
  P["Policy Version"] --> R
  F["Exact Canonical Fact Versions"] --> I["Ordered Inputs"]
  I --> R
  R --> X["Immutable Results"]
  X --> C["Evidence Candidate"]
~~~

## Temporal Alignment

All times are UTC. Rules declare effective-time and observed-time semantics separately. Historical selection applies a knowledge cutoff before alignment.

| Method | Permitted use | Required governance |
|---|---|---|
| Exact match | Same-cadence facts | Timestamp definition and tie policy |
| Window containment | Event or point in an interval | Boundary inclusivity |
| Nearest prior | Last known event | Maximum gap; never future |
| Nearest observation | Symmetric comparison only when future knowledge is allowed | Gap and tie policy |
| Interval overlap | Window facts | Minimum overlap |
| As-of join | State known at cutoff | Maximum age and no-lookahead |
| Event-to-window | Irregular events | Event/window boundary policy |

Daylight-saving time is not an alignment input. Provider-local timestamps are normalized before D2 persistence.

## Resolution and Cadence

Resampling is never implicit. Aggregation and forward-fill are dataset-specific and versioned. Interpolation is prohibited initially. Event datasets remain events, missing intervals remain missing, and derived windows reference exact inputs.

Initial D4 reads published D2 facts and already governed projections only. It may select evidence-specific bounded windows but cannot create shadow facts.

## Disagreement

Provider certification controls eligibility, not truth. Comparison Results retain both provider identities, exact versions, diagnostics, temporal offset, rule/policy versions, outcome, effect, and explanation code. No consensus number is produced without policy.

Cross-dataset coexistence may be factual, directional, structural, contextual, or hypothesis consistency. It never proves causality.

## Corrections and Runtime

A corrected fact triggers a new Run and Results. Prior Results remain immutable and queryable; an invalidation event may mark them non-current.

The runtime may load bounded eligible facts, align windows, execute deterministic rules, persist Results, and emit recomputation events. It may not mutate facts, assemble/publish packets, generate actions, or query consumers.

Recommended execution is hybrid: event-driven scheduling plus bounded recovery batches outside Vercel requests.
