# Context Snapshot Architecture

**Project:** Theta  
**Phase:** 5  
**Sprint:** P5-24  
**Scope:** Architecture only  
**Decision:** **CONTEXT SNAPSHOT ARCHITECTURE APPROVED**

## 1. Purpose

Context Snapshot preserves the complete source-backed market evidence that was
available to QuantTerminal at the exact moment a Signal was created. It gives
future Pattern Discovery, Learning, Confidence Calibration, and Playbook
systems a stable answer to:

```text
What did QuantTerminal factually know when this Signal was emitted?
```

Without this boundary, downstream systems could accidentally evaluate an old
Signal against evidence fetched later, reconstruct missing context with
hindsight, or mistake current market state for signal-time state. Context
Snapshot prevents that leakage by freezing evidence once, before Tracking
starts.

Context Snapshot is a Facts Layer record. It is not analysis, interpretation,
confidence, a recommendation, a regime label, or a Knowledge Layer output.

### Record distinctions

| Record | Canonical question | Owns | Does not own |
| --- | --- | --- | --- |
| Signal Snapshot | What Signal was emitted? | Signal identity, emission metadata, symbol, exchange, timeframe, direction, and source-owned signal fields | Broader market evidence, later observations, evaluation, outcomes |
| Context Snapshot | What market evidence was available at emission? | Immutable source-backed evidence and explicit unavailable states at signal creation | Signal identity semantics, later market behavior, interpretation, learning |
| Price Observation | What factual price state was observed at an evaluation boundary? | Post-signal source observations for one tracking window | Signal-time context, evaluation metrics, outcomes |
| Outcome | What did the completed evaluation establish? | Canonical realized Signal Evaluation result and immutable references | Signal generation, evidence reconstruction, memory, learning |
| Historical Memory | What immutable factual history was recorded? | Durable canonical representation of accepted Outcome Events | Rewriting Signal, Context, Observation, Outcome, or creating knowledge |

Signal Snapshot and Context Snapshot are siblings linked by immutable identity.
Neither is a substitute for the other.

## 2. Capture Timing

Context Snapshot is captured exactly once:

```text
Signal created
  -> Context Snapshot captured and frozen
  -> Signal Snapshot and Context Snapshot identities linked
  -> Tracking starts
```

The capture boundary is the Signal creation timestamp. Context capture must
use evidence already available at that boundary. It must not delay Signal
identity, block indefinitely while waiting for completeness, or fetch future
evidence after emission and label it as signal-time context.

Rules:

* `capturedAt` must equal the canonical Signal creation time.
* Evidence `observedAt` may precede or equal `capturedAt`; it must never follow it.
* Context Snapshot is frozen before Tracking initialization is accepted.
* Capture happens once per Signal Snapshot.
* Missing, late, stale-beyond-policy, invalid, or blocked evidence is recorded as unavailable.
* A later source response cannot patch the snapshot.
* A later freshness change cannot rewrite the snapshot.
* A later schema version cannot regenerate an old snapshot.
* Tracking, Evaluation, Outcome, and Learning cannot request recomputation of signal-time context.

The system prefers an explicit incomplete snapshot over a delayed or
historically reconstructed snapshot.

## 3. Ownership

### Signal Snapshot

Signal Snapshot owns:

* signal identity;
* snapshot identity;
* signal creation time;
* source page and signal provenance;
* symbol, exchange, timeframe, and direction when source-owned;
* signal reason, opportunity metadata, and source-backed confidence when present.

Signal Snapshot does not absorb broader evidence merely because that evidence
influenced the signal.

### Context Snapshot

Context Snapshot owns:

* the immutable evidence set visible at Signal creation;
* evidence category assignment;
* source identity and observation timestamp per item;
* capture-time freshness and availability per item;
* source-backed evidence payloads without reinterpretation;
* explicit reasons for unavailable evidence.

Context Snapshot does not own Signal generation, scoring, prioritization,
evaluation, outcome classification, or knowledge extraction.

### Historical Memory

Historical Memory owns factual historical records and references after an
Outcome Event is recorded. It may retain references to Signal and Context
Snapshots, but it cannot rewrite either record.

### Learning

Learning owns versioned conclusions derived from governed Pattern evidence. It
may consume Context Snapshot only through the approved factual lineage. It
cannot modify the snapshot, fill unavailable evidence, or relabel hindsight as
signal-time knowledge.

Transport and persistence do not transfer ownership.

## 4. Canonical Snapshot Contract

The architecture requires a versioned immutable envelope. This is an
information contract, not a runtime or storage implementation.

