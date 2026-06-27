# Replay Acceptance

Project Epsilon - Replay V2 Sprint P6  
Status: Acceptance  
Scope: Replay V2 final review before Freeze  
Implementation inspected: `components/replay/ReplayV1Page.tsx`  
Decision: READY FOR FREEZE WITH KNOWN LIMITATIONS

## 1. Constitution Review

Result: PASS

Replay V2 satisfies the approved Replay Constitution.

- Replay answers: "Did this thesis work in comparable historical conditions?"
- Replay presents validation context before dense replay analytics.
- Replay displays inherited thesis, selected case, symbol, exchange, timeframe, and replay window when available.
- Replay preserves explicit missing, unavailable, partial, and degraded states instead of fabricating validation.
- Replay does not create Dashboard conclusions, Markets exploration, Scanner prioritization, Research evidence, or Trade execution.
- Orderbook remains manual/cache-based and does not block the page.

Constitution decision: PASS.

## 2. Information Architecture Review

Result: PASS

Approved hierarchy:

```text
Replay Summary
  -> Validation Status
  -> Comparable Historical Cases
  -> Outcome Analysis
  -> Failure Patterns
  -> Evidence Quality
  -> Replay Metadata
  -> Navigation Actions
```

Implementation review:

| Section | Result | Acceptance finding |
| --- | --- | --- |
| Replay Summary | PASS | First section orients the user around the thesis/window being replayed and keeps replay loading manual. |
| Validation Status | PASS | Validation readiness appears before analytics and is derived from existing source availability only. |
| Comparable Historical Cases | PASS WITH LIMITATIONS | Selected inherited case context is shown when available; otherwise the section reports unavailable state. |
| Outcome Analysis | PASS | Existing replay chart, market snapshot, orderbook snapshot, timeline, positioning, liquidations, and observed outcome content are grouped under outcome review. |
| Failure Patterns | PASS WITH LIMITATIONS | Section exists and reports unavailable state when no failure-pattern dataset is loaded. |
| Evidence Quality | PASS | Source availability is consolidated for chart/price, OI, funding, liquidations, trades, and orderbook. |
| Replay Metadata | PASS | Replay scope, investigation metadata, event context, cache status, downloaded sets, and unavailable sets are visible. |
| Navigation Actions | PASS WITH LIMITATIONS | Compact links exist for Research, Trade, Markets, and Scanner; rich immutable handoff payloads remain future work. |

Information architecture decision: PASS.

## 3. Design System Review

Result: PASS

Replay V2 is consistent with the frozen Dashboard, Markets, Scanner, and Research design language, accepting the limitations certified in P5.

- Terminal-dark surfaces, dense monospace typography, amber hierarchy accents, and cyan metadata treatment are preserved.
- Status rows use canonical badge language including `CURRENT`, `PARTIAL`, `DEGRADED`, `MISSING`, `LOADING`, and `UNAVAILABLE`.
- Validation and evidence-quality sections now carry higher priority than replay metadata and supporting details.
- Outcome Analysis remains dense because Replay owns event reconstruction and historical validation.
- Documented limitations around local Tailwind token usage, legacy nested panels, and the allowed `NO DATA` label are accepted for Freeze readiness.

Design system decision: PASS.

## 4. Implementation Review

Result: PASS

| Requirement | Result | Acceptance finding |
| --- | --- | --- |
| Existing APIs reused | PASS | Replay continues to use existing replay endpoints, Binance klines, positioning fallback, current futures fallback, and orderbook cache paths. |
| No new fetch paths | PASS | Acceptance review found no added request paths beyond the existing Replay implementation. |
| No router/search-param changes | PASS | Existing `useSearchParams` and investigation-context handling remain unchanged. |
| No polling changes | PASS | Replay remains action-driven; no polling or automatic replay loading was introduced. |
| No synthetic validation engine | PASS | Validation status is an availability/readiness presentation, not a new scoring or validation engine. |
| No generated narratives | PASS | Replay displays inherited context or explicit unavailable text only. |
| No historical matching engine | PASS | Comparable cases are displayed only when inherited; no matching logic was added. |
| No upstream page modifications | PASS | Dashboard, Markets, Scanner, and Research are not modified by this acceptance sprint. |

Implementation decision: PASS.

## 5. UX Review

Result: PASS

Replay V2 satisfies the approved user goals with accepted limitations.

- The user can understand what is being validated from Replay Summary.
- The user can inspect comparable historical context when a selected historical case is inherited.
- The user can inspect outcome paths through the grouped Outcome Analysis section.
- The user can inspect evidence quality before trusting replay details.
- The user can navigate toward Research, Markets, Scanner, or Trade through compact Navigation Actions.
- When data is unavailable, the page shows explicit unavailable or missing states rather than blocking indefinitely or fabricating evidence.

UX decision: PASS.

## 6. Known Accepted Limitations

Carried forward from Replay Certification without resolution in this sprint:

- Comparable cases are display-only and unavailable when no selected historical case is inherited.
- Validation Status depends on existing replay data availability; there is no new validation engine.
- Failure Patterns remains unavailable when no comparable failure-pattern dataset is loaded.
- Orderbook remains manual/cache-based and must not block Replay.
- Orderbook status may be partial or degraded; Replay does not claim complete deterministic orderbook replay.
- Navigation handoffs are compact links, not rich immutable handoff payloads.
- The `If You Traded It` section is preserved from existing Replay functionality and should be revisited in future language normalization.
- Existing replay data availability depends on CryptoHFTData coverage, Binance fallback availability, cache state, and selected window support.
- Flow Replay artifacts exist elsewhere in the architecture but are not consumed by this page in P6.
- `NO DATA` remains an allowed legacy unavailable metric label pending future badge/language normalization.

## 7. Final Recommendation

Recommendation: READY FOR FREEZE WITH KNOWN LIMITATIONS

Justification:

- Replay V2 satisfies the approved Constitution and Information Architecture.
- Certification limitations are objective, documented, and non-blocking.
- Implementation preserves existing Replay behavior and does not introduce new intelligence, scoring, generated narratives, historical matching, API contracts, polling, or routing behavior.
- The page is ready to become the Replay frozen reference once Freeze records these accepted limitations.

## 8. Validation

Required validation for P6:

- `npx.cmd tsc --noEmit --pretty false --incremental false`
- `npm run audit:dashboard-integration`
- `npm run test:intelligence`

Validation results are recorded in the sprint output.
