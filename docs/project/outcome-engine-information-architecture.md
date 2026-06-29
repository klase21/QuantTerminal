# Outcome Engine Information Architecture

**Project:** Theta - Data Intelligence Platform  
**Phase:** 4  
**Sprint:** P4-2  
**Status:** Architecture specification  
**Scope:** Outcome journey, information hierarchy, ownership, and state only

## 1. Purpose and Boundary

This document defines how canonical Outcome information moves from a completed
Trade into Historical Memory and downstream knowledge systems. It organizes
realized facts without implementing persistence, storage, learning, AI,
database schemas, or runtime behavior.

The architecture follows the Outcome Engine Constitution:

* Trade owns live execution and monitoring.
* Outcome owns realized facts, outcome status, and execution results after
  close.
* Historical Memory owns durable storage and retrieval.
* Learning, Pattern, and Playbook consume accepted outcomes downstream.
* Research and Replay retain ownership of inherited thesis, evidence, and
  validation references.

No stage may reconstruct missing evidence, infer an execution, or generate a
result to complete the information architecture.

## 2. User Journey

The complete Outcome journey is linear:

```text
Trade Ready
  -> Trade Executed
  -> Monitoring
  -> Outcome Closed
  -> Outcome Recorded
  -> Historical Memory
  -> Learning Queue
  -> Playbook Candidate
```

The journey labels map to the P4-1 constitutional lifecycle as follows:

| P4-2 journey | P4-1 constitutional stage |
| --- | --- |
| Trade Ready | Decision Created |
| Trade Executed | Trade Executed |
| Monitoring | Monitoring |
| Outcome Closed | Completed |
| Outcome Recorded | Outcome Recorded |
| Historical Memory | Historical Memory |
| Learning Queue | Learning |
| Playbook Candidate | Playbook Update handoff |

This mapping changes no constitutional stage and creates no additional branch.

### 2.1 Trade Ready

**Owner:** Trade.

**Entry criteria:**

* a selected Trade decision exists;
* symbol, exchange, timeframe, and direction are explicit;
* available Research, Replay, and Shared Context references retain provenance;
* no execution or outcome is implied.

**Exit criteria:**

* a real execution begins and an observed entry is available;
* the workflow advances to Trade Executed.

A merely prepared plan remains Trade Ready. It cannot skip to Monitoring or
Outcome Closed.

### 2.2 Trade Executed

**Owner:** Trade.

**Entry criteria:**

* a real executed entry exists;
* execution identity is linked to the originating decision;
* entry time, entry price, symbol, exchange, and direction are attributable.

**Exit criteria:**

* the open execution enters active observation;
* the workflow advances to Monitoring.

An intended entry, demo estimate, or hypothetical fill does not satisfy entry
criteria.

### 2.3 Monitoring

**Owner:** Trade.

**Entry criteria:**

* the executed position remains open;
* trusted observations can be associated with the execution identity and
  holding window.

**Exit criteria:**

* a real close event supplies an exit price, close time, and exit reason;
* the monitored window needed for realized performance is complete;
* the workflow advances to Outcome Closed.

Monitoring does not declare success, learning, or a final Outcome.

### 2.4 Outcome Closed

**Owner:** Trade for the close event; Outcome Engine for intake validation.

**Entry criteria:**

* the execution is closed;
* realized entry, exit, close time, PnL basis, and monitored excursion facts are
  available from trusted records;
* the decision and execution identities agree.

**Exit criteria:**

* the Outcome Engine can represent all mandatory realized fields without
  invention;
* unavailable evidence or market snapshots are explicit and attributable;
* the workflow advances to Outcome Recorded.

If mandatory realized facts are missing, the workflow remains closed but not
recorded. No partial canonical Outcome is published.

### 2.5 Outcome Recorded

**Owner:** Outcome Engine.

**Entry criteria:**

* one canonical Outcome object passes identity, realized-fact, timestamp,
  provenance, and no-fabrication checks;
* `learningStatus` begins as `pending`;
* the Outcome is immutable as a realized-fact record.

**Exit criteria:**

* the canonical Outcome is accepted by the Historical Memory boundary;
* the workflow advances to Historical Memory.

Recording normalizes facts. It does not persist them in this sprint and does
not execute learning.

### 2.6 Historical Memory

**Owner:** Historical Memory.

**Entry criteria:**

* a canonical recorded Outcome is accepted unchanged;
* its decision, evidence, context, and source references remain intact;
* schema and provenance are compatible with the receiving historical contract.