```ts
type ContextEvidenceAvailability = "AVAILABLE" | "UNAVAILABLE"

type ContextEvidenceFreshness =
  | "LIVE"
  | "CURRENT"
  | "STALE"
  | "EXPIRED"
  | "UNAVAILABLE"

type ContextEvidenceCategory =
  | "MARKET"
  | "DERIVATIVES"
  | "ETF"
  | "MACRO"
  | "PREDICTION"
  | "SECTOR"
  | "NEWS"
  | "RESEARCH"
  | "EXCHANGE"

interface ContextEvidenceItem {
  evidenceId: string
  category: ContextEvidenceCategory
  sourceId: string | null
  observedAt: string | null
  freshness: ContextEvidenceFreshness
  availability: ContextEvidenceAvailability
  payload: unknown | null
  unavailableReason: string | null
}

interface ContextSnapshot {
  schemaVersion: number
  contextSnapshotId: string
  signalId: string
  signalSnapshotId: string
  capturedAt: string
  evidenceSetHash: string
  evidence: readonly ContextEvidenceItem[]
}
```

### Identity

* One Context Snapshot exists per Signal Snapshot.
* `contextSnapshotId` is deterministic from the immutable Signal Snapshot
  identity and Context Snapshot schema version.
* `evidenceSetHash` is deterministic from the canonical ordered evidence set.
* Repeating capture with identical inputs resolves to the same identity and
  content.
* The same identity with different evidence is an immutable conflict, not an
  update opportunity.
* Random identity, ambient processing time, and storage-provider identity are
  forbidden.

### Versioning

`schemaVersion` versions the Context Snapshot contract. It does not authorize
revision of an existing snapshot. A future schema may govern newly created
Signals, but old snapshots remain readable under their original version or
explicitly incompatible. They are never silently migrated or regenerated.

## 5. Evidence Categories

Categories define evidence ownership and grouping only. They do not define
API routes, providers, fetch behavior, aggregation, interpretation, or scoring.

### Market

May contain source-backed:

* price;
* volatility;
* liquidity;
* orderbook imbalance.

### Derivatives

May contain source-backed:

* funding;
* open interest;
* liquidations.

### ETF

May contain source-backed ETF or capital flows.

### Macro

May contain source-backed:

* macro state observations;
* dollar observations;
* rates observations;
* volatility observations.

The category stores observations, not an inferred macro regime.

### Prediction

May contain source-backed prediction-market probabilities and their observed
market state.

### Sector

May contain source-backed sector rotation observations.

### News

May contain approved source-backed news evidence available before or at Signal
creation.

### Research

May contain approved immutable Research evidence or references already
available at Signal creation. It does not generate or reconstruct Research.

### Exchange

May contain source-backed exchange reserve state.

Category presence does not imply data availability. Every expected category
may contain one or more available items, explicit unavailable items, or no
item when the category is outside the Signal's governed capture profile. A
future capture policy must define expected items without inventing payloads.

## 6. Evidence Rules

Every evidence item carries:

* `sourceId`: canonical registered source identity when known;
* `observedAt`: trusted source observation timestamp;
* `freshness`: canonical capture-time freshness status;
* `availability`: `AVAILABLE` or `UNAVAILABLE`;
* `payload`: opaque source-backed evidence when available;
* `unavailableReason`: explicit reason when unavailable.

### Available evidence

An `AVAILABLE` item requires:

* a registered production-approved `sourceId`;
* a trusted `observedAt` no later than `capturedAt`;
* canonical freshness derived from that timestamp and capture policy;
* a source-backed payload;
* `unavailableReason = null`.

Availability does not mean current. An available item may be `STALE` or
`EXPIRED` when policy permits preservation for historical truth. Consumers
must not promote it to `CURRENT`.

### Unavailable evidence

An `UNAVAILABLE` item requires:

* `availability = UNAVAILABLE`;
* `freshness = UNAVAILABLE` unless a trusted timestamp supports a more precise
  historical freshness state;
* `payload = null`;
* an explicit `unavailableReason`;
* `sourceId = null` only when no canonical expected source identity exists;
* `observedAt = null` when no trusted observation timestamp exists.

Neither `capturedAt` nor retrieval time may replace a missing `observedAt`.
Zero, empty objects, neutral labels, and placeholder strings must not replace
unavailable payloads.

### Payload boundary

Evidence payload is opaque factual source content or an immutable reference to
such content. Context Snapshot does not normalize facts into conclusions,
combine conflicting sources into a verdict, or calculate confidence. Multiple
sources remain distinct evidence items with distinct provenance.

## 7. Snapshot Rules

Context Snapshot is:

* **immutable:** identity, timestamps, evidence, availability, and payloads
  cannot change after creation;
* **deterministic:** identical canonical inputs produce identical identity,
  ordering, and evidence hash;
* **append-only:** durable history may add new Context Snapshot records for new
  Signals, but may never update or replace an existing record;
* **versioned:** every record declares its schema version and remains bound to
  that version;
* **closed at capture:** its evidence set cannot be extended after Signal
  creation;
* **source-governed:** available evidence uses canonical production-approved
  source identity and freshness vocabulary;
* **non-blocking:** missing evidence creates explicit unavailable state rather
  than indefinite capture delay.

Append-only does not mean evidence can be appended to an existing snapshot.
It means the historical collection grows by adding immutable snapshots for
new Signals.

Corrections to a provider's later data do not rewrite the original snapshot.
If a future architecture needs correction events, they must be separately
versioned facts that preserve the original record and are outside this sprint.

