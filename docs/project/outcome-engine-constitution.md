# Outcome Engine Constitution

**Project:** Theta - Data Intelligence Platform  
**Phase:** 4  
**Sprint:** P4-1  
**Status:** Architecture foundation  
**Scope:** Canonical outcome ownership and contract only

## 1. Purpose

The Outcome Engine closes the factual decision loop between Trade and
Historical Intelligence. Its single purpose is to represent what actually
happened after an executed trade reached a completed state.

The Outcome Engine owns:

* completed decision records linked to an executed trade;
* the outcome lifecycle from completion through outcome publication;
* realized entry, exit, and performance results;
* the realized exit reason and invalidation reason;
* immutable learning inputs handed downstream.

The Outcome Engine does not own:

* Research, thesis creation, or evidence generation;
* Replay validation or historical comparison;
* order execution or execution planning;
* playbook creation or mutation;
* learning, pattern extraction, or confidence calibration;
* prediction or forward-looking intelligence.

An Outcome is a factual record, not a recommendation, simulation, score, or
explanation generated after the fact.

## 2. Canonical Lifecycle

The canonical lifecycle is linear and has no additional branches:

```text
Decision Created
  -> Trade Executed
  -> Monitoring
  -> Completed
  -> Outcome Recorded
  -> Historical Memory
  -> Learning
  -> Playbook Update
```

Lifecycle ownership:

| Stage | Owner | Meaning |
| --- | --- | --- |
| Decision Created | Research / Trade handoff | A source-backed thesis and execution decision exists. |
| Trade Executed | Trade | A real execution has an observed entry. |
| Monitoring | Trade | The open execution is observed without declaring an outcome. |
| Completed | Trade | A real exit closes the execution. |
| Outcome Recorded | Outcome Engine | Realized facts are normalized into the canonical Outcome object. |
| Historical Memory | Historical Memory | The accepted Outcome is stored and made discoverable as historical fact. |
| Learning | Learning | Downstream learning may extract knowledge from accepted outcomes. |
| Playbook Update | Playbook | A separately governed process may update playbook knowledge. |

The Outcome Engine owns only `Outcome Recorded`. It receives the completed
execution facts from Trade and publishes a canonical object for downstream
consumers. It does not execute the Historical Memory, Learning, or Playbook
Update stages.

A decision that was never executed does not enter this lifecycle. An open or
partially observed trade remains in Trade monitoring and cannot be promoted to
an Outcome.

## 3. Canonical Outcome Model

### 3.1 Contract

```ts
type OutcomeDirection = "LONG" | "SHORT"

type OutcomeExitReason =
  | "TARGET"
  | "STOP_LOSS"
  | "INVALIDATION"
  | "MANUAL"
  | "LIQUIDATION"
  | "OTHER"

type OutcomeLearningStatus = "pending" | "learned" | "rejected"

type SnapshotAvailability = "AVAILABLE" | "UNAVAILABLE"

interface OutcomeSnapshotField<T> {
  status: SnapshotAvailability
  value: T | null
  sourceId: string | null
  observedAt: string | null
  unavailableReason: string | null
}

interface CanonicalOutcome {
  outcomeId: string
  decisionId: string
  createdAt: string
  closedAt: string

  decision: {
    symbol: string
    exchange: string
    timeframe: string
    direction: OutcomeDirection
  }

  execution: {
    entry: number
    exit: number
  }

  performance: {
    pnl: number
    pnlPercent: number
    holdingTime: number
    maxDrawdown: number
    maxRunup: number
  }

  result: {
    success: boolean
    exitReason: OutcomeExitReason
    invalidationReason: string | null
  }

  evidenceSnapshot: {
    thesis: OutcomeSnapshotField<string>
    evidenceSummary: OutcomeSnapshotField<string>
    replayReference: OutcomeSnapshotField<string>
  }

  contextSnapshot: {
    macro: OutcomeSnapshotField<unknown>
    sector: OutcomeSnapshotField<unknown>
    funding: OutcomeSnapshotField<unknown>
    oi: OutcomeSnapshotField<unknown>
    etf: OutcomeSnapshotField<unknown>
  }

  learningStatus: OutcomeLearningStatus
}
```

