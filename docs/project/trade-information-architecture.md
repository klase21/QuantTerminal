# Trade Information Architecture

Project Zeta - Trade V2 Sprint T2  
Status: Information architecture definition  
Runtime behavior: none

## Approved Hierarchy

```text
Trade Summary
  -> Execution Readiness
  -> Execution Setup
  -> Entry Plan
  -> Exit Plan
  -> Risk Management
  -> Execution Checklist
  -> Trade Metadata
  -> Navigation Actions
```

Trade plans execution from inherited, validated context. It must not recreate opportunity discovery, evidence generation, market exploration, or Replay validation.

## 1. Trade Summary

Purpose:

- Orient the user to the selected candidate and inherited execution context.

Enabled decision:

- Confirm that Trade is planning the intended opportunity.

Expected inputs:

- symbol;
- exchange;
- timeframe;
- thesis;
- opportunity context;
- validation and replay result;
- freshness / health.

Expected outputs:

- candidate identity;
- symbol / exchange / timeframe;
- compact thesis context;
- inherited validation state;
- overall planning context.

Next navigation:

- Execution Readiness when context is correct.
- Scanner when no candidate is selected.
- Research or Replay when inherited context is wrong or incomplete.

## 2. Execution Readiness

Purpose:

- State whether the candidate has sufficient real context for execution planning.

Enabled decision:

- Continue planning, resolve a blocker, or abandon the candidate.

Expected inputs:

- selected candidate;
- Replay validation result;
- evidence summary;
- structure context;
- freshness / health;
- required execution-input availability.

Expected outputs:

- ready, not ready, partial, degraded, stale, missing, or unavailable state;
- explicit readiness reasons;
- blocking and non-blocking conditions;
- owning destination for each unresolved blocker.

Next navigation:

- Execution Setup when planning can continue.
- Replay for missing validation.
- Research for evidence gaps.
- Markets for stale or missing live structure.

Execution Readiness must not calculate or imply Replay validation.

## 3. Execution Setup

Purpose:

- Define how the validated opportunity will be expressed as a trade setup.

Enabled decision:

- Accept, revise, or reject the proposed setup conditions.

Expected inputs:

- validated opportunity context;
- symbol / exchange / timeframe;
- inherited thesis;
- structure context;
- current real market inputs;
- user execution constraints.

Expected outputs:

- setup direction and conditions;
- trigger requirements;
- invalidation context;
- setup blockers;
- setup readiness.

Next navigation:

- Entry Plan when setup conditions are defined.
- Markets when live structure needs review.
- Replay when validation assumptions need review.

## 4. Entry Plan

Purpose:

- Define the conditions and levels required to open the position.

Enabled decision:

- Determine whether, where, and under what conditions entry is permitted.

Expected inputs:

- accepted setup;
- current real market data;
- exchange and timeframe;
- user order constraints;
- liquidity / structure context when available.

Expected outputs:

- entry conditions;
- entry level or range when supported by real inputs;
- order approach;
- confirmation requirements;
- unavailable reason when inputs are insufficient.

Next navigation:

- Exit Plan when entry conditions are complete.
- Markets for current structure or liquidity review.
- Execution Setup when entry conditions invalidate the setup.

## 5. Exit Plan

Purpose:

- Define how the position is protected, reduced, invalidated, and closed.

Enabled decision:

- Accept the stop, invalidation, targets, and exit conditions.

Expected inputs:

- accepted setup and entry plan;
- real market inputs;
- user risk constraints;
- inherited failure-mode context from Replay when available.

Expected outputs:

- stop-loss and invalidation conditions;
- target conditions;
- partial or full exit conditions;
- unavailable reason when values cannot be derived truthfully.

Next navigation:

- Risk Management when exits are defined.
- Replay when failure modes need validation.
- Research when the thesis no longer supports the plan.

## 6. Risk Management

Purpose:

- Bound execution risk and determine position size from valid inputs.

Enabled decision:

- Decide whether the plan fits explicit user risk limits.

Expected inputs:

- entry and stop / invalidation plan;
- user-defined risk limit;
- account or allocation input when explicitly provided;
- fees, slippage, and venue constraints when real data exists.

Expected outputs:

- risk amount or limit;
- position size when all required inputs exist;
- risk-to-reward context only when supported by real plan values;
- constraint warnings;
- unavailable or not-ready reason.

Next navigation:

- Execution Checklist when risk is acceptable.
- Entry Plan or Exit Plan when risk requires revision.

Trade must not fabricate account size, risk tolerance, position size, fees, slippage, or risk-to-reward values.

## 7. Execution Checklist

Purpose:

- Confirm that every required planning and readiness condition has been addressed.

Enabled decision:

- Mark the plan ready, not ready, or blocked.

Expected inputs:

- execution-readiness state;
- setup, entry, exit, and risk states;
- validation, freshness, and health context;
- explicit user confirmations where required.

Expected outputs:

- checklist item states;
- unresolved blockers;
- final trade-readiness state;
- reason when execution is not ready.

Next navigation:

- Trade Metadata for traceability.
- The owning upstream page for unresolved validation, evidence, structure, or candidate blockers.
- Dashboard for monitoring only after planning or execution is complete.

## 8. Trade Metadata

Purpose:

- Preserve traceability for the selected candidate and execution plan.

Enabled decision:

- Verify that the plan uses the intended context, source versions, and observation times.

Expected inputs:

- candidate and investigation identifiers;
- symbol / exchange / timeframe;
- source references;
- observedAt / generatedAt values;
- validation and evidence references;
- plan version or state.

Expected outputs:

- immutable upstream references;
- plan metadata;
- freshness and health metadata;
- explicit source limitations.

Next navigation:

- Navigation Actions.

## 9. Navigation Actions

Purpose:

- Route unresolved questions to their owning page and completed planning toward monitoring.

Enabled decision:

- Choose the correct next workflow without expanding Trade's ownership.

Expected inputs:

- readiness state;
- blocker reasons;
- selected candidate;
- inherited context references.

Expected outputs:

- Research handoff for evidence;
- Replay handoff for validation;
- Markets handoff for live context;
- Scanner handoff for a new opportunity;
- Dashboard handoff for monitoring after execution planning or completion.

Next navigation:

- Need evidence -> Research.
- Need validation -> Replay.
- Need market context -> Markets.
- Need new opportunities -> Scanner.
- Execution complete -> Dashboard for monitoring.

## Boundary Review

Trade owns:

- execution;
- setup;
- entries;
- exits;
- stop loss and invalidation;
- targets;
- position sizing;
- risk management;
- execution checklist.

Trade does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Research evidence or thesis generation;
- Replay validation.

## Design System Alignment

Trade should reuse the shared QuantTerminal design language defined by `docs/project/dashboard-design-system.md` and `docs/project/design-token-registry.md`:

- typography tokens for section identity, compact labels, numeric values, and metadata;
- color tokens for dark terminal surfaces, amber structure, cyan information, and explicit states;
- spacing tokens for dense, readable planning flow;
- surface tokens to distinguish readiness, primary planning, secondary context, and metadata;
- canonical badge/status tokens for current, verified, partial, degraded, stale, missing, loading, and unavailable states.

Trade should not duplicate Dashboard, Markets, Scanner, Research, or Replay layouts. Its layout should reflect sequential execution planning while preserving the shared terminal identity and responsive density.

## Navigation Rules

- Handoffs must preserve symbol, exchange, timeframe, selected candidate, and relevant immutable upstream references.
- Trade must explain why a handoff is needed.
- A direct Trade entry must not imply validation.
- `Prepare Trade` is the canonical inbound intent.
- Evidence questions return to Research.
- Validation questions return to Replay.
- Live-structure questions return to Markets.
- Candidate-discovery questions return to Scanner.
- Dashboard is a monitoring destination, not an execution owner.

## Validation

- `docs/project/trade-information-architecture.md` exists.
- Runtime code changes: none.
- Dashboard, Markets, Scanner, Research, or Replay changes: none.
- Package changes: none.

