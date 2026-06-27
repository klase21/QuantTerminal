# Trade V2 Certification

Project Zeta - Trade V2 Sprint T5  
Status: Certification review  
Implementation under review: `components/trade/TradePage.tsx`  
Decision: CERTIFIED WITH LIMITATIONS

## Certification Summary

Trade V2 satisfies the approved presentation hierarchy and establishes execution planning as the page's primary responsibility.

The T4 implementation:

- places Trade Summary and Execution Readiness before execution detail;
- separates setup, entry, exit, risk, checklist, metadata, and navigation;
- reuses existing Trade data and calculations;
- does not claim Replay validation when none is inherited;
- does not fabricate position sizing when user risk inputs are absent;
- preserves existing APIs, polling, sockets, candidate state, and local setup tracking;
- uses the shared QuantTerminal terminal design language.

Trade V2 is certifiable, but current upstream handoff and data limitations prevent an unqualified certification.

## 1. Hierarchy Certification

Result: **PASS**

The implementation follows the approved order:

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

Implementation references:

| Section | Location |
| --- | --- |
| Trade Summary | `components/trade/TradePage.tsx:572` |
| Execution Readiness | `components/trade/TradePage.tsx:683` |
| Execution Setup | `components/trade/TradePage.tsx:719` |
| Entry Plan | `components/trade/TradePage.tsx:756` |
| Exit Plan | `components/trade/TradePage.tsx:771` |
| Risk Management | `components/trade/TradePage.tsx:787` |
| Execution Checklist | `components/trade/TradePage.tsx:800` |
| Trade Metadata | `components/trade/TradePage.tsx:869` |
| Navigation Actions | `components/trade/TradePage.tsx:903` |

Candidate discovery is no longer the first page section. Existing candidate selection is contained within a collapsed `Available Candidate Context` area under Trade Summary.

Existing tactical context, local setup memory, and local outcomes remain subordinate to the approved Trade sections rather than forming competing top-level workflows.

## 2. Design System Certification

Result: **PASS**

### Typography

- Section titles use compact uppercase terminal typography.
- Candidate identity and execution values receive stronger emphasis than metadata.
- Metadata and source explanations use smaller, muted text.
- No marketing-style or oversized analytics typography was introduced.

### Spacing

- Major sections use consistent dense spacing.
- Cards and rows use compact panel padding.
- Responsive grids preserve the approved vertical order.
- Candidate and tactical context use progressive disclosure to protect the first-read layer.

### Colors

- The page canvas uses `color.background.base` (`#070d07`).
- Primary and secondary panels reuse approved dark green surface values.
- Amber is used for execution structure and caution.
- Cyan is used for metadata and informational context.
- Emerald, rose, amber, and muted gray retain state-specific roles.

### Surfaces

- Trade Summary has the strongest surface and border treatment.
- Readiness, setup, entry, and exit use primary planning surfaces.
- Risk and checklist use secondary surfaces.
- Metadata uses the lowest-priority analytics surface.
- Navigation Actions remain visually subordinate to the execution workflow.

### Badges and Status

- Canonical `CURRENT`, `PARTIAL`, `MISSING`, and `UNAVAILABLE` states are visible.
- Status uses text and color rather than color alone.
- Replay validation and position sizing explicitly use `UNAVAILABLE` where inputs do not exist.
- Legacy lifecycle labels remain source vocabulary and were not redefined during T4.

### Cross-Page Consistency

Trade reuses the frozen product's:

- dark terminal identity;
- amber/cyan accent system;
- compact surface hierarchy;
- small-radius panel language;
- uppercase section labels;
- canonical availability states.

It does not duplicate the Dashboard, Markets, Scanner, Research, or Replay layout.

## 3. Product Language Certification

Result: **PASS**

Trade correctly uses execution-owned language:

- execution;
- setup;
- entry;
- exit;
- stop / invalidation;
- targets;
- risk;
- position sizing;
- readiness;
- checklist.

