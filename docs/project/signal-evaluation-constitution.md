# Signal Evaluation Constitution

**Project:** Theta - Data Intelligence Platform  
**Phase:** 4  
**Sprint:** P4-3  
**Status:** Architecture foundation  
**Scope:** Signal snapshot, evaluation lifecycle, metrics, and ownership only

## 1. Purpose

Signal Evaluation answers:

```text
How reliable was this QuantTerminal-generated signal after time passed?
```

Its purpose is to freeze a system-generated signal at emission time, observe
source-backed market behavior over fixed windows, and publish objective signal
outcomes for historical review and future learning.

Signal Evaluation:

* evaluates generated signals;
* preserves the exact signal and available context that existed at emission;
* tracks objective market observations over canonical windows;
* records attributable, source-backed evaluation metrics;
* produces signal outcomes independently of user activity.

Signal Evaluation does not:

* create, rank, prioritize, or modify signals;
* execute trades or infer that a user traded;
* generate Research, evidence, narratives, or theses;
* run Replay or create historical validation;
* fabricate outcomes, missing context, or missing market observations;
* extract learning, create patterns, or update playbooks.

Scanner remains the canonical owner of QuantTerminal signal generation and
prioritization. A product indication from another page is not a canonical
signal unless it enters through an approved signal-generation contract with
Scanner ownership preserved.

## 2. Primary Unit: Signal Snapshot

A **Signal Snapshot** is a frozen record of a system-generated signal at the
moment it was emitted. It is immutable evaluation input, not a live view of the
current Scanner state.

### 2.1 Identity and Evaluation Baseline

The minimum identity required to schedule evaluation is:

* `signalId`;
* `createdAt`;
* `symbol`;
* `exchange`;
* `timeframe`;
* `direction`;
* `sourcePage`;
* source-backed reference price at emission;
* reference-price source ID and observation timestamp.

The reference price is an observed evaluation baseline. It is not an executed
entry and must never be represented as one.

If signal identity, direction, emission time, or a trusted reference price is
missing, the signal may be retained for diagnostics but cannot produce numeric
evaluation metrics.

### 2.2 Frozen Signal Content

A Signal Snapshot may include only values available when the signal was
emitted:

* opportunity context;
* signal reason;
* confidence when source-backed;
* market structure;
* ETF context;
* Macro context;
* Sector context;
* funding;
* open interest;
* liquidation context;
* evidence summary;
* Replay context;
* freshness;
* source health;
* a source-recorded invalidation condition or level, when one exists.

Every optional field must retain:

* owning page or system;
* source identity;
* observation timestamp when available;
* freshness and source health when available;
* explicit unavailable reason when absent or unusable.

An unavailable optional field remains structurally unavailable. Snapshot
freezing must not omit it in a way that can later be mistaken for neutral,
zero, healthy, current, or contradictory evidence.

### 2.3 Immutability

After `Snapshot Frozen`:

* signal identity and emitted content cannot be rewritten;
* later confidence, evidence, structure, or market context cannot be inserted
  as if it existed at emission;
* source observation time cannot be replaced by snapshot creation or retrieval
  time;
* each evaluation window references the same frozen snapshot;
* corrected source data requires a separately governed correction record, not
  silent snapshot mutation.

This sprint defines no storage or correction implementation.

## 3. Signal Lifecycle

The Signal Evaluation lifecycle is linear and has no additional branches:

```text
Signal Emitted
  -> Snapshot Frozen
  -> Tracking Scheduled
  -> Evaluation Window Open
  -> Outcome Observed
  -> Signal Evaluated
  -> Historical Memory Candidate
  -> Learning Candidate
```

### 3.1 Signal Emitted

**Owner:** Scanner.

A canonical Scanner-owned signal is emitted with stable identity, direction,
symbol, time, and source provenance. Emission does not imply execution,
correctness, or a future outcome.

### 3.2 Snapshot Frozen

**Owner:** Signal Evaluation.

Signal Evaluation freezes the emitted signal and all available source-backed
context. Missing fields become explicit unavailable fields. No evaluation
metric exists yet.

### 3.3 Tracking Scheduled

**Owner:** Signal Evaluation lifecycle.

The seven canonical evaluation windows are associated with the frozen
snapshot. This is an architectural scheduling state only; P4-3 does not
implement a scheduler, queue, timer, worker, or persistence mechanism.

### 3.4 Evaluation Window Open