### 3.2 Field Semantics

All top-level fields and nested fields are mandatory in the canonical object.
Mandatory snapshot fields may be explicitly unavailable; they must never be
silently omitted or populated with reconstructed values.

#### Outcome Identity

* `outcomeId`: stable unique identity for this realized Outcome.
* `decisionId`: identity of the completed decision supplied by the upstream
  decision contract.
* `createdAt`: trusted timestamp when the Outcome object was created. This is
  record metadata, not market observation time.
* `closedAt`: trusted timestamp of the realized trade close.

#### Decision

* `symbol`: executed market symbol.
* `exchange`: venue on which the execution occurred.
* `timeframe`: inherited decision timeframe, preserved without reinterpretation.
* `direction`: realized execution direction, `LONG` or `SHORT`.

#### Execution

* `entry`: realized executed entry price.
* `exit`: realized executed exit price.

An intended level, candidate level, mark price, or hypothetical fill cannot be
used as `entry` or `exit`.

#### Performance

* `pnl`: signed realized profit or loss in the execution record's declared
  settlement currency.
* `pnlPercent`: signed realized return relative to the executed position basis.
* `holdingTime`: elapsed milliseconds from the first realized entry to the
  realized close.
* `maxDrawdown`: greatest realized adverse excursion as a signed percentage
  during the monitored holding window.
* `maxRunup`: greatest realized favorable excursion as a signed percentage
  during the monitored holding window.

The producer must use one documented position basis and one monitored window
for all five performance fields. If any required performance fact cannot be
measured from trusted execution or observation records, a canonical Outcome
cannot yet be published.

#### Result

* `success`: factual boolean derived from the approved realized-success rule;
  it is not confidence or trade quality.
* `exitReason`: the observed reason the execution closed.
* `invalidationReason`: the recorded invalidation reason, or `null` when no
  invalidation occurred. `null` means not applicable, not unknown.

`OTHER` requires a source-recorded explanation outside this minimum model; it
must not become a catch-all for an unknown exit.

#### Evidence Snapshot

* `thesis`: the Research-owned thesis available at decision time.
* `evidenceSummary`: the Research-owned evidence summary available at decision
  time.
* `replayReference`: the Replay-owned reference available before execution.

These values are immutable snapshots or references to immutable artifacts.
Outcome does not recreate missing evidence from later market behavior.

#### Context Snapshot

* `macro`: source-backed Macro context available at decision time.
* `sector`: Markets-owned Sector context available at decision time.
* `funding`: source-backed funding observation available at decision time.
* `oi`: source-backed open-interest observation available at decision time.
* `etf`: source-backed ETF context available at decision time.

Each context field preserves source identity and observation time. A missing,
blocked, stale-beyond-policy, or untrusted value uses `UNAVAILABLE`, a `null`
value, and an explicit reason. Record creation time must not replace missing
source observation time.

#### Learning Status

* `pending`: the Outcome is available to Learning but has not been accepted or
  rejected by it.
* `learned`: Learning has recorded that it consumed this Outcome.
* `rejected`: Learning has recorded that the Outcome is unsuitable as a
  learning input.

The Outcome Engine initializes `learningStatus` to `pending`. Only the
Learning-owned process may later report `learned` or `rejected`; those statuses
do not alter the realized facts in the Outcome.

## 4. Ownership

| Domain | Owns | Must not rewrite |
| --- | --- | --- |
| Research | Thesis and evidence context | Outcome, validation, execution, or learning |
| Replay | Historical comparison and validation references | Thesis, realized execution, or Outcome results |
| Trade | Execution, monitoring, entry, exit, and close event | Research evidence, Replay validation, or realized Outcome interpretation |
| Outcome Engine | Canonical realized results and downstream learning input | Execution behavior, Historical Memory, learning, patterns, or playbooks |
| Historical Memory | Durable storage and retrieval of accepted Outcome records | Realized facts or upstream ownership |
| Learning | Knowledge extraction and learning disposition | Outcome facts or execution history |
| Pattern | Pattern derivation from accepted learning inputs | Outcome or evidence provenance |
| Playbook | Governed playbook knowledge and updates | Historical facts or Trade execution records |

