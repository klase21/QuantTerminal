# Trade V2 Acceptance

Project Zeta - Trade V2 Sprint T6  
Status: Final acceptance review before Freeze  
Implementation reviewed: `components/trade/TradePage.tsx`  
Final recommendation: READY FOR FREEZE WITH KNOWN LIMITATIONS

## Acceptance Summary

Trade V2 is ready to proceed to Freeze with the objective limitations certified in Sprint T5.

The implementation establishes Trade as QuantTerminal's execution-planning layer. It presents candidate context and readiness first, then separates setup, entry, exit, risk, checklist, metadata, and navigation. Existing data and calculations are preserved, while unavailable Replay validation and user sizing inputs remain explicit.

No objective certification failure was found. T6 makes no runtime changes.

## 1. Constitution Review

Result: **PASS**

Trade V2 satisfies the approved Trade Constitution:

- execution planning is the page's primary purpose;
- the selected candidate remains the basis of the execution plan;
- setup, entries, exits, stop / invalidation, targets, risk, sizing availability, and checklist state are visible;
- missing validation and risk inputs produce explicit `UNAVAILABLE`, `MISSING`, or `PARTIAL` states;
- no automatic order execution is claimed;
- no thesis, evidence, opportunity, or historical validation system was added;
- existing numeric execution values remain source-backed by the existing candidate payload;
- position sizing is not fabricated when explicit user inputs are absent.

The page answers:

```text
How should this validated opportunity be executed?
```

When validation is not inherited, it truthfully answers that planning is partial rather than claiming the opportunity is validated.

## 2. Information Architecture Review

Result: **PASS**

The implemented hierarchy matches the approved Trade IA exactly:

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

Review findings:

- Trade Summary identifies the selected candidate and current context.
- Execution Readiness exposes plan availability and missing inherited inputs.
- Execution Setup presents setup, direction, trigger, action, and invalidation context.
- Entry and Exit Plans are distinct decision layers.
- Risk Management separates existing risk context from unavailable user sizing.
- Execution Checklist exposes supported and unsupported prerequisites.
- Trade Metadata identifies source, local persistence, live context, and local outcome limitations.
- Navigation Actions route unresolved questions to their owning pages.

Legacy candidate selection, tactical context, setup memory, and local outcomes are subordinate within the approved sections rather than competing top-level workflows.

## 3. Design System Review

Result: **PASS**

Trade V2 is consistent with the frozen QuantTerminal design language:

- compact terminal typography;
- dark green-black canvas and layered surfaces;
- amber structural accents;
- cyan informational metadata;
- restrained positive, negative, and neutral state colors;
- small-radius bordered panels;
- dense but ordered spacing;
- canonical `CURRENT`, `PARTIAL`, `MISSING`, and `UNAVAILABLE` states;
- responsive grids that preserve the approved reading order.

Trade reuses the shared language without copying the Dashboard, Markets, Scanner, Research, or Replay layout. The accepted legacy lifecycle vocabulary remains visibly separate from data-availability badges.

## 4. Implementation Review

Result: **PASS**

Verified:

- existing APIs are reused;
- no new fetch path was added;
- no duplicate polling was introduced by T4;
- no router or search-parameter behavior changed;
- no new execution engine was introduced;
- no synthetic readiness score was introduced;
- no sizing algorithm was introduced;
- no risk model was introduced;
- no API contract changed;
- no existing execution calculation changed;
- Dashboard, Markets, Scanner, Research, and Replay were not modified by the Trade implementation sprint.

Preserved functionality includes:

- candidate selection;
- market-mover data;
- selected-symbol ticker, trade, orderbook, funding, and OI context;
- existing entry, stop, target, risk, and plan-quality calculations;
- local setup tracking;
- local setup status updates and deletion;
- local outcome memory;
- Markets handoff.

Pre-existing request, stream, persistence, and data-quality limitations are documented in Certification and carried forward below.

## 5. UX Review

Result: **PASS**

The user can:

- understand execution readiness from the first two sections;
- identify the selected candidate and available execution context;
- review setup direction, trigger, action, and invalidation;
- inspect entry levels and entry context;
- inspect stop, targets, and exit conditions;
- review existing risk and risk/reward context;
- see that position sizing is unavailable without user inputs;
- review checklist availability and local setup tracking;
- navigate to Replay, Research, Markets, or Scanner when the unresolved question belongs upstream;
- return to Dashboard for monitoring.

The checklist is an availability and blocker review, not a fabricated readiness decision. Candidate and execution-level checks resolve from existing data; Replay validation and user risk-input checks remain visibly unavailable.

## 6. Known Accepted Limitations

The following objective limitations are carried forward from Trade Certification without resolution or expansion.

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

## 7. Final Recommendation

Recommendation: **READY FOR FREEZE WITH KNOWN LIMITATIONS**

Justification:

- Constitution review passes.
- Information Architecture review passes.
- Design System review passes.
- Implementation review passes.
- UX review passes with certified limitations accepted.
- Missing validation and sizing inputs are represented honestly.
- Trade does not recreate discovery, evidence generation, market exploration, or Replay validation.
- Required runtime validation passes.
- No objective defect requires implementation changes before Freeze.

Trade V2 may become the accepted reference implementation, provided the limitations in this document are preserved unchanged in the Freeze record.

## 8. Validation

Required validation:

- TypeScript: PASS.
- Dashboard Integration Audit: PASS.
- Intelligence Smoke Test: PASS.

Scope validation:

- `docs/project/trade-acceptance.md` exists.
- Runtime code changes in T6: none.
- API changes in T6: none.
- Package changes in T6: none.
- Dashboard, Markets, Scanner, Research, and Replay changes in T6: none.
- Build required: no.