**Owner:** Signal Evaluation lifecycle.

A canonical window reaches its elapsed start/end boundary and may be evaluated
from approved price observations. An open window is not a completed result and
must not expose partial data as a final metric.

### 3.5 Outcome Observed

**Owner:** Signal Evaluation.

The window's source-backed price path is inspected. If required coverage is
missing, the observation is `UNAVAILABLE`; no interpolation, substitute
provider, or later user action may fill it implicitly.

### 3.6 Signal Evaluated

**Owner:** Signal Evaluation.

Objective window metrics are calculated from the frozen baseline and trusted
observations, or all unavailable metrics remain `null` with an explicit
reason. Evaluation does not create PnL, confidence, Research, Replay, or Trade
results.

### 3.7 Historical Memory Candidate

**Owner:** Historical Memory for future acceptance; Signal Evaluation owns the
candidate handoff.

The frozen snapshot and its window results become an immutable candidate for
long-term storage. Candidate status does not imply that persistence exists or
that the result is eligible for learning.

### 3.8 Learning Candidate

**Owner:** Learning for future eligibility and extraction.

Historical Memory may expose an accepted Signal Evaluation as a Learning
Candidate. Missing or unavailable outcomes remain visible and cannot become
positive or negative learning examples through inference. P4-3 implements no
learning behavior.

All signals follow the same lifecycle. Unavailable observation data produces
an unavailable evaluation within the lifecycle; it does not create a side
branch or a fabricated completion.

## 4. Canonical Evaluation Windows

Every window is measured from the Signal Snapshot's trusted `createdAt` and
reference price. A valid window requires:

* the same symbol and exchange identity as the snapshot;
* a trusted baseline price at or immediately before emission according to a
  future approved tolerance policy;
* timestamped source-backed OHLC or finer price observations through the full
  window end;
* sufficient high/low path coverage to derive excursions, drawdown, and runup;
* source identity and coverage diagnostics.

| Window | Purpose | Minimum required price data | Allowed output | Unavailable behavior |
| --- | --- | --- | --- | --- |
| `1h` | Measure immediate post-signal response and initial invalidation behavior. | Trusted emission baseline plus timestamped price path covering the full first hour. | The canonical metric set scoped only to `createdAt` through `+1h`. | Return `outcomeStatus: UNAVAILABLE`; all unavailable metrics are `null`; preserve the coverage reason. |
| `6h` | Measure intraday follow-through, reversal, and adverse excursion. | Trusted baseline plus complete timestamped high/low/close coverage through `+6h`. | The canonical metric set scoped only to the first six hours. | Same explicit unavailable result; do not extrapolate from the `1h` window. |
| `24h` | Measure one-day directional reliability and full-session path behavior. | Trusted baseline plus complete timestamped path through `+24h`. | The canonical metric set scoped only to the first 24 hours. | Same explicit unavailable result; a shorter completed window cannot substitute. |
| `3d` | Measure short swing continuation and reversal. | Trusted baseline plus continuous or policy-approved complete candle coverage through `+3d`. | The canonical metric set scoped only to the first three days. | Same explicit unavailable result; gaps that prevent extrema or end-price verification invalidate the window. |
| `7d` | Measure weekly durability of the emitted direction. | Trusted baseline plus verified timestamped path through `+7d`. | The canonical metric set scoped only to the first seven days. | Same explicit unavailable result; no carry-forward price or synthetic candle is allowed. |
| `14d` | Measure extended follow-through and delayed invalidation. | Trusted baseline plus verified timestamped path through `+14d`. | The canonical metric set scoped only to the first fourteen days. | Same explicit unavailable result; the `7d` result remains separate and cannot be doubled or projected. |
| `30d` | Measure medium-horizon reliability without converting the signal into an investment thesis. | Trusted baseline plus verified timestamped path through `+30d`. | The canonical metric set scoped only to the first thirty days. | Same explicit unavailable result; no estimated endpoint, backfill guess, or alternate identity is allowed. |

Each window is independent. A valid short window does not make a longer window
valid, and an unavailable window does not invalidate already completed windows.
This independence is result availability, not an additional lifecycle branch.

## 5. Canonical Evaluation Metrics

Signal Evaluation uses source-backed market observations only. It emits no
subjective AI score, quality grade, narrative score, or confidence adjustment.

