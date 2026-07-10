# Context Preservation Audit

**Status:** Canonical F5.5 scenario audit  
**Owner:** Product Navigation / Context Contracts

## Context Invariant

Context preservation means carrying source-backed identity and scope, not copying a conclusion between screens. Each destination re-presents the same context for its own question and keeps the origin and return path visible.

Canonical context fields are: context ID, origin, symbol, exchange, timeframe, UTC window, evidence IDs, candidate ID, thesis ID, source, observed time, freshness, availability, coverage, provider tier, filters, and return destination.

## Scenario A: ETF Inflow Detected

```text
Markets -> Dashboard -> Replay -> Research -> Scanner
```

| Transition | Preserved context | Destination responsibility | Result |
| --- | --- | --- | --- |
| Markets -> Dashboard | ETF evidence ID, asset scope, source date, observed time, freshness, coverage | Orient; show a compact source-backed driver | DESIGN PASS / IMPLEMENTATION PARTIAL |
| Dashboard -> Replay | Evidence ID, symbol/market, bounded UTC window | Reconstruct only if historical records exist | DESIGN PASS / IMPLEMENTATION PARTIAL |
| Replay -> Research | Replay window, event sequence, supporting and conflicting evidence | Investigate interpretation and source quality | DESIGN PASS / IMPLEMENTATION PARTIAL |
| Research -> Scanner | Research question, evidence references, missing evidence | Find an existing eligible investigation candidate | DESIGN PASS / IMPLEMENTATION PARTIAL |

If no source-owned Scanner candidate exists, the final transition ends in `UNAVAILABLE`. Scanner must not fabricate priority from ETF flow.

## Scenario B: Liquidation Cascade

```text
Dashboard -> Replay -> Research -> Trade (future)
```

| Transition | Preserved context | Destination responsibility | Result |
| --- | --- | --- | --- |
| Dashboard -> Replay | Symbol, exchange, event/evidence ID, bounded date/hour, provider tier | Establish the factual sequence | DESIGN PASS / IMPLEMENTATION PARTIAL |
| Replay -> Research | Window, liquidation/OI/funding evidence, gaps, counter-evidence | Test explanations and alternatives | PASS IN CANONICAL MODEL |
| Research -> Trade | Selected thesis, evidence/counter-evidence IDs, confidence basis, freshness, risk | Support a user decision without order entry | READY FOR TRADE DESIGN |

Experimental liquidation remains `canonical: false`. Research or Trade cannot promote it to canonical truth.

## Scenario C: Macro Event

```text
Markets -> Research -> Replay -> Dashboard
```

| Transition | Preserved context | Destination responsibility | Result |
| --- | --- | --- | --- |
| Markets -> Research | Macro source ID, event time, affected markets, availability, coverage | Investigate evidence and counter-evidence | PASS IN SHARED CONTRACT |
| Research -> Replay | Thesis/question, evidence IDs, bounded replay target | Validate sequence without inferring causality | PASS IN CURRENT DIRECTION |
| Replay -> Dashboard | Validated window and source state; no heavy payload | Return to lightweight orientation | DESIGN PASS / IMPLEMENTATION PARTIAL |

Unavailable macro evidence remains unavailable. A market move alone cannot manufacture a macro event or regime.

## Preservation Matrix

| Context dimension | Design coverage | Current implementation evidence | Certification |
| --- | --- | --- | --- |
| Symbol / exchange / timeframe | Complete | Shared product context and page query handling | PASS |
| UTC date / hour | Complete for Replay handoffs | Research -> Replay target | PASS |
| Evidence identity | Required everywhere | Present in context types; not universal in every route | PARTIAL |
| Candidate identity | Complete for Scanner/Trade workflows | Scanner -> Research contract | PASS |
| Thesis identity | Complete for Research/Replay/Trade | Research -> Replay contract | PASS |
| Freshness / availability | Complete | Shared context values and screen states | PASS |
| Origin / return path | Required | Source page exists; universal return UI not demonstrated | PARTIAL |
| Filter / workspace state | Defined | Not universally implemented | PARTIAL |

## Failure Behavior

- Expired context is rejected or shown as unavailable.
- Missing fields are not inferred from prose.
- A destination remains usable in direct-entry mode.
- Invalid context never blocks primary page load.
- Optional heavy evidence remains manual and bounded.
- Browser Back returns to the source state without creating a new claim.

## Decision

**PASS WITH MINOR ACTIONS.** Context survives conceptually across all three scenarios. Implementation must complete reverse/lateral handoffs and a universal return trail before the React V2 suite is declared fully complete.
