# Trade User Journey

Project Zeta - Trade V2 Sprint T2  
Status: User journey definition  
Runtime behavior: none

## Purpose

Trade answers:

```text
How should this validated opportunity be executed?
```

Trade consumes inherited opportunity, evidence, structure, and validation context. It owns execution planning and must not recreate upstream discovery, research, or historical validation.

## A. 10-Second Orientation

Within 10 seconds, the user should understand:

- which validated opportunity is being planned;
- whether execution planning is ready, blocked, partial, stale, or unavailable;
- the active symbol, exchange, and timeframe;
- the inherited thesis, validation result, and freshness context at a glance.

### User Questions

- Am I planning the intended candidate?
- Has Replay supplied a validation result?
- Are symbol, exchange, timeframe, and source context correct?
- Is the inherited context current and sufficient for planning?
- What prevents execution readiness, if anything?

### Required First Read

The first viewport should expose:

- candidate or thesis identity;
- symbol / exchange / timeframe;
- execution-readiness state and reason;
- inherited Replay validation state;
- freshness or health state;
- compact overall execution context.

The selected candidate must remain stable unless the user explicitly changes it.

### Failure Handling

When context is insufficient, Trade should show the precise state and reason:

- validation not performed -> return to Replay;
- evidence missing or contradictory -> return to Research;
- market structure stale or absent -> return to Markets;
- no selected candidate -> return to Scanner;
- required execution or risk input missing -> remain in Trade with a not-ready state.

Trade must not replace missing context with fabricated prices, risk, sizing, confidence, or readiness.

## B. 60-Second Execution Planning

Within 60 seconds, the user should understand:

- the execution setup;
- entry conditions;
- exit conditions;
- stop-loss and invalidation conditions;
- targets;
- position sizing when valid inputs exist;
- the risk summary;
- execution-checklist completion;
- final trade readiness.

### Planning Sequence

1. Confirm inherited opportunity and validation context.
2. Review the execution setup and its required conditions.
3. Define or inspect entry conditions using real market inputs.
4. Define or inspect exit, stop, invalidation, and target conditions.
5. Review risk limits and position sizing using explicit user inputs.
6. Complete the execution checklist.
7. Confirm ready, not ready, partial, stale, or unavailable status.

### User Questions

- What conditions must exist before entry?
- What invalidates the setup?
- Where and why should the position be reduced or closed?
- Is the planned risk explicit and within user limits?
- Is position size derived from valid inputs?
- Which checklist items remain incomplete?

### No-Fabrication Rule

If real market inputs or explicit user risk inputs are insufficient, Trade should leave the affected plan item unavailable and explain why. A complete-looking plan is not more important than a truthful plan.

## C. Deep Investigation

Deep investigation routes the user to the page that owns the unresolved question. Trade must not absorb those workflows.

### Replay Handoff

Use Replay when:

- validation is absent, incomplete, or degraded;
- a failure mode needs historical inspection;
- the replay outcome no longer supports the proposed setup.

Preserve symbol, thesis, selected case or window, and current execution blocker. Replay owns validation.

### Research Handoff

Use Research when:

- supporting or conflicting evidence needs interpretation;
- the thesis needs review;
- source attribution, narrative, confidence context, or freshness is unclear.

Preserve the candidate and execution blocker. Research owns evidence and thesis context.

### Markets Handoff

Use Markets when:

- live structure, exchange conditions, funding, OI, liquidity, or current market context needs inspection;
- inherited structure context is stale or unavailable.

Preserve symbol, exchange, timeframe, and setup context. Markets owns live exploration.

### Scanner Handoff

Use Scanner when:

- the current candidate is discarded;
- the user needs a different opportunity;
- no stable candidate was inherited.

Scanner owns discovery, ranking, prioritization, and filtering.

### Dashboard Handoff

Use Dashboard after execution planning or completion when the user needs market monitoring and a current market conclusion. Dashboard does not own trade execution state.

## Entry Paths

Trade may be entered from:

- Replay, after validation;
- Research, with evidence and thesis context;
- Markets, with selected-symbol structure context;
- Scanner, with a selected candidate;
- direct navigation, which must show not-ready states for missing inherited context.

Replay is the canonical entry for a validated opportunity. Other entry paths must not imply validation when none was supplied.

## Exit Paths

Trade should exit to:

- Replay for validation;
- Research for evidence;
- Markets for live market context;
- Scanner for new opportunities;
- Dashboard for post-planning or post-execution monitoring.

## Success Criteria

Trade succeeds when the user can answer within approximately 60 seconds:

- what validated opportunity is being planned;
- whether the plan is ready;
- what the setup, entry, exit, stop, targets, size, and risk are;
- which checklist items or blockers remain;
- which owning page should receive any unresolved question.

Trade fails when it creates opportunity discovery, evidence, narratives, historical validation, synthetic execution values, or hidden readiness assumptions.

## Validation

- `docs/project/trade-user-journey.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research, or Replay changes: none.
- Package changes: none.