| Metric | Canonical meaning |
| --- | --- |
| `returnPercent` | Signed percentage change from the frozen reference price to the verified window-end price. Positive means price rose; negative means price fell. |
| `maxFavorableExcursion` | Largest direction-adjusted favorable percentage move from the reference price during the window. |
| `maxAdverseExcursion` | Largest direction-adjusted adverse percentage move from the reference price during the window. |
| `drawdown` | Greatest peak-to-subsequent-trough percentage decline in the observed price path during the window. |
| `runup` | Greatest trough-to-subsequent-peak percentage increase in the observed price path during the window. |
| `timeToMaxFavorable` | Elapsed milliseconds from signal emission to the timestamp of maximum favorable excursion. |
| `timeToMaxAdverse` | Elapsed milliseconds from signal emission to the timestamp of maximum adverse excursion. |
| `invalidationHit` | `true` or `false` only when the frozen signal includes an objective invalidation condition that can be tested from covered observations; otherwise `null` with an unavailable reason. |
| `directionCorrect` | `true` when the window-end return is in the emitted direction, `false` when it is against the emitted direction, and `null` when flat or unavailable. |
| `outcomeStatus` | `FAVORABLE`, `ADVERSE`, `FLAT`, or `UNAVAILABLE`, derived only from direction-adjusted window-end return and data availability. |

Metric rules:

1. LONG direction-adjusted return equals `returnPercent`; SHORT
   direction-adjusted return equals `-returnPercent`.
2. Positive direction-adjusted return is `FAVORABLE`; negative is `ADVERSE`;
   exact zero is `FLAT`.
3. `invalidationHit` is independent from window-end direction correctness. A
   signal may hit its recorded invalidation before a later price reversal; both
   facts must remain visible.
4. Max favorable/adverse excursion use the frozen direction. Drawdown and runup
   describe the observed market path and do not imply a trade.
5. Time-to-extreme requires a trusted observation timestamp. Order of values
   without trusted timestamps is insufficient.
6. Missing baseline, endpoint, path extrema, source identity, or required
   coverage produces `UNAVAILABLE` for the affected metric or window.
7. No fee, slippage, leverage, position size, realized PnL, or user behavior is
   inferred from signal metrics.

## 6. Ownership

| Domain | Owns | Does not own |
| --- | --- | --- |
| Scanner | Signal generation, signal identity, reason, direction, prioritization, and source-backed confidence when available | Evaluation, realized signal outcome, Research, Replay, or execution |
| Signal Evaluation | Frozen Signal Snapshot, tracking lifecycle, evaluation windows, source-backed metrics, and realized signal outcome | Signal generation, user execution, canonical trade Outcome, persistence, learning, or playbooks |
| Research | Thesis, evidence, narratives, source attribution, and confidence context | Signal generation, signal outcome, execution, or learning |
| Replay | Historical comparison and validation context | Signal generation, signal tracking, or trade execution |
| Trade | Execution planning and execution facts | Signal reliability evaluation, Research evidence, Replay validation generation, or learning |
| Outcome Engine | Canonical completed Outcome record for a completed trade or separately approved canonical outcome input | Signal generation, autonomous tracking, persistence, learning, or playbooks |
| Historical Memory | Long-term storage and retrieval of accepted records | Signal generation, evaluation calculation, or knowledge extraction |
| Learning | Eligibility decisions and pattern/knowledge extraction from accepted historical records | Rewriting Signal Snapshots, signal outcomes, or trade outcomes |

Transport does not transfer ownership. A frozen Scanner signal remains
Scanner-authored; Signal Evaluation owns only the snapshot and observed result.

## 7. No-Fabrication Rules

Signal Evaluation must not fabricate:

* missing reference or window price data;
* missing confidence;
* missing evidence or thesis context;
* missing freshness or source health;
* missing signal outcomes;
* hypothetical PnL, fills, exits, fees, leverage, or position size;
* inferred user clicks, selections, executions, or exits;
* missing invalidation conditions;
* source timestamps or continuous coverage;
* replacement values from mock, fixture, or unapproved providers.

Required behavior:

* missing optional snapshot context remains `UNAVAILABLE` with a reason;
* missing required evaluation data makes the affected metric or window
  `UNAVAILABLE`;
* an empty response is not a zero return;
* retrieval time is not source observation time;
* stale or incompatible identity cannot be promoted to current coverage;
* later evidence cannot reconstruct the emission-time snapshot;
* a signal with unavailable evaluation remains historically auditable but is
  not converted into a positive or negative example.

## 8. User Independence