**Exit criteria:**

* the Outcome is durably discoverable as historical fact under a future
  persistence implementation;
* it can be referenced by the Learning Queue without mutation;
* the workflow advances to Learning Queue.

Historical Memory owns storage, not interpretation or realized facts.

### 2.7 Learning Queue

**Owner:** Learning.

**Entry criteria:**

* an archived canonical Outcome is available from Historical Memory;
* the learning disposition is still `pending`;
* the record retains sufficient provenance for downstream eligibility review.

**Exit criteria:**

* Learning records `learned` or `rejected` without rewriting the Outcome's
  realized facts;
* any extracted knowledge is separately identifiable;
* an eligible result may advance to Playbook Candidate.

Queue placement is not proof that learning occurred.

### 2.8 Playbook Candidate

**Owner:** Playbook, consuming Pattern output where applicable.

**Entry criteria:**

* downstream Learning and Pattern processes produce an attributable candidate;
* the candidate references one or more immutable Outcome records;
* no Outcome fact has been rewritten.

**Exit criteria:**

* the candidate enters a separately governed playbook review/update process;
* Outcome processing is complete.

A Playbook Candidate is not automatically approved guidance and does not alter
the source Outcome.

## 3. Canonical Information Architecture

The Outcome Engine information hierarchy is:

```text
Outcome Summary
  -> Execution Snapshot
  -> Performance Metrics
  -> Market Context Snapshot
  -> Evidence Snapshot
  -> Replay Reference
  -> Exit Analysis
  -> Learning Status
  -> Navigation & Related Decisions
```

### 3.1 Outcome Summary

**Purpose:** Establish identity, completion, and the realized result at first
read without introducing interpretation.

**Owner:** Outcome Engine.

**Inputs:** Outcome ID, decision ID, created and closed timestamps, symbol,
exchange, timeframe, direction, success, and canonical workflow state.

**Outputs:** Compact canonical Outcome identity and result summary.

**Dependencies:** Valid completed Trade facts and a successful Outcome intake
check. No Research, Replay, Learning, or AI call is permitted to construct the
summary.

### 3.2 Execution Snapshot

**Purpose:** Show the realized execution facts that bound the Outcome.

**Owner:** Trade owns the source facts; Outcome Engine owns their normalized
read-only representation.

**Inputs:** Realized entry, realized exit, execution direction, exchange,
entry/close timestamps, and execution identity.

**Outputs:** Immutable execution snapshot linked to the decision and Outcome.

**Dependencies:** Completed Trade record only. It must not query a broker or
exchange directly, infer fills, or reuse intended plan levels.

### 3.3 Performance Metrics

**Purpose:** Present the realized economic and monitored-window result.

**Owner:** Outcome Engine.

**Inputs:** Realized PnL, PnL percent, holding time, max drawdown, max runup, and
the documented calculation basis supplied with completed execution facts.

**Outputs:** Canonical realized performance block.

**Dependencies:** Trusted execution and monitoring observations. Missing
mandatory performance facts prevent recording; they do not become zero.

### 3.4 Market Context Snapshot

**Purpose:** Preserve source-backed market conditions that existed at decision
or execution time without recomputing them after close.

**Owner:** Original source/page owner for each field; Outcome Engine owns only
the immutable snapshot envelope.

**Inputs:** Macro, sector, funding, OI, and ETF snapshots with source identity,
observation timestamp, availability, and unavailable reason.

**Outputs:** Attributable context snapshot with explicit available or
unavailable state.

**Dependencies:** Shared Context and approved source-backed snapshots. Current
retrieval time cannot replace an absent source timestamp, and later market data
cannot reconstruct the earlier context.

### 3.5 Evidence Snapshot

**Purpose:** Preserve what evidence supported the decision at decision time.

**Owner:** Research owns thesis and evidence; Outcome Engine owns only their
immutable references in the recorded Outcome.

**Inputs:** Research-owned thesis and evidence summary from Shared Context or
immutable artifact references.

**Outputs:** Compact thesis and evidence snapshot with provenance or explicit
unavailable state.

**Dependencies:** Research and Shared Context. Outcome must not generate,
summarize, improve, or infer evidence after observing the result.

### 3.6 Replay Reference

**Purpose:** Link the Outcome to the historical validation context available
before execution.

**Owner:** Replay owns the referenced validation/replay artifact; Outcome
Engine owns only the reference field.

**Inputs:** Existing Replay reference, target, validation availability, and
provenance from Shared Context.

