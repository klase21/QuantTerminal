# Trade V2 State

Project Zeta - Trade V2 Sprint T7  
Status: Frozen reference record  
Runtime scope: no runtime changes in this sprint

## 1. Freeze Summary

Trade Status: Reference Implementation

Freeze Status: FROZEN

Certification: PASS

Acceptance: PASS

Trade V2 is the official QuantTerminal reference implementation for execution planning. It is the canonical page for answering:

```text
How should this validated opportunity be executed?
```

Approved hierarchy:

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

Trade V2 consumes existing candidate and execution context. When validation, risk, sizing, or source context is unavailable, it must preserve explicit `PARTIAL`, `MISSING`, or `UNAVAILABLE` states rather than fabricate completeness.

## 2. Trade Ownership

Trade owns:

- execution planning;
- execution readiness;
- execution setup;
- entries;
- exits;
- stop loss and invalidation;
- targets;
- position sizing context;
- risk management;
- execution checklist;
- execution metadata.

Trade does not own:

- Dashboard conclusions;
- Markets exploration;
- Scanner prioritization;
- Research evidence generation;
- Replay validation.

Canonical ownership rule:

```text
Trade plans execution from inherited context.
Trade does not recreate upstream ownership.
```

Dashboard remains the monitoring and market-conclusion surface. Markets owns live exploration and structure. Scanner owns opportunity discovery and prioritization. Research owns thesis and evidence. Replay owns historical validation. Trade owns the final execution-planning decision layer.

## 3. Accepted Limitations

The following objective limitations are carried forward from Trade Certification and Trade Acceptance. They are accepted characteristics of the frozen Trade V2 baseline and are not resolved in T7.

1. **Replay validation may be unavailable.**
   - Trade does not currently consume a Replay result or validation payload.
   - The UI displays `UNAVAILABLE` and does not claim validation.

2. **User sizing inputs may be unavailable.**
   - No account value, allocation, risk tolerance, leverage, fee, or slippage input is supplied.
   - Position sizing remains `UNAVAILABLE`; no user-approved size is fabricated.

3. **Existing execution logic only.**
   - Entry, stop, targets, plan quality, and risk context come from the existing market-mover candidate payload.
   - Trade V2 adds no execution intelligence or calculation.

4. **No automatic execution.**
   - Trade is an execution-planning surface.
   - It does not place, modify, or cancel exchange orders.

5. **Checklist depends on inherited context.**
   - Candidate and execution-level availability can be displayed.
   - Replay validation and user risk-input checks remain unavailable until those contexts are supplied.

6. **Upstream handoff context is incomplete.**
   - Trade consumes the inbound symbol but not the full exchange, timeframe, thesis, evidence, Replay result, or source-reference contract.
   - Most Navigation Actions are route-level links rather than rich immutable handoffs.

7. **Legacy candidate fallback remains.**
   - Trade still obtains candidates from the existing market-mover source and may auto-select an available candidate.
   - The selector is visually subordinate but remains a direct dependency.

8. **Existing data-quality limitations remain.**
   - Live Trade data depends on current Binance and internal API availability.
   - Candidate and setup memory use browser local storage.
   - Local outcomes are not durable Replay validation.
   - The existing liquidation feed is market-wide rather than selected-symbol scoped.
   - The existing orderbook store is shared rather than symbol-keyed.

9. **Pre-existing stream duplication remains.**
   - Candidate fallback and market context can maintain separate broad ticker subscriptions.
   - T4 introduced no additional stream or polling path.

## 4. Future Roadmap

Backlog only. This roadmap records possible future ownership areas and does not define implementation.

### Post-Freeze Improvements

- Richer immutable Replay-to-Trade handoff payloads.
- Broader upstream context preservation for exchange, timeframe, thesis, evidence, source health, and Replay result.
- Dedicated improvements to legacy candidate fallback and context continuity.

### Future Execution Workflow

- Execution journaling.
- Durable execution-plan state.
- Future execution checklist continuity.

### Future Sizing and Risk

- A future sizing engine based on explicit user inputs and approved product requirements.
- Future fee, slippage, leverage, and allocation context where real inputs exist.
- Future risk workflow enhancements under a dedicated sprint.

### Future Integrations

- Future broker or exchange integration.
- Future order-state integration.
- Future execution auditability and operational safeguards.

### Future Analytics

- Future execution analytics.
- Future source-backed plan and outcome reporting.
- Future durable execution history.

All roadmap items require a documented Trade V3 or dedicated post-freeze sprint. None are authorized by this state document.

## 5. Freeze Policy

Trade V2 is frozen.

Trade V2 remains the canonical execution-planning reference until superseded by a documented future version.

Future runtime changes are permitted only through Trade V3 or a dedicated Trade improvement sprint addressing:

- an objective implementation defect;
- an objective bug;
- a Design System violation;
- a documented product requirement;
- an approved post-freeze roadmap item.

Explicitly prohibited without a documented future sprint:

- subjective redesigns;
- aesthetic-only changes;
- undocumented feature additions;
- hierarchy drift;
- new APIs or API contract changes;
- new execution engines;
- new sizing or risk logic;
- synthetic readiness, confidence, or execution values;
- automatic order execution;
- Dashboard, Markets, Scanner, Research, or Replay ownership leakage.

The frozen hierarchy, no-fabrication rule, explicit unavailable states, stable selected-candidate behavior, and upstream ownership boundaries must remain intact.

## 6. Validation

Freeze validation:

- `docs/project/trade-v2-state.md` exists.
- Runtime code changes in T7: none.
- Dashboard, Markets, Scanner, Research, and Replay changes in T7: none.
- API changes in T7: none.
- Package changes in T7: none.
- Build required: no.

Trade V2 is now the official QuantTerminal execution-planning reference implementation.