Language safeguards:

- candidate context is presented as inherited or available context, not as Trade-owned opportunity ranking;
- tactical context is not labeled as Research evidence;
- Replay validation is explicitly `UNAVAILABLE` rather than inferred;
- local outcome memory is explicitly labeled `Not Replay validation`;
- position sizing is `UNAVAILABLE` because user account and risk inputs are not supplied;
- navigation language routes evidence, validation, market context, discovery, and monitoring to their owning pages.

No thesis, narrative, evidence, signal, or validation generation claim was added.

## 4. Boundary Certification

Result: **PASS**

Trade's primary hierarchy now owns only:

- execution planning;
- setup context;
- entry planning;
- exit, stop, invalidation, and target planning;
- risk context;
- sizing availability;
- execution checklist state;
- execution metadata.

Boundary findings:

- **Dashboard:** Trade does not generate a market conclusion. Dashboard is a monitoring handoff only.
- **Markets:** live market fields remain compact execution context. Broader structure inspection routes to Markets.
- **Scanner:** the legacy candidate feed remains available only as subordinate candidate context. Scanner remains the destination for new opportunities.
- **Research:** tactical source context is not represented as a Research evidence conclusion. Evidence questions route to Research.
- **Replay:** Trade does not calculate or imply validation. Validation questions route to Replay.

Accepted boundary limitation:

- Trade still loads the existing market-mover candidate feed directly as a fallback candidate source. T4 preserved this existing behavior as required. Its visual role is subordinate, but a future context-handoff sprint should replace fallback discovery with a richer inherited candidate contract.

## 5. Implementation Certification

Result: **PASS**

Verified:

- existing APIs are reused;
- no new fetch path was added;
- no duplicate polling was introduced by T4;
- no router or search-parameter logic changed;
- no API contract changed;
- no execution engine was added;
- no synthetic readiness score was added;
- no sizing algorithm was added;
- no risk model was added;
- no existing execution calculation changed;
- no Dashboard, Markets, Scanner, Research, or Replay implementation was modified by T4.

Preserved runtime dependencies:

- `useMarketMovers`;
- `useMarketSocket`;
- `useTradeSocket`;
- `useLiquidationSocket`;
- `useOrderbookSocket`;
- `/api/market/futures-intelligence`;
- retained candidate state;
- active setup memory;
- local setup tracking and outcomes.

The T4 diff changes presentation helpers and JSX only. Existing effects, fetch paths, timers, socket subscriptions, candidate selection, and execution calculations remain unchanged.

## 6. Known Limitations

These limitations are accepted for Trade V2 certification. They are documented, not fixed in T5.

1. **Replay validation may be unavailable.**
   - Trade does not currently consume a Replay result or validation payload.
   - The UI correctly displays `UNAVAILABLE` and does not claim validation.

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
   - The current Trade state consumes the inbound symbol but not the full exchange, timeframe, thesis, evidence, Replay result, or source-reference contract.
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

## 7. Certification Decision

Decision: **CERTIFIED WITH LIMITATIONS**

Justification:

- the approved Trade hierarchy is implemented exactly;
- execution planning is now the primary first-read workflow;
- existing execution functionality is preserved;
- missing validation and sizing inputs are represented truthfully;
- product language and ownership boundaries are explicit;
- shared Design System roles are reused;
- required runtime validation passes;
- remaining gaps are upstream context and existing data limitations, not T4 hierarchy defects.

Trade V2 is suitable to proceed to acceptance review with the limitations in this document carried forward unchanged.

## 8. Validation

Required validation:

- TypeScript: PASS.
- Dashboard Integration Audit: PASS.
- Intelligence Smoke Test: PASS.

Scope validation:

- `docs/project/trade-certification.md` exists.
- Runtime code changes in T5: none.
- API changes in T5: none.
- Package changes in T5: none.
- Dashboard, Markets, Scanner, Research, and Replay changes in T5: none.
- Build required: no.