## 8. Pipeline Relationship

```text
Signal Snapshot -----+
                     |
Context Snapshot ----+
                     |
                     v
                  Tracking
                     |
                     v
                 Observation
                     |
                     v
                 Evaluation
                     |
                     v
                   Outcome
                     |
                     v
              Historical Memory
```

Relationship rules:

1. Signal Snapshot and Context Snapshot share immutable Signal identity.
2. Tracking cannot begin until both snapshot capture attempts have reached a
   terminal factual state; unavailable evidence is a valid terminal state.
3. Observation records post-signal facts and cannot alter signal-time context.
4. Evaluation consumes observations and Signal identity; it may reference but
   cannot rewrite Context Snapshot.
5. Outcome preserves immutable snapshot references and evaluated facts.
6. Historical Memory records the Outcome Event and its factual lineage.
7. Pattern, Learning, Calibration, and Playbook systems may consume this
   lineage later, but cannot write backward into Facts Layer records.

Context Snapshot must be referenced, not copied and reinterpreted differently
at each downstream stage.

## 9. No-Fabrication Policy

Context Snapshot may contain only source-backed evidence available at or
before Signal creation.

Forbidden:

* generated or backfilled confidence;
* inferred macro state or regime;
* inferred funding or open interest;
* inferred news evidence or sentiment;
* inferred prediction-market probability;
* inferred sector state;
* inferred reserve state;
* reconstructed orderbook or liquidity not available at capture;
* timestamps derived from capture, retrieval, persistence, or processing time
  when the source timestamp is missing;
* evidence fetched later and presented as signal-time evidence;
* aggregation that hides conflicting source observations;
* AI summaries, narratives, recommendations, Pattern labels, Learning
  conclusions, Calibration values, or Playbook rules.

When evidence is absent or untrusted, the correct value is `UNAVAILABLE` with
an explicit reason.

## 10. Failure and Degradation Policy

Context capture must preserve responsiveness:

```text
approved evidence available
  -> record source-backed item

approved evidence unavailable, late, invalid, or untrusted
  -> record explicit unavailable item

snapshot validation fails
  -> reject snapshot creation
  -> do not substitute generated evidence
```

One unavailable category does not invalidate available evidence in other
categories. A complete absence of evidence may still produce a valid Context
Snapshot containing governed unavailable states, provided Signal identity,
capture time, schema version, and unavailable reasons are valid.

Storage failure is not evidence unavailability. Future execution must report
storage failure separately and retry idempotently without recapturing or
recomputing evidence.

## 11. Future Integration Boundaries

Future implementation must preserve these boundaries:

* SignalCapture may coordinate capture but must not generate evidence.
* A Context Snapshot Runtime must validate and freeze caller-supplied evidence;
  it must not fetch sources or interpret payloads.
* A future capture handler may collect approved existing evidence, but must
  close the snapshot at Signal creation and fail unavailable rather than use
  later facts.
* Repository must store the snapshot as an opaque immutable payload with
  deterministic idempotency.
* Historical Memory may retain a Context Snapshot reference but must not embed
  reconstructed context.
* Pattern, Learning, Calibration, and Playbook layers consume only persisted,
  validated factual lineage.

No concrete API, source provider, storage table, handler contract, or runtime
module is selected by this architecture sprint.

## 12. Known Limitations

* Context Snapshot Runtime is not implemented.
* SignalCapture is unchanged and does not create a canonical Context Snapshot.
* Repository has no Context Snapshot record kind or mapper.
* No persistence adapter stores Context Snapshots.
* No capture handler or execution unit is implemented.
* No migration exists for previously captured Signals.
* Historical Memory does not yet reference a canonical Context Snapshot record.
* Capture profiles defining expected evidence items per Signal type are not yet specified.
* No Pattern, Learning, Calibration, or Playbook consumer is connected.
* No API or UI exposes Context Snapshot.

These limitations are explicit. They do not authorize reconstruction or
backfill of historical context.

## 13. Architecture Validation

Architecture consistency review confirms:

* Context Snapshot has one purpose and one capture boundary.
* Signal metadata and market evidence ownership remain separate.
* Signal creation precedes one-time Context freezing, which precedes Tracking.
* Available evidence requires canonical source identity and trusted timestamps.
* Unavailable evidence remains explicit and cannot be inferred.
* Observation, Evaluation, Outcome, and Historical Memory retain their existing ownership.
* Facts Layer records remain immutable and downstream Knowledge remains versioned.
* The Signal-to-Memory pipeline remains one-way.
* Runtime, handlers, Repository, persistence, APIs, UI, and package files are unchanged.
* No TypeScript validation or build is required for this architecture-only sprint.

## 14. Decision

**CONTEXT SNAPSHOT ARCHITECTURE APPROVED**

The architecture establishes a deterministic, immutable, source-governed
signal-time evidence boundary without changing the existing Signal-to-Memory
runtime. It preserves unavailable states, prevents hindsight reconstruction,
and provides a factual foundation for future Pattern Discovery, Learning,
Confidence Calibration, and Playbook work.