Signal Evaluation does not require an active user.

QuantTerminal may, in a future implementation, automatically freeze and track
every canonical generated signal even when no user:

* opens Scanner;
* clicks the signal;
* creates Research;
* opens Replay;
* prepares or executes a trade.

Automatic tracking means deterministic observation of the emitted system
signal. It does not mean automatic trading, user impersonation, or inferred
user intent.

User outcomes form a separate optional layer. A user trade may reference the
same `signalId`, but its execution, PnL, risk, exit, and canonical Outcome
remain independent records owned by Trade and Outcome Engine.

P4-3 implements no scheduler, tracking worker, API, or persistence mechanism.

## 9. Relationship to Outcome Engine

Signal Evaluation produces **signal outcomes**:

* how the market moved after a generated signal;
* what source-backed excursions occurred in each canonical window;
* whether the emitted direction matched the window-end move;
* whether a source-recorded invalidation condition was observed.

Outcome Engine records **canonical completed outcomes**:

* realized completed execution results when a real trade exists;
* attributable entry, exit, PnL, holding time, close reason, and context;
* immutable learning input for completed Outcome records.

A signal outcome is not a user trade outcome:

| Signal outcome | User trade Outcome |
| --- | --- |
| Uses emission reference price | Uses realized executed entry |
| Uses fixed evaluation-window end price | Uses realized executed exit |
| Measures market path after a signal | Measures the user's completed execution |
| Has no position size, fees, slippage, or realized PnL | May contain realized execution economics |
| Exists without user activity | Requires a completed real execution |
| Owned by Signal Evaluation | Owned by Outcome Engine after Trade completion |

The two records may share `signalId` or `decisionId` references in a future
contract, but neither may overwrite or substitute for the other. Outcome
Engine does not convert a signal return into user PnL, and Signal Evaluation
does not infer an Outcome from a signal.

## 10. Dependency Architecture

```text
Scanner
  -> Signal Snapshot
  -> Signal Evaluation
  -> Historical Memory Candidate
  -> Learning Candidate

Research / Replay / Shared Context / Source Governance
  -> frozen references and source-backed context only

Trade
  -> optional user execution linked by signalId
  -> Outcome Engine
  -> Historical Memory
```

Dependency rules:

* Signal Evaluation depends on the frozen Scanner signal and approved
  source-backed market observations.
* Research, Replay, and Shared Context may contribute frozen references only;
  they do not become evaluation engines.
* Historical Memory and Learning are downstream consumers.
* Trade and Outcome Engine form a separate user-execution path.
* Heavy historical processing follows `Ingest -> Process -> Cache -> Render`
  and must not block Scanner, Trade, Replay, or product request paths.
* Dashboard must not host signal tracking or historical evaluation workflows.

## 11. Success Criteria

The Signal Evaluation foundation succeeds when:

* a QuantTerminal-generated signal can be frozen without manual user action;
* all seven canonical windows can be associated with the same immutable
  snapshot;
* every completed window produces only objective source-backed metrics or an
  explicit unavailable result;
* Scanner generation remains separate from evaluation;
* signal outcomes remain separate from user trade Outcomes;
* Historical Memory and Learning can consume attributable records later
  without changing snapshot or outcome facts;
* no persistence, scheduler, tracker, API, AI, learning, or execution behavior
  is implied by this constitution.

## 12. Validation

* `docs/project/signal-evaluation-constitution.md` exists.
* Purpose and exclusions are complete.
* Signal Snapshot identity, optional context, provenance, and immutability are
  defined without selecting a storage implementation.
* The lifecycle contains exactly the eight required stages and no additional
  branch.
* Evaluation windows include exactly `1h`, `6h`, `24h`, `3d`, `7d`, `14d`, and
  `30d`, each with purpose, minimum data, allowed output, and unavailable
  behavior.
* All ten required evaluation metrics are defined without subjective AI scores.
* Ownership covers Scanner, Signal Evaluation, Research, Replay, Trade,
  Outcome Engine, Historical Memory, and Learning.
* User-independent tracking and the separate optional user-outcome layer are
  defined.
* Signal outcome and canonical user trade Outcome are explicitly distinct.
* No persistence, scheduler, tracking, database, API, learning, AI, or runtime
  implementation is introduced.
* Runtime files changed: none.
* API files changed: none.
* Package files changed: none.
* Build and TypeScript validation: not run; this is an architecture-only sprint
  and no build is required.