**Outputs:** Read-only Replay reference or explicit `UNAVAILABLE` state.

**Dependencies:** Replay and Shared Context. Outcome must not run Replay,
historical matching, orderbook reconstruction, or validation generation.

### 3.7 Exit Analysis

**Purpose:** State how the trade ended using observed close facts.

**Owner:** Trade owns the close event; Outcome Engine owns normalized
`exitReason`, `invalidationReason`, and factual success representation.

**Inputs:** Close event, exit reason, recorded invalidation reason when
applicable, realized PnL, and the approved realized-success rule.

**Outputs:** Canonical exit classification and result.

**Dependencies:** Completed Trade record. AI-generated explanations,
hypothetical exits, and inferred invalidations are prohibited.

### 3.8 Learning Status

**Purpose:** Expose whether the immutable Outcome is pending, consumed, or
rejected by downstream Learning.

**Owner:** Learning owns disposition changes; Outcome Engine initializes
`pending` and presents the status without interpreting it.

**Inputs:** Canonical learning disposition: `pending`, `learned`, or `rejected`.

**Outputs:** Read-only learning status and Outcome reference for downstream
coordination.

**Dependencies:** Learning only after archival. The Outcome Engine does not
invoke Learning or infer a disposition.

### 3.9 Navigation & Related Decisions

**Purpose:** Provide traceable navigation to the originating decision and
owning product domains without turning Outcome into those workflows.

**Owner:** Outcome Engine for references; each destination retains its own
domain ownership.

**Inputs:** Decision ID, Outcome ID, symbol, Research reference, Replay
reference, related historical Outcome IDs when already supplied, and safe
destination intent.

**Outputs:** Links or references to Decision Journal, Research, Replay,
Historical Memory, and future aggregate Dashboard context.

**Dependencies:** Stable identities and navigation contracts. Navigation must
not trigger learning, persistence, historical reconstruction, or execution.

## 4. Ownership Summary

Outcome owns:

* canonical realized facts;
* the recorded Outcome status;
* normalized completed-execution results;
* immutable evidence, Replay, and market-context references;
* the learning-input handoff.

Outcome must not own:

* live Trade state or execution monitoring;
* Research thesis, evidence, or narrative generation;
* Replay generation, validation, or historical comparison;
* persistence or Historical Memory storage;
* learning eligibility decisions or knowledge extraction;
* pattern generation;
* playbook generation or mutation;
* Dashboard conclusions;
* AI, LLM, prediction, broker, or exchange behavior.

Transport and presentation never transfer ownership. A section may display an
upstream value only with its owner and provenance preserved.

## 5. Canonical Inputs

### Allowed Upstream Dependencies

| Input | Allowed content | Boundary |
| --- | --- | --- |
| Trade | Decision/execution identity, realized entry and exit, timestamps, direction, close reason, monitored performance facts | Outcome does not control or reproduce execution. |
| Replay | Existing validation/replay reference and availability | Outcome does not run Replay or infer validation. |
| Shared Context | Existing symbol, exchange, timeframe, thesis, evidence summary, replay reference, and source-backed context wrappers | Missing or stale context remains explicit. |
| Source-backed market snapshots | Macro, sector, funding, OI, and ETF observations with source identity and timestamp | Later data cannot reconstruct the decision-time snapshot. |

### Prohibited Inputs

* AI- or LLM-generated summaries;
* inferred thesis, evidence, validation, exit, success, or learning;
* reconstructed decision-time data;
* simulated PnL or hypothetical fills;
* mock, fixture, or placeholder source data;
* retrieval time substituted for source observation time;
* Pattern, Learning, or Playbook output used to construct the source Outcome.

## 6. Canonical Outputs and Consumers

| Consumer | Canonical output | Ownership rule |
| --- | --- | --- |
| Historical Memory | Complete immutable canonical Outcome | Stores and retrieves; does not rewrite realized facts. |
| Learning Engine | Archived Outcome reference and learning-input facts | Extracts knowledge; does not mutate the Outcome. |
| Pattern Engine | Learning-owned knowledge linked to Outcome IDs | Consumes Learning output, not Outcome as permission to invent patterns. |
| Playbook Engine | Attributable Pattern/Outcome references for candidate review | Owns playbook candidates and updates, not Outcome facts. |
| Decision Journal | Decision-to-Outcome link and realized result | Provides traceability; does not become Historical Memory. |
| Dashboard | Future aggregate-only, source-backed Outcome summary or artifact reference | Must remain lightweight and must not host historical workflows. |