Transport does not transfer ownership. Historical Memory stores the Outcome;
it does not become the owner of the realized facts. Learning consumes an
Outcome; it does not gain permission to revise it.

## 5. No-Fabrication Policy

Outcome records contain only realized and attributable facts.

Prohibited:

* simulated, paper-estimated, or hypothetical PnL in a canonical Outcome;
* intended, modeled, or reconstructed exits represented as realized exits;
* reconstructed thesis, evidence, Replay validation, or context;
* inferred source timestamps or freshness;
* generated max drawdown or max runup without trusted monitored observations;
* synthetic success, confidence, learning, or playbook labels;
* converting an unavailable context value into zero, neutral, or current.

If the execution did not occur, the trade did not close, or mandatory realized
performance facts are unavailable, no canonical Outcome is emitted. If only a
snapshot input is unavailable, the Outcome may be emitted with that snapshot
field explicitly marked `UNAVAILABLE` and its reason preserved.

## 6. Architecture Boundary

The Outcome Engine must not depend on:

* broker or exchange execution APIs;
* AI or LLM services;
* Pattern Engine;
* Learning Engine;
* Playbook Engine.

These systems may consume a published Outcome, but none may be required to
construct its realized facts. Trade supplies completed execution facts through
a future contract; Source Governance supplies provenance vocabulary; Outcome
normalizes the result without calling upstream or downstream engines.

The Outcome Engine also does not persist records in this sprint. A future
Historical Memory adapter may store canonical Outcome objects behind a
separate contract. Heavy historical processing must follow the accepted
`Ingest -> Process -> Cache -> Render` architecture and must not run in page or
request paths.

## 7. Phase 4 Dependency Graph

```text
Trade
  -> Outcome
  -> Historical Memory
  -> Learning
  -> Pattern
  -> Playbook
  -> Dashboard
```

Dependency direction is one-way:

* Trade produces completed execution facts for Outcome.
* Outcome produces immutable realized records for Historical Memory.
* Historical Memory makes accepted Outcome records available to Learning.
* Learning produces knowledge inputs for Pattern.
* Pattern produces governed pattern candidates for Playbook.
* Playbook may expose compact, source-backed guidance to Dashboard.

No downstream component may call backward to mutate an upstream record.
Dashboard receives a lightweight result or reference only; it must not host
historical processing, learning, or playbook evolution.

## 8. Success Criteria

The Outcome Engine foundation succeeds when a completed real trade can be
represented as one canonical Outcome object without ambiguity:

* identity links the Outcome to exactly one decision;
* entry, exit, timestamps, and performance are realized and attributable;
* success and exit semantics are explicit;
* evidence and context preserve owner, source, observation time, and
  unavailable state;
* learning disposition is separate from realized facts;
* downstream systems can consume the object without Outcome depending on them;
* no storage, learning, AI, prediction, playbook, or execution behavior is
  implied by the contract.

## 9. Validation

* `docs/project/outcome-engine-constitution.md` exists.
* Purpose and exclusions are defined.
* Ownership is complete across Research, Replay, Trade, Outcome, Historical
  Memory, Learning, Pattern, Playbook, and Dashboard.
* The lifecycle contains exactly the eight required stages and no additional
  branch.
* Every required canonical Outcome field is present and its semantics are
  defined.
* The Phase 4 dependency graph is complete and one-way.
* No persistence, learning, AI, prediction, playbook, broker, or execution
  implementation is introduced.
* Runtime files changed: none.
* API files changed: none.
* Package files changed: none.
* Build and TypeScript validation: not run; this is an architecture-only sprint
  and no build is required.