The canonical Outcome is the primary output. Learning records, patterns,
playbook candidates, journal entries, and Dashboard aggregates are separate
downstream products with separate ownership.

## 7. Canonical State Machine

The Outcome workflow uses exactly these states:

```text
CREATED -> EXECUTING -> MONITORING -> CLOSED -> RECORDED -> ARCHIVED
```

| State | Meaning | Required forward transition |
| --- | --- | --- |
| `CREATED` | A Trade-ready decision is identified for outcome tracking; no canonical Outcome exists. | `EXECUTING` after a real entry. |
| `EXECUTING` | A real execution has begun and entry facts are attributable. | `MONITORING` when active observation begins. |
| `MONITORING` | The open execution is being observed; result fields are not final. | `CLOSED` after a real close event. |
| `CLOSED` | Trade has completed; realized facts are available for Outcome intake. | `RECORDED` only after canonical validation succeeds. |
| `RECORDED` | The immutable canonical Outcome has been published with `learningStatus: pending`. | `ARCHIVED` when Historical Memory accepts it. |
| `ARCHIVED` | Historical Memory owns durable availability; the Outcome facts remain immutable. | Terminal Outcome state. Learning and Playbook are downstream workflows. |

Rules:

1. Only the adjacent forward transition is allowed.
2. No state may be skipped, reversed, reopened, or entered from a later state.
3. `CREATED`, `EXECUTING`, `MONITORING`, and `CLOSED` are workflow states, not
   permission to publish a partial canonical Outcome.
4. The canonical Outcome first exists at `RECORDED`.
5. Learning Queue and Playbook Candidate do not add Outcome states; they
   consume an `ARCHIVED` Outcome through their own future lifecycles.
6. A failed prerequisite leaves the workflow at its current state with an
   explicit reason. It does not create a failure branch or synthetic forward
   transition.

## 8. Dependency Architecture

```text
Research ---- thesis/evidence reference ----+
Replay ------ validation/replay reference --+
Shared Context -- identity/context ---------+---> Outcome Engine
Trade ------- realized execution facts -----+
Source-backed snapshots --------------------+
                                                |
                                                v
                                      Canonical Outcome
                                                |
                     +--------------------------+--------------------+
                     v                          v                    v
             Historical Memory          Decision Journal     Future Dashboard
                     |
                     v
               Learning Engine
                     |
                     v
                Pattern Engine
                     |
                     v
               Playbook Engine
```

Dependency rules:

* Outcome depends only on allowed upstream facts and references.
* Historical Memory is the first downstream owner after recording.
* Learning, Pattern, and Playbook remain downstream and cannot be required to
  create an Outcome.
* Decision Journal receives traceability output without becoming persistence
  authority for Historical Memory.
* Dashboard may receive only a future compact aggregate or artifact reference;
  it must remain responsive and free of historical-heavy processing.
* Heavy historical work follows `Ingest -> Process -> Cache -> Render` and does
  not run in product request paths.

## 9. Success Criteria

The Outcome Engine information architecture succeeds when:

* a completed trade from any approved upstream adapter is normalized into the
  same canonical Outcome information hierarchy;
* workflow state and canonical Outcome existence are not confused;
* every section has one owner and preserves upstream provenance;
* every lifecycle stage has explicit entry and exit criteria;
* only adjacent forward state transitions are valid;
* unavailable evidence or context remains explicit rather than reconstructed;
* downstream consumers receive stable references without mutating Outcome;
* no ambiguity remains between Trade execution, Outcome results, Historical
  Memory storage, Learning extraction, Pattern derivation, or Playbook updates.

## 10. Validation

* `docs/project/outcome-engine-information-architecture.md` exists.
* The eight-stage user journey is complete with entry and exit criteria.
* All nine canonical information sections define purpose, owner, inputs,
  outputs, and dependencies.
* Ownership covers Outcome and every upstream/downstream domain.
* Canonical allowed and prohibited inputs are explicit.
* Historical Memory, Learning, Pattern, Playbook, Decision Journal, and future
  aggregate Dashboard outputs are defined.
* The state machine contains exactly `CREATED`, `EXECUTING`, `MONITORING`,
  `CLOSED`, `RECORDED`, and `ARCHIVED` with forward-only transitions.
* No persistence, storage, learning, AI, database schema, or runtime behavior
  is implemented.
* Runtime files changed: none.
* API files changed: none.
* Package files changed: none.
* Build and TypeScript validation: not run; this is an architecture-only sprint
  and no build is required.
